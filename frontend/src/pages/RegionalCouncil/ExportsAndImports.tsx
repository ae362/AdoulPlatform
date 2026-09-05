import React, { useState, useMemo } from 'react';

interface Correspondence {
    id: string;
    reference: string;
    type: string;
    sender: string;
    recipient: string;
    date: string;
    status: 'pending' | 'signed' | 'archived';
    legalBasis: string;
    subject: string;
}

const ExportsAndImports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'incoming' | 'outgoing' | 'archive' | 'reports'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLetter, setSelectedLetter] = useState<Correspondence | null>(null);
    const [showNewDraftModal, setShowNewDraftModal] = useState(false);

    // Initial Mock Data to make features "work"
    const [data, setData] = useState<Correspondence[]>([
        { id: '1', reference: 'RJ-CT-2026-00045', type: 'إشعار بإخلال مهني', sender: 'قاضي التوثيق - المحكمة الابتدائية', recipient: 'المجلس الجهوي للعدول', date: '2026-01-28', status: 'pending', legalBasis: 'م 174', subject: 'ملاحظات حول سلوك مهني لعدل' },
        { id: '2', reference: 'RJ-CT-2026-00046', type: 'رأي المجلس الجهوي', sender: 'المجلس الجهوي للعدول', recipient: 'قاضي التوثيق', date: '2026-02-01', status: 'signed', legalBasis: 'م 174', subject: 'تقرير الرأي المعلل رقم 12/2026' },
        { id: '3', reference: 'RJ-CT-2026-00047', type: 'مراسلات التدريب', sender: 'قاضي التوثيق', recipient: 'المجلس الجهوي للعدول', date: '2026-01-15', status: 'archived', legalBasis: 'م 200', subject: 'استشارة حول مكتب تدريب لمتمرن' },
    ]);

    const filteredData = useMemo(() => {
        return data.filter(item => 
            (item.reference.includes(searchTerm) || item.subject.includes(searchTerm) || item.sender.includes(searchTerm)) &&
            (activeTab === 'overview' ? true : 
             activeTab === 'incoming' ? item.recipient.includes('المجلس الجهوي') : 
             activeTab === 'outgoing' ? item.sender.includes('المجلس الجهوي') :
             activeTab === 'archive' ? item.status === 'archived' : true)
        );
    }, [data, searchTerm, activeTab]);

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden" dir="rtl">
            {/* 🧭 Sovereign Vertical Navigation Rail */}
            <div className="w-24 bg-white border-l border-slate-200 flex flex-col items-center py-8 gap-6 shrink-0 shadow-2xl z-50">
                <div className="w-16 h-16 bg-red-950 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-2xl shadow-red-950/30 text-white mb-6 transform hover:rotate-12 transition-transform cursor-pointer">⚖️</div>
                
                <div className="flex flex-col gap-6 flex-1">
                    {[
                        { id: 'overview', icon: '📊', label: 'الرئيسية' },
                        { id: 'incoming', icon: '📥', label: 'الواردات' },
                        { id: 'outgoing', icon: '📤', label: 'الصادرات' },
                        { id: 'archive', icon: '🗄️', label: 'الأرشيف' },
                        { id: 'reports', icon: '📈', label: 'التقارير' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-16 h-16 rounded-[1.25rem] flex flex-col items-center justify-center gap-1 transition-all duration-300 group relative ${
                                activeTab === tab.id 
                                ? 'bg-red-950 text-white shadow-2xl scale-110' 
                                : 'text-slate-400 hover:bg-slate-50 hover:text-red-950'
                            }`}
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">{tab.icon}</span>
                            <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute -left-1 w-1 h-8 bg-[#E6BE8A] rounded-full scale-in-center"></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-auto flex flex-col gap-4">
                    <button className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-lg text-slate-400 hover:bg-red-50 hover:text-red-950 transition-all">⚙️</button>
                    <button className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-lg text-red-900 border border-red-100 hover:bg-red-100 transition-all">🔔</button>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header Decoration */}
                <div className="absolute top-0 right-0 left-0 h-48 bg-gradient-to-b from-slate-100/50 to-transparent pointer-events-none"></div>

                {/* Main Header */}
                <header className="h-28 bg-white/80 backdrop-blur-md border-b border-slate-200 px-12 flex items-center justify-between shrink-0 z-40 sticky top-0">
                    <div className="flex items-center gap-8">
                        <div className="p-4 bg-red-950/5 rounded-3xl border border-red-950/10 hidden md:block">
                            <span className="text-4xl">📬</span>
                        </div>
                        <div className="text-right">
                            <h1 className="text-3xl font-black text-slate-900 font-amiri tracking-tight">بوابة الصادرات والواردات السيادية</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="px-3 py-1 bg-red-950 text-[#E6BE8A] text-[9px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-red-950/10">Official Communications Cabinet</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">العلاقة مع قضاة التوثيق (المواد 174-103-200)</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <input 
                                type="text"
                                placeholder="ابحث في الأرشيف المرجعي..."
                                className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-14 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-red-950/20 outline-none transition-all w-96 placeholder:text-slate-400 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl grayscale opacity-30 group-focus-within:grayscale-0 group-focus-within:opacity-100 transition-all">🔎</span>
                        </div>
                        
                        <button 
                            onClick={() => setShowNewDraftModal(true)}
                            className="px-10 py-4.5 bg-red-950 text-[#E6BE8A] rounded-2xl font-black text-xs shadow-2xl shadow-red-950/20 hover:bg-black hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-4 group"
                        >
                            <span className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">➕</span>
                            <span>تحرير مراسلة جديدة</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-16 relative z-10">
                    {/* Background Pattern */}
                    <div className="fixed inset-0 pointer-events-none opacity-[0.03] grayscale -z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                     {activeTab === 'overview' && (
                         <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                             {/* Stats Grid - Premium Cards */}
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                {[
                                    { label: 'إجمالي المراسلات', value: data.length, icon: '🏛️', color: 'bg-slate-900', trend: '+12% هدا الشهر' },
                                    { label: 'واردات القاضي', value: data.filter(d => d.recipient.includes('المجلس الجهوي')).length, icon: '📥', color: 'bg-indigo-600', trend: 'نشط' },
                                    { label: 'صادرات المجلس', value: data.filter(d => d.sender.includes('المجلس الجهوي')).length, icon: '📤', color: 'bg-emerald-600', trend: 'نشط' },
                                    { label: 'قيد التوقيع', value: data.filter(d => d.status === 'pending').length, icon: '✒️', color: 'bg-amber-500', trend: 'تتطلب انتباه' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between group hover:translate-y-[-8px] transition-all duration-500 relative overflow-hidden">
                                        <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color} opacity-[0.03] rounded-bl-full transform translate-x-8 -translate-y-8`}></div>
                                        <div className="flex items-start justify-between mb-8">
                                            <div className={`w-16 h-16 ${stat.color} rounded-2xl flex items-center justify-center text-3xl shadow-2xl shadow-current/30 text-white transform group-hover:rotate-6 transition-transform`}>
                                                {stat.icon}
                                            </div>
                                            <div className="text-[9px] font-black text-slate-300 border border-slate-100 px-3 py-1 rounded-full">{stat.trend}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                                            <p className="text-5xl font-black text-slate-900 font-amiri tracking-tighter">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                             </div>

                             {/* Recent Activity Section - Card-Row Design */}
                             <section className="space-y-8">
                                <div className="flex items-end justify-between px-4">
                                    <div className="space-y-3">
                                        <h2 className="text-3xl font-black text-slate-900 font-amiri tracking-tight">سجل المعاملات السيادية الأخير</h2>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-950 animate-pulse"></span>
                                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic">Live Synchronized Record Table</p>
                                        </div>
                                    </div>
                                    <button className="px-8 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black hover:bg-slate-50 transition-all flex items-center gap-3">
                                        <span>عرض السجل الكامل</span>
                                        <span>📜</span>
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="overflow-x-auto custom-scrollbar pb-6 px-4">
                                        <table className="w-full text-right border-separate border-spacing-y-4 min-w-[1200px] table-fixed">
                                            <thead>
                                                <tr className="text-slate-400">
                                                    <th className="px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] w-[15%]">المرفق الرقمي</th>
                                                    <th className="px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] w-[25%]">نوع المراسلة والموضوع</th>
                                                    <th className="px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] w-[20%]">الأطراف والمؤسسات</th>
                                                    <th className="px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] w-[10%] text-center">السند المرجعي</th>
                                                    <th className="px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] w-[15%] text-center">الحالة المؤسساتية</th>
                                                    <th className="px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] w-[10%] text-center">التاريخ</th>
                                                    <th className="px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] w-[5%] text-center">إجراء</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredData.map((letter) => (
                                                    <tr key={letter.id} className="group hover:translate-y-[-4px] transition-all duration-300">
                                                        <td className="p-8 first:rounded-r-[2.5rem] border-y border-r border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="bg-slate-900 text-white px-4 py-2 rounded-xl font-sans text-[10px] block text-center truncate border border-slate-800 shadow-inner group-hover:bg-red-950 transition-colors">
                                                                    {letter.reference}
                                                                </span>
                                                                <span className="text-[8px] font-black text-slate-300 text-center uppercase tracking-widest mt-1">Official ID</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-8 border-y border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all">
                                                            <div className="flex flex-col gap-1.5 max-w-full overflow-hidden">
                                                                <span className="text-slate-950 font-black text-base font-amiri truncate">{letter.type}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold truncate flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#E6BE8A] shrink-0"></span>
                                                                    {letter.subject}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-8 border-y border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all">
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center gap-2 text-[11px]">
                                                                    <span className="text-slate-400 font-black">من:</span>
                                                                    <span className="text-slate-600 font-bold truncate">{letter.sender}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[11px]">
                                                                    <span className="text-slate-400 font-black">إلى:</span>
                                                                    <span className="text-slate-600 font-bold truncate">{letter.recipient}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-8 border-y border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all text-center">
                                                            <span className="inline-block px-4 py-1.5 bg-red-50 text-red-950 rounded-xl font-black text-sm border border-red-100 group-hover:bg-red-950 group-hover:text-white transition-all shadow-sm">
                                                                {letter.legalBasis}
                                                            </span>
                                                        </td>
                                                        <td className="p-8 border-y border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all text-center">
                                                            <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black border flex items-center justify-center gap-2 mx-auto w-fit shadow-sm ${
                                                                letter.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                letter.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                'bg-slate-50 text-slate-500 border-slate-200'
                                                            }`}>
                                                                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                                                                {letter.status === 'signed' ? 'تم التوقيع بنجاح' : letter.status === 'pending' ? 'تنتظر المصادقة' : 'محفوظة بالأرشيف'}
                                                            </div>
                                                        </td>
                                                        <td className="p-8 border-y border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all text-center font-sans font-black text-slate-400 text-[10px]">
                                                            {letter.date}
                                                        </td>
                                                        <td className="p-8 last:rounded-l-[2.5rem] border-y border-l border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all text-center">
                                                            <button 
                                                                onClick={() => setSelectedLetter(letter)}
                                                                className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl hover:bg-slate-900 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-inner group/btn"
                                                            >
                                                                <span className="group-hover/btn:rotate-12 transition-transform">📂</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                             </section>


                             {/* Section 1: Legal Basis - Institutional Design */}
                             <section className="bg-white rounded-[4rem] p-16 shadow-2xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-4 h-full bg-red-950 opacity-10 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-16">
                                    <div className="space-y-4">
                                        <h2 className="text-4xl font-black text-slate-900 font-amiri flex items-center gap-6">
                                            <span className="p-5 bg-red-950/5 text-red-950 rounded-[2rem] border border-red-950/10 text-4xl shadow-inner">📜</span>
                                            1️⃣ المرتكزات والمقومات القانونية
                                        </h2>
                                        <p className="text-slate-400 font-bold text-sm mr-24">مقتضيات القانون رقم 16.03 المتعلق بخطة العدالة والنصوص التنظيمية المكملة له</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-5 py-2 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200">Legal Reference Framework</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    {[
                                        { art: 'المادة 174', color: 'border-blue-100', items: ['مراقبة العدول المزاولين', 'إشعار السلطة والوكيل العام', 'إبداء الرأي في الإخلالات المهنية'], text: 'text-blue-900' },
                                        { art: 'المادة 103', color: 'bg-red-950 text-white shadow-[0_20px_50px_rgba(69,10,10,0.3)] scale-105', items: ['لجنة المراقبة المركزية والمحلية', 'محاضر التفتيش الدورية', 'تقارير الأداء المهني'], signature: 'إحالة سيادية' },
                                        { art: 'المادة 200', color: 'border-amber-100', items: ['تدبير ملفات المتمرنين', 'استشارة رئيس المجلس الجهوي', 'تحديد مكاتب التدريب المعتمدة'], text: 'text-amber-900' }
                                    ].map((item, i) => (
                                        <div key={i} className={`p-10 rounded-[3rem] border transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between h-full ${item.color}`}>
                                            <div className="space-y-8">
                                                <div className={`font-black text-2xl font-amiri flex items-center gap-2 ${item.art === 'المادة 103' ? 'text-[#E6BE8A]' : 'text-red-950'}`}>
                                                    <span className="w-2 h-8 bg-current rounded-full opacity-20"></span>
                                                    {item.art}
                                                </div>
                                                <ul className={`space-y-5 text-sm font-bold opacity-80 ${item.art === 'المادة 103' ? 'text-white/80' : 'text-slate-600'}`}>
                                                    {item.items.map((li, j) => (
                                                        <li key={j} className="flex items-start gap-4">
                                                            <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${item.art === 'المادة 103' ? 'bg-[#E6BE8A]' : 'bg-red-950'}`}></span>
                                                            <span className="leading-relaxed">{li}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            {item.signature && (
                                                <div className="mt-12 pt-8 border-t border-white/10 flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-[#E6BE8A] uppercase tracking-[0.2em]">{item.signature}</span>
                                                    <span className="text-xl">⚖️</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-16 p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center relative group/banner overflow-hidden">
                                     <div className="absolute inset-0 bg-red-950 translate-y-full group-hover/banner:translate-y-0 transition-transform duration-700 opacity-[0.02]"></div>
                                    <p className="text-slate-900 font-black text-2xl font-amiri flex items-center justify-center gap-8 relative z-10">
                                        <span className="bg-white px-6 py-2 rounded-2xl shadow-sm border border-slate-100">المؤسسة القضائية</span>
                                        <span className="text-5xl text-red-950 transition-transform group-hover/banner:scale-125 duration-500">⇌</span>
                                        <span className="bg-red-950 text-white px-6 py-2 rounded-2xl shadow-xl">المجلس الجهوي للعدول</span>
                                    </p>
                                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mt-6">Institutional Protocol for Official Judicial Interoperability</p>
                                </div>
                             </section>

                             {/* Section 2: Communication Scope - Refined Tables */}
                             <section className="bg-white rounded-[4rem] p-16 shadow-2xl shadow-slate-200/40 border border-slate-100">
                                <div className="flex items-center gap-6 mb-16">
                                    <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center text-3xl shadow-2xl shadow-slate-900/20">🔒</div>
                                    <h2 className="text-4xl font-black text-slate-900 font-amiri">2️⃣ نطاق ووعاء التواصل القانوني الموحد</h2>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                                    {/* Incoming */}
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between px-4 pb-4 border-b border-slate-100">
                                            <h3 className="text-2xl font-black text-blue-900 font-amiri flex items-center gap-4">
                                                <span className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner text-xl">📥</span>
                                                الواردات السيادية (من القاضي)
                                            </h3>
                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-lg">INCOMING SOURCE</span>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-xl shadow-slate-100/50">
                                            <table className="w-full text-right border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-black border-b border-slate-100">
                                                        <th className="p-8">طبيعة المراسلة</th>
                                                        <th className="p-8 text-center">السند المرجعي</th>
                                                        <th className="p-8">الغرض والغاية المرجوة</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm font-bold divide-y divide-slate-50">
                                                    {[
                                                        { type: 'إشعار بإخلال مهني', ref: 'م 174', desc: 'تبليغ المجلس بوقائع مهنية لتعليل الرأي', color: 'text-slate-900' },
                                                        { type: 'طلب رأي رسمي', ref: 'م 174', desc: 'طلب رأي المجلس في سلوك أو طلب للعدل', color: 'text-slate-900' },
                                                        { type: 'مراسلات لجنة المراقبة', ref: 'م 103', desc: 'نتائج أو طلبات المراقبة الميدانية للمكاتب', color: 'text-slate-900' }
                                                    ].map((row, i) => (
                                                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className={`p-8 font-black ${row.color}`}>{row.type}</td>
                                                            <td className="p-8 text-center"><span className="px-3 py-1 bg-slate-100 rounded-lg text-xs">{row.ref}</span></td>
                                                            <td className="p-8 text-[11px] text-slate-400 leading-relaxed font-bold">{row.desc}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Outgoing */}
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between px-4 pb-4 border-b border-slate-100">
                                            <h3 className="text-2xl font-black text-emerald-900 font-amiri flex items-center gap-4">
                                                <span className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner text-xl">📤</span>
                                                الصادرات الرسمية (إلى القاضي)
                                            </h3>
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg">OUTGOING DESTINATION</span>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-xl shadow-slate-100/50">
                                            <table className="w-full text-right border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-black border-b border-slate-100">
                                                        <th className="p-8">طبيعة المراسلة</th>
                                                        <th className="p-8 text-center">السند المرجعي</th>
                                                        <th className="p-8">الغرض والغاية المرجوة</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm font-bold divide-y divide-slate-50">
                                                    {[
                                                        { type: 'رأي المجلس الجهوي', ref: 'م 174', desc: 'تقديم الرأي المعلل والمكتوب بطلب من القاضي', color: 'text-slate-900' },
                                                        { type: 'تقارير المراقبة والمحاضر', ref: 'م 103', desc: 'نتاج مراقبة مكاتب العدول داخل الدائرة', color: 'text-slate-900' },
                                                        { type: 'إشعار بتنفيذ مقرر', ref: 'م 174', desc: 'إشعار المؤسسة القضائية بتنفيذ قرارات الهيئة', color: 'text-slate-900' }
                                                    ].map((row, i) => (
                                                        <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                                            <td className={`p-8 font-black ${row.color}`}>{row.type}</td>
                                                            <td className="p-8 text-center"><span className="px-3 py-1 bg-slate-100 rounded-lg text-xs">{row.ref}</span></td>
                                                            <td className="p-8 text-[11px] text-slate-400 leading-relaxed font-bold">{row.desc}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                             </section>

                             {/* Section 3: Functional Structure - Premium Grid */}
                             <section className="bg-[#111827] rounded-[4rem] p-16 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-950/20 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                
                                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
                                    <div className="space-y-4">
                                        <h2 className="text-4xl font-black text-white font-amiri flex items-center gap-6">
                                            <span className="w-3 h-12 bg-[#E6BE8A] rounded-full"></span>
                                            3️⃣ الهيكلة الوظيفية للمرافق الرقمي
                                        </h2>
                                        <p className="text-slate-400 font-bold text-sm">التنظيم البنيوي لوحدات التدبير والتصنيف المؤسساتي</p>
                                    </div>
                                    <div className="text-[#E6BE8A] font-black text-xs tracking-widest uppercase border border-[#E6BE8A]/20 px-6 py-3 rounded-2xl bg-white/5">Functional System Architecture</div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                                    {[
                                        { label: 'وحدة الواردات السيادية', icon: '📥', items: ['مراسلات قضاة التوثيق', 'قرارات الهيئة الوطنية', 'إشعارات السلطة الحكومية'], color: 'border-white/10 hover:border-blue-500/30' },
                                        { label: 'وحدة الصادرات الرسمية', icon: '📤', items: ['آراء المجلس المعللة', 'تقارير اللجان الوظيفية', 'مراسلات التنسيق القضائي'], color: 'border-white/10 hover:border-emerald-500/30' },
                                        { label: 'الأرشيف القانوني الممنهج', icon: '🗄️', items: ['السجل التاريخي للصادرات', 'الأوعية الرقمية للواردات', 'نظام النسخ الاحتياطي'], color: 'border-white/10 hover:border-slate-500/30' },
                                        { label: 'منظومة الرصد والتقارير', icon: '📊', items: ['مؤشرات الأداء السنوية', 'إحصائيات المراقبة المشتركة', 'تقارير المردودية القانونية'], color: 'border-white/10 hover:border-amber-500/30' }
                                    ].map((box, i) => (
                                        <div key={i} className={`p-10 rounded-[3rem] border bg-white/[0.02] backdrop-blur-3xl group hover:bg-white/[0.05] transition-all duration-500 ${box.color}`}>
                                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-2xl mb-8 border border-white/5 group-hover:scale-110 transition-transform">
                                                {box.icon}
                                            </div>
                                            <div className="font-black text-lg text-white mb-8 font-amiri tracking-tight">{box.label}</div>
                                            <ul className="space-y-4">
                                                {box.items.map((item, j) => (
                                                    <li key={j} className="text-xs font-bold text-slate-400 flex items-center gap-3 group-hover:text-slate-200 transition-colors">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#E6BE8A]/40 group-hover:bg-[#E6BE8A] group-hover:animate-pulse transition-all"></span>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                             </section>

                             {/* Section 4: Workflow - Cinematic Design */}
                             <section className="bg-red-950 rounded-[4rem] p-20 shadow-2xl relative overflow-hidden text-white group">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] opacity-20"></div>
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-900/40 via-transparent to-black/40"></div>
                                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

                                <div className="flex flex-col items-center text-center space-y-6 mb-24 relative z-10">
                                    <h2 className="text-5xl font-black font-amiri flex items-center gap-10">
                                        <span className="w-24 h-[1px] bg-[#E6BE8A]/30"></span>
                                        دورة حياة المراسلة السيادية
                                        <span className="w-24 h-[1px] bg-[#E6BE8A]/30"></span>
                                    </h2>
                                    <p className="text-[#E6BE8A]/60 font-bold text-sm tracking-widest uppercase">Digital Sovereignty Protocol & Tracking Ledger</p>
                                </div>
                                
                                <div className="flex flex-col md:flex-row items-start justify-between gap-6 relative z-10">
                                    {[
                                        { num: '01', title: 'التسجيل المركزي', desc: 'توليد مرجع رقمي موحد RJ-CT وفق المعايير الدولية', icon: '📝' },
                                        { num: '02', title: 'التصنيف البنيوي', desc: 'فرز المراسلة حسب المواد (174-103) والجهة المصدرة', icon: '🏷️' },
                                        { num: '03', title: 'الإحالة والتدقيق', desc: 'توجيه المراسلة للجان المختصة لإعداد الرأي القانوني', icon: '⚖️' },
                                        { num: '04', title: 'المصادقة الرقمية', desc: 'توقيع رئيس المجلس بخلفية تشفيرية تضمن الصحة', icon: '✍️' },
                                        { num: '05', title: 'التصدير والأرشفة', desc: 'الإرسال للجهة القضائية مع الحفظ في الوعاء المنيع', icon: '🏛️' }
                                    ].map((step, idx) => (
                                        <React.Fragment key={idx}>
                                            <div className="flex flex-col items-center text-center group/item flex-1">
                                                <div className="relative mb-10">
                                                    <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] border border-white/20 flex items-center justify-center text-4xl group-hover/item:bg-[#E6BE8A] group-hover/item:text-red-950 group-hover/item:scale-110 transition-all duration-700 shadow-2xl">
                                                        {step.icon}
                                                    </div>
                                                    <div className="absolute -bottom-4 -right-2 w-10 h-10 bg-red-950 border-2 border-[#E6BE8A]/30 rounded-full flex items-center justify-center text-xs font-black text-[#E6BE8A] shadow-xl">
                                                        {step.num}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="font-black text-lg font-amiri tracking-tight group-hover/item:text-[#E6BE8A] transition-colors">{step.title}</div>
                                                    <div className="text-white/40 text-[10px] font-bold leading-loose max-w-[160px] mx-auto group-hover/item:text-white/70 transition-colors uppercase italic">{step.desc}</div>
                                                </div>
                                            </div>
                                            {idx < 4 && (
                                                <div className="hidden md:flex h-32 items-center justify-center flex-shrink-0 animate-pulse mt-4">
                                                    <span className="text-3xl text-[#E6BE8A]/10">⇠</span>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                             </section>
                         </div>
                     )}

                     {activeTab !== 'overview' && activeTab !== 'reports' && (
                         <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 px-2">
                             {/* Institutional Archive Vault Doors */}
                             {activeTab === 'archive' && (
                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                     {[
                                         { name: 'خزانة العقود', count: 1240, icon: '📜', color: 'bg-slate-900', label: 'Land Deeds Vault' },
                                         { name: 'ديوان المراسلات', count: 5430, icon: '✉️', color: 'bg-red-950', label: 'Diplomatic Registry' },
                                         { name: 'أرشيف القضاة', count: 124, icon: '⚖️', color: 'bg-slate-800', label: 'Judicial Records' },
                                         { name: 'الوثائق السرية', count: 12, icon: '🔐', color: 'bg-slate-900', label: 'Classified Annex' }
                                     ].map((folder, idx) => (
                                         <div key={idx} className="group bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden relative">
                                             <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 group-hover:bg-red-900 transition-colors"></div>
                                             <div className="flex flex-col h-full justify-between items-start space-y-6">
                                                 <div className={`w-14 h-14 rounded-2xl ${folder.color} text-[#E6BE8A] flex items-center justify-center text-2xl shadow-xl group-hover:scale-110 transition-transform`}>
                                                     {folder.icon}
                                                 </div>
                                                 <div>
                                                     <h4 className="text-2xl font-black font-amiri text-slate-900">{folder.name}</h4>
                                                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">{folder.label}</p>
                                                 </div>
                                                 <div className="w-full flex justify-between items-end">
                                                     <span className="text-3xl font-sans font-black text-slate-100 group-hover:text-slate-900/5 transition-colors">{folder.count}</span>
                                                     <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                         ⇠
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}

                             <div className="flex flex-col gap-10">
                                <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative group">
                                   <div className="absolute top-0 right-0 w-2 h-full bg-red-950 transition-all group-hover:w-3"></div>
                                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                                      <div className="flex items-center gap-8">
                                          <div className={`w-20 h-20 rounded-[2.25rem] flex items-center justify-center text-4xl shadow-2xl transition-transform duration-700 group-hover:rotate-12 ${
                                              activeTab === 'incoming' ? 'bg-blue-50 text-blue-600 shadow-blue-100' : 
                                              activeTab === 'outgoing' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : 
                                              'bg-slate-900 text-white shadow-slate-200'
                                          }`}>
                                              {activeTab === 'incoming' ? '📥' : activeTab === 'outgoing' ? '📤' : '🗄️'}
                                          </div>
                                          <div>
                                              <h2 className="text-3xl font-black text-slate-900 font-amiri tracking-tight">
                                                  {activeTab === 'incoming' ? 'وحدة الواردات السيادية الموحدة' : activeTab === 'outgoing' ? 'وحدة الصادرات الرسمية المعتمدة' : 'السجل المرجعي للأرخصيف القانوني'}
                                              </h2>
                                              <div className="flex items-center gap-3 mt-1">
                                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                                                    {activeTab === 'incoming' ? 'Official Inbound Judicial Terminal' : activeTab === 'outgoing' ? 'Official Outbound Judicial Terminal' : 'High-Security Judicial Archive Storage'}
                                                </p>
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                                                <span className="text-[10px] font-black text-red-950 bg-red-50 px-3 py-0.5 rounded-full border border-red-100">Live Synchronized</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex gap-4">
                                           <button className="px-8 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black shadow-sm flex items-center gap-3 hover:bg-slate-50 hover:border-red-950/20 transition-all group/btn">
                                               <span className="group-hover/btn:scale-110 transition-transform">🖨️</span>
                                               <span>طباعة السجل الكامل</span>
                                           </button>
                                           <button className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black shadow-xl hover:bg-black transition-all">تصدير EXCEL</button>
                                      </div>
                                   </div>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-right border-separate border-spacing-y-4 min-w-[1200px]">
                                        <thead>
                                            <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                                <th className="px-8 py-4 w-[12%] text-center">الرقم المرجعي</th>
                                                <th className="px-8 py-4 w-[20%] text-right font-amiri text-sm">نوع المراسلة</th>
                                                <th className="px-8 py-4 w-[18%] text-right font-amiri text-sm">{activeTab === 'incoming' ? 'المرسل' : 'المرسل إليه'}</th>
                                                <th className="px-8 py-4 w-[8%] text-center font-amiri text-sm">السند</th>
                                                <th className="px-8 py-4 w-[22%] text-right font-amiri text-sm">الموضوع</th>
                                                <th className="px-8 py-4 w-[10%] text-center font-amiri text-sm">الحالة</th>
                                                <th className="px-8 py-4 w-[8%] text-center font-amiri text-sm">التاريخ</th>
                                                <th className="px-8 py-4 w-[4%] text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.map((letter) => (
                                                <tr key={letter.id} className="group transition-all hover:translate-x-1 duration-300">
                                                    <td className="bg-white p-8 rounded-r-[2.5rem] border-y border-r border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                                                        <span className="font-sans text-[10px] bg-slate-900 text-[#E6BE8A] px-4 py-1.5 rounded-full block text-center font-black">
                                                            {letter.reference}
                                                        </span>
                                                    </td>
                                                    <td className="bg-white p-8 border-y border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg group-hover:bg-red-50 transition-colors">
                                                                {letter.type.includes('عقد') ? '📜' : letter.type.includes('طلب') ? '📝' : '✉️'}
                                                            </div>
                                                            <span className="text-slate-900 font-bold block truncate">{letter.type}</span>
                                                        </div>
                                                    </td>
                                                    <td className="bg-white p-8 border-y border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                                                        <span className="text-slate-500 font-black text-[12px] block truncate">{activeTab === 'incoming' ? letter.sender : letter.recipient}</span>
                                                    </td>
                                                    <td className="bg-white p-8 border-y border-slate-100 shadow-sm group-hover:shadow-md transition-all text-center">
                                                        <span className="font-black text-red-900 bg-red-50/50 px-3 py-1 rounded-lg border border-red-100/50">{letter.legalBasis}</span>
                                                    </td>
                                                    <td className="bg-white p-8 border-y border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter block truncate">
                                                            {letter.subject}
                                                        </span>
                                                    </td>
                                                    <td className="bg-white p-8 border-y border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                                                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black border block text-center truncate ${
                                                            letter.status === 'signed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            letter.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                            'bg-slate-50 text-slate-400 border-slate-100'
                                                        }`}>
                                                            {letter.status === 'signed' ? 'تم التوقيع' : letter.status === 'pending' ? 'جاري المعالجة' : 'مؤرشف'}
                                                        </span>
                                                    </td>
                                                    <td className="bg-white p-8 border-y border-slate-100 shadow-sm group-hover:shadow-md transition-all text-center">
                                                        <span className="text-slate-400 text-[10px] font-sans font-black tracking-widest">{letter.date}</span>
                                                    </td>
                                                    <td className="bg-white p-8 rounded-l-[2.5rem] border-y border-l border-slate-100 shadow-sm group-hover:shadow-md transition-all text-center">
                                                        <button 
                                                            onClick={() => setSelectedLetter(letter)}
                                                            className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-[#E6BE8A] transition-all transform hover:rotate-6 shadow-sm border border-slate-100"
                                                        >
                                                            <span className="text-xl">📂</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                             </div>
                         </div>
                     )}

                     {activeTab === 'reports' && (
                         <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                 <div className="col-span-2 bg-slate-900 rounded-[3.5rem] p-16 text-white relative overflow-hidden shadow-2xl">
                                     <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-red-950/20 to-transparent"></div>
                                     <div className="relative z-10">
                                         <h3 className="text-4xl font-black font-amiri mb-6">مركز التحليلات الاستراتيجية</h3>
                                         <p className="text-slate-400 font-bold max-w-xl leading-loose mb-10">
                                             مرحبًا بكم في الجيل القادم من ذكاء الأعمال القضائي. تقوم هذه المنصة بتحليل أنماط المراسلات السيادية وقياس سرعة الاستجابة القانونية عبر كافة الأقاليم.
                                         </p>
                                         <div className="flex gap-10">
                                             <div className="space-y-1">
                                                 <p className="text-4xl font-sans font-black text-[#E6BE8A] tracking-tighter">98.4%</p>
                                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الدقة القانونية</p>
                                             </div>
                                             <div className="w-px h-12 bg-white/10"></div>
                                             <div className="space-y-1">
                                                 <p className="text-4xl font-sans font-black text-[#E6BE8A] tracking-tighter">1.2s</p>
                                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">زمن التوثيق</p>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                                 <div className="bg-[#E6BE8A] rounded-[3.5rem] p-12 text-slate-900 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                                     <div className="absolute -right-10 -bottom-10 text-[10rem] opacity-10 group-hover:rotate-12 transition-transform duration-1000">📊</div>
                                     <div className="space-y-4">
                                         <h4 className="text-2xl font-black font-amiri">التقرير السنوي 2025</h4>
                                         <p className="text-xs font-black opacity-60">تصدير كامل للبيانات المسجلة</p>
                                     </div>
                                     <button className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black text-sm hover:bg-black transition-all flex items-center justify-center gap-3">
                                         <span>📥</span>
                                         <span>تحميل التقرير الشامل</span>
                                     </button>
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                 {[
                                     { label: 'كفاءة الديوان', value: '82%', color: 'bg-emerald-500', icon: '📈' },
                                     { label: 'معدل الأرشفة', value: '100%', color: 'bg-blue-500', icon: '💿' },
                                     { label: 'التوزيع الإقليمي', value: '⚖️', color: 'bg-red-500', icon: '🌍' },
                                     { label: 'ثبات النظام', value: '99.9%', color: 'bg-slate-900', icon: '🛡️' }
                                 ].map((stat, i) => (
                                     <div key={i} className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-sm flex items-center gap-8 group hover:border-red-950/10 transition-all">
                                         <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">{stat.icon}</div>
                                         <div>
                                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                             <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                                         </div>
                                     </div>
                                 ))}
                             </div>

                             <div className="bg-white rounded-[3.5rem] p-16 border-2 border-slate-50 shadow-sm text-center space-y-8">
                                 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">🧩</div>
                                 <div>
                                     <h3 className="text-2xl font-black font-amiri text-slate-900 mb-2">تكامل الذكاء الاصطناعي قيد المعايرة</h3>
                                     <p className="text-slate-400 font-bold max-w-md mx-auto line-clamp-2">سيتم ربط نظام التقارير بنماذج التنبؤ القانوني لتسهيل اتخاذ القرار في الربع الثالث من عام 2026.</p>
                                 </div>
                                 <div className="flex justify-center gap-2">
                                     <div className="w-3 h-3 rounded-full bg-red-950 animate-bounce delay-75"></div>
                                     <div className="w-3 h-3 rounded-full bg-red-900 animate-bounce delay-150"></div>
                                     <div className="w-3 h-3 rounded-full bg-red-800 animate-bounce delay-300"></div>
                                 </div>
                             </div>
                         </div>
                     )}
                </main>
            </div>

            {/* Letter Viewer Modal */}
            {selectedLetter && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-500 text-right">
                        <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-3xl font-black font-amiri mb-2">معاينة المراسلة الرسمية</h2>
                                <p className="text-slate-400 text-xs font-bold tracking-[0.2em]">{selectedLetter.reference} • {selectedLetter.legalBasis}</p>
                            </div>
                            <button onClick={() => setSelectedLetter(null)} className="w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-2xl transition-all hover:rotate-90">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50 space-y-10 relative">
                            {/* Digital Seal Watermark */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
                                <span className="text-[30rem]">🏛️</span>
                            </div>

                            <div className="grid grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">جهة الإرسال السيادية</label>
                                    <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 font-black text-slate-900 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-xl">🏢</div>
                                        <span className="text-lg">{selectedLetter.sender}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">جهة الاستلام الرسمية</label>
                                    <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 font-black text-slate-900 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-950 flex items-center justify-center text-xl text-[#E6BE8A]">⚖️</div>
                                        <span className="text-lg">{selectedLetter.recipient}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-100 shadow-xl space-y-8 relative z-10">
                                <div className="flex justify-between items-start border-b border-slate-100 pb-8">
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-red-900 uppercase">موضوع المراسلة</h4>
                                        <p className="text-2xl font-black font-amiri text-slate-900 leading-relaxed">{selectedLetter.subject}</p>
                                    </div>
                                    <div className="text-left">
                                        <div className="inline-block bg-slate-900 text-[#E6BE8A] px-6 py-2 rounded-full text-[10px] font-black mb-2">
                                            {selectedLetter.reference}
                                        </div>
                                        <p className="text-slate-400 font-sans text-[10px] font-bold tracking-widest">{selectedLetter.date}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <p className="text-slate-600 font-bold leading-loose text-lg font-amiri text-justify">
                                        بناءً على الصلاحيات المخولة للمجلس الإقليمي، وعطفاً على السند القانوني الوارد في {selectedLetter.legalBasis}، نتشرف بإحاطتكم علماً بأن هذه المراسلة المسجلة تحت رقم {selectedLetter.reference} قد تم توثيقها رسمياً في السجل الرقمي للديوان.
                                        <br /><br />
                                        يرجى من الجهات المعنية اتخاذ الإجراءات اللازمة وفقاً للمساطر المعمول بها، وضمان أرشفة النسخة الأصلية في الخزانة الرقمية للمجلس.
                                    </p>
                                </div>

                                <div className="pt-10 flex border-t border-slate-50 justify-between items-end">
                                    <div className="flex gap-4">
                                        <div className="w-24 h-24 rounded-full border-4 border-slate-50 flex items-center justify-center bg-slate-50/30 group">
                                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-3xl grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all cursor-crosshair">🔏</div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-300">ختم التوثيق الرقمي</p>
                                            <p className="font-sans text-[9px] text-slate-400 font-bold">VERIFIED BY REGIONAL COUNCIL PORTAL</p>
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <div className="w-32 h-1 bg-slate-900 mx-auto rounded-full"></div>
                                        <p className="font-black text-slate-900 text-sm">توقيع الكاتب العام</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                            <button onClick={() => setSelectedLetter(null)} className="px-10 py-5 bg-white text-slate-400 border border-slate-200 rounded-[2rem] font-black text-xs hover:bg-slate-100 transition-colors">إغلاق المعاينة</button>
                            <button className="px-14 py-5 bg-slate-950 text-[#E6BE8A] rounded-[2rem] font-black text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3" onClick={() => window.print()}>
                                <span>🖨️</span>
                                <span>طباعة النسخة الموقعة</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Draft Modal - Institutional Drafting Terminal */}
            {showNewDraftModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-500 text-right">
                        <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-[#E6BE8A] text-slate-900 flex items-center justify-center text-3xl shadow-lg">✍️</div>
                                <div>
                                    <h2 className="text-3xl font-black font-amiri tracking-tight">إنشاء مراسلة سيادية جديدة</h2>
                                    <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mt-1">New Sovereign Correspondence Draft</p>
                                </div>
                            </div>
                            <button onClick={() => setShowNewDraftModal(false)} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all">✕</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
                            <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">نوع المراسلة الرسمية</label>
                                        <select className="w-full bg-white border-2 border-slate-100 p-6 rounded-2xl font-bold text-slate-700 focus:border-red-950 transition-all outline-none appearance-none cursor-pointer shadow-sm">
                                            <option>طلب توثيق عقار</option>
                                            <option>إشعار بتغيير وضعية قانونية</option>
                                            <option>مراسلة وزارية مستعجلة</option>
                                            <option>قرار تأديبي مهني</option>
                                        </select>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">الرقم المرجعي التلقائي</label>
                                        <input type="text" disabled value="RJ-REF-2025-XXXX" className="w-full bg-slate-100 border-2 border-slate-100 p-6 rounded-2xl font-sans font-black text-slate-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">الجهة المستهدفة (المستلم)</label>
                                        <input type="text" placeholder="مثلاً: قاضي التوثيق بالمحكمة الابتدائية..." className="w-full bg-white border-2 border-slate-100 p-6 rounded-2xl font-bold text-slate-700 focus:border-red-950 transition-all outline-none shadow-sm" />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">السند القانوني المعتمد</label>
                                        <input type="text" placeholder="المادة 15 من قانون العدالة الرقمية..." className="w-full bg-white border-2 border-slate-100 p-6 rounded-2xl font-bold text-slate-700 focus:border-red-950 transition-all outline-none shadow-sm" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">موضوع ومنطوق المراسلة</label>
                                    <textarea rows={6} placeholder="التفاصيل القانونية للمراسلة..." className="w-full bg-white border-2 border-slate-100 p-8 rounded-3xl font-bold text-slate-700 focus:border-red-950 transition-all outline-none shadow-sm"></textarea>
                                </div>

                                <div className="bg-red-50 p-6 rounded-2xl flex items-center gap-4 border border-red-100">
                                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl">⚠️</div>
                                    <p className="text-[10px] font-black text-red-900 leading-relaxed uppercase tracking-tighter">
                                        تنبيه: سيتم تسجيل هذه المراسلة في السجل العدلي الرقمي وتوقيعها إلكترونياً ببصمة المجلس الإقليمي فور الاعتماد.
                                    </p>
                                </div>
                            </form>
                        </div>

                        <div className="p-10 bg-white border-t border-slate-100 flex justify-end gap-6 shadow-[0_-15px_40px_rgba(0,0,0,0.03)]">
                            <button onClick={() => setShowNewDraftModal(false)} className="px-10 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all">إلغاء المسودة</button>
                            <button className="px-14 py-5 bg-slate-900 text-[#E6BE8A] rounded-[2rem] font-black text-xs shadow-2xl hover:bg-black transition-all flex items-center gap-3">
                                <span>🔒</span>
                                <span>تشفير وإرسال المراسلة</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportsAndImports;
