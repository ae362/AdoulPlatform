import React, { useState } from 'react';

interface NationalCorrespondence {
  id: string;
  ref: string;
  type: 'incoming' | 'outgoing';
  category: string;
  subject: string;
  region_or_entity: string;
  legal_basis: string;
  status: 'new' | 'under_review' | 'signed' | 'sent' | 'archived' | 'overdue';
  at: string;
  deadline?: string;
  percentage?: number;
}

const SEED_NATIONAL_CORRESPONDENCE: NationalCorrespondence[] = [
  {
    id: '1',
    ref: 'HN-COR-2026-0542',
    type: 'incoming',
    category: 'مجالس جهوية',
    subject: 'تقرير المراقبة السنوي - جهة الدار البيضاء',
    region_or_entity: 'المجلس الجهوي للدار البيضاء',
    legal_basis: 'المادة 174',
    status: 'new',
    at: '2026-01-31',
    percentage: 10,
  },
  {
    id: '2',
    ref: 'HN-COR-2026-0543',
    type: 'outgoing',
    category: 'قرارات ملزمة',
    subject: 'قرار تدبيري رقم 14 بخصوص رسوم الانخراط',
    region_or_entity: 'كافة المجالس الجهوية',
    legal_basis: 'المادة 170',
    status: 'signed',
    at: '2026-02-01',
    percentage: 80,
  },
  {
    id: '3',
    ref: 'HN-COR-2026-0544',
    type: 'outgoing',
    category: 'تبليغ للسلطة',
    subject: 'تبليغ محضر مداولات المكتب التنفيذي',
    region_or_entity: 'وزارة العدل',
    legal_basis: 'المادة 171',
    status: 'sent',
    at: '2026-01-25',
    percentage: 100,
  },
  {
    id: '4',
    ref: 'HN-COR-2026-0545',
    type: 'incoming',
    category: 'تقارير مالية',
    subject: 'الميزانية السنوية التقديرية 2026',
    region_or_entity: 'المجلس الجهوي للرباط',
    legal_basis: 'المادة 195',
    status: 'under_review',
    at: '2026-01-20',
    percentage: 45,
  }
];

export default function NationalExecutiveCorrespondence() {
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'outgoing' | 'archive'>('all');
  const [items, setItems] = useState<NationalCorrespondence[]>(SEED_NATIONAL_CORRESPONDENCE);
  const [selectedItem, setSelectedItem] = useState<NationalCorrespondence | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'under_review': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'signed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'sent': return 'bg-green-100 text-green-700 border-green-200';
      case 'archived': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'وارد جديد';
      case 'under_review': return 'قيد المداولة';
      case 'signed': return 'موقع قرار';
      case 'sent': return 'تم التبليغ';
      case 'archived': return 'أرشيف مركزي';
      case 'overdue': return 'متأخر';
      default: return status;
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'all') return item.status !== 'archived';
    if (activeTab === 'incoming') return item.type === 'incoming' && item.status !== 'archived';
    if (activeTab === 'outgoing') return item.type === 'outgoing' && item.status !== 'archived';
    if (activeTab === 'archive') return item.status === 'archived';
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-220px)] gap-6 animate-fade-in overflow-hidden" dir="rtl">
      
      {/* 🏛️ Right Sidebar: National Legal Basis */}
      <aside className="w-80 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-6 shadow-sm overflow-y-auto">
        <div>
          <h3 className="text-xl font-black text-slate-900 mb-4 border-b-2 border-[#E6BE8A] pb-2">
            📌 المرجعية القانونية الوطنية
          </h3>
          
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border-r-4 border-slate-900">
               <h4 className="font-bold text-xs text-slate-800 mb-1">المواد 169 – 170</h4>
               <p className="text-[10px] text-slate-500">الاجتماعات، المداولات، والقرارات التنظيمية الملزمة.</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border-r-4 border-[#E6BE8A]">
               <h4 className="font-bold text-xs text-slate-800 mb-1">المادة 171: التبليغ</h4>
               <p className="text-[10px] text-slate-500">التبليغ للسلطة الحكومية المكلفة بالعدل والوكيل العام للملك.</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border-r-4 border-blue-900">
               <h4 className="font-bold text-xs text-slate-800 mb-1">المادة 174: الإحالات</h4>
               <p className="text-[10px] text-slate-500">تلقي ودراسة الإحالات والمشاكل المرفوعة من المجالس الجهوية.</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border-r-4 border-emerald-900">
               <h4 className="font-bold text-xs text-slate-800 mb-1">المواد 195 – 196</h4>
               <p className="text-[10px] text-slate-500">مركزة التقارير المالية والمحاسبة الوطنية.</p>
            </div>
          </div>
        </div>

        <div className="mt-auto">
           <div className="bg-slate-900 p-4 rounded-2xl text-center">
              <p className="text-[#E6BE8A] font-black text-xs uppercase tracking-widest">المكتب التنفيذي</p>
              <p className="text-white text-[10px] opacity-60 mt-1">بوابة القيادة المركزية</p>
           </div>
        </div>
      </aside>

      {/* 🚀 Main Hub */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* Navigation & Metrics */}
        <div className="flex gap-4">
           <div className="bg-white p-2 rounded-2xl border border-slate-200 flex gap-2 shadow-sm flex-1">
              {[
                { id: 'all', label: 'الكل', icon: '💎' },
                { id: 'incoming', label: 'واردات الجهات', icon: '📥' },
                { id: 'outgoing', label: 'صادرات الهيئة', icon: '📤' },
                { id: 'archive', label: 'المركزية', icon: '🗄️' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 px-2 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === tab.id ? 'bg-[#E6BE8A] text-slate-900 shadow-lg shadow-amber-200/50' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
           </div>
           <div className="bg-white px-6 py-2 rounded-2xl border border-slate-200 flex items-center gap-6 shadow-sm">
              <div className="text-center">
                 <p className="text-[10px] font-bold text-slate-400">تحت المعالجة</p>
                 <p className="text-xl font-black text-blue-600">24</p>
              </div>
              <div className="w-px h-8 bg-slate-100"></div>
              <div className="text-center">
                 <p className="text-[10px] font-bold text-slate-400">متأخر</p>
                 <p className="text-xl font-black text-red-600">03</p>
              </div>
           </div>
        </div>

        {/* Directory Explorer */}
        <div className="grid grid-cols-4 gap-4">
           {[
             { label: 'قرارات ملزمة', icon: '📜', color: 'border-slate-800' },
             { label: 'تبليغات وزارية', icon: '🏛️', color: 'border-[#E6BE8A]' },
             { label: 'تقارير جهوية', icon: '🗺️', color: 'border-blue-300' },
             { label: 'مراسلات مالية', icon: '💰', color: 'border-emerald-300' },
           ].map(dir => (
             <div key={dir.label} className={`bg-white p-4 rounded-2xl border-r-4 ${dir.color} shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4 group`}>
                <span className="text-3xl group-hover:scale-110 transition-transform">{dir.icon}</span>
                <h4 className="font-bold text-slate-800 text-xs">{dir.label}</h4>
             </div>
           ))}
        </div>

        {/* Correspondence Terminal */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
           <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xl">📂</div>
                 <div>
                    <h3 className="font-black text-slate-900">سجل الصادرات والواردات المركزية</h3>
                    <p className="text-[10px] text-slate-400 font-bold">بوابة المكاتب الجهوية / المكتب التنفيذي</p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button className="bg-[#E6BE8A] text-slate-900 px-6 py-2 rounded-xl text-xs font-black shadow-sm hover:scale-105 transition-transform">
                    إصدار قرار / مراسلة 📤
                 </button>
              </div>
           </div>

           <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-right">
                 <thead className="sticky top-0 bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                    <tr>
                       <th className="p-5">المرجع المركزي</th>
                       <th className="p-5">التصنيف</th>
                       <th className="p-5">الموضوع والأساس</th>
                       <th className="p-5">الجهة / الشريك</th>
                       <th className="p-5">الحالة والتقدم</th>
                       <th className="p-5 text-center">الإجراء</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {filteredItems.map(item => (
                      <tr 
                         key={item.id} 
                         className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                         onClick={() => setSelectedItem(item)}
                      >
                         <td className="p-5">
                           <span className="px-3 py-1 bg-slate-100 rounded-lg font-mono text-xs font-bold text-slate-600">
                             {item.ref}
                           </span>
                         </td>
                         <td className="p-5">
                           <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${item.type === 'incoming' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                             <span className="text-xs font-black text-slate-800">{item.category}</span>
                           </div>
                         </td>
                         <td className="p-5">
                           <p className="text-sm font-bold text-slate-900 mb-1">{item.subject}</p>
                           <span className="text-[9px] bg-[#E6BE8A]/20 text-[#8a6d3b] px-2 py-0.5 rounded font-black">{item.legal_basis}</span>
                         </td>
                         <td className="p-5 text-xs font-bold text-slate-500">
                           {item.region_or_entity}
                         </td>
                         <td className="p-5">
                            <div className="flex flex-col gap-2">
                               <span className={`w-fit px-3 py-1 rounded-full text-[9px] font-black border ${getStatusColor(item.status)}`}>
                                 {getStatusLabel(item.status)}
                               </span>
                               <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-slate-900" style={{ width: `${item.percentage}%` }}></div>
                               </div>
                            </div>
                         </td>
                         <td className="p-5">
                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button title="فتح الملف" className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-slate-900 hover:text-slate-900 shadow-sm">📂</button>
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* 🚀 National Detail View */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-8 animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
              
              <div className="bg-slate-900 p-10 text-white relative">
                 <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                 <div className="relative z-10 flex justify-between items-start">
                    <div className="space-y-3">
                       <div className="flex items-center gap-4">
                          <span className="bg-[#E6BE8A] text-slate-900 text-xs font-black px-4 py-1 rounded-full shadow-lg">
                            {selectedItem.ref}
                          </span>
                          <span className="text-slate-400 font-mono text-sm">{selectedItem.at}</span>
                       </div>
                       <h2 className="text-4xl font-black">{selectedItem.subject}</h2>
                       <div className="flex gap-4">
                          <span className="text-sm font-bold opacity-60">الجهة: {selectedItem.region_or_entity}</span>
                          <span className="text-sm font-bold text-[#E6BE8A]">الأساس: {selectedItem.legal_basis}</span>
                       </div>
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center text-2xl transition-colors">✕</button>
                 </div>
              </div>

              <div className="p-10 flex-1 overflow-y-auto grid grid-cols-12 gap-10">
                 {/* Timeline Content */}
                 <div className="col-span-8 space-y-10">
                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
                       <h3 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-4 mb-6 flex items-center gap-3">
                          <span className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-sm">🕰️</span>
                          الخط الزمني للمراسلة (Timeline)
                       </h3>
                       <div className="space-y-8 relative">
                          <div className="absolute right-4 top-2 bottom-2 w-0.5 bg-slate-200"></div>
                          
                          <div className="relative pr-12">
                             <div className="absolute right-2 top-0 w-4 h-4 rounded-full bg-slate-900 border-4 border-white shadow-md"></div>
                             <p className="text-xs font-black text-slate-800">استلام الوارد</p>
                             <p className="text-[10px] text-slate-500 mt-1">تم تسجيل المراسلة في السجل المركزي - {selectedItem.at}</p>
                          </div>

                          <div className="relative pr-12 opacity-50">
                             <div className="absolute right-2 top-0 w-4 h-4 rounded-full bg-slate-300 border-4 border-white"></div>
                             <p className="text-xs font-black text-slate-800">إحالة على لجنة الشؤون المهنية</p>
                             <p className="text-[10px] text-slate-500 mt-1">بانتظار عرض الملف في الاجتماع القادم</p>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="p-6 bg-white border-2 border-slate-50 rounded-3xl hover:border-[#E6BE8A]/30 transition-colors">
                          <span className="text-4xl mb-4 block">📄</span>
                          <h4 className="font-black text-slate-900 text-sm">الوثيقة الأصلية</h4>
                          <p className="text-[10px] text-slate-500 mt-2 italic">نسخة رقمية مؤرشفة ومرقمة بترميز مركزي.</p>
                       </div>
                       <div className="p-6 bg-white border-2 border-slate-50 rounded-3xl hover:border-[#E6BE8A]/30 transition-colors">
                          <span className="text-4xl mb-4 block">🔗</span>
                          <h4 className="font-black text-slate-900 text-sm">المرفقات الإضافية</h4>
                          <p className="text-[10px] text-slate-500 mt-2 italic">مذكرات، قرارات سابقة، أو خرائط توضيحية.</p>
                       </div>
                    </div>
                 </div>

                 {/* Actions Sidebar */}
                 <div className="col-span-4 space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-[#1d2569] p-8 rounded-[2.5rem] text-white shadow-2xl">
                       <h3 className="font-black text-sm mb-6 flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-[#E6BE8A] animate-ping"></span>
                          إجراءات المكتب التنفيذي
                       </h3>
                       <div className="space-y-3">
                          <button className="w-full bg-white/10 hover:bg-white/20 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all">
                             توجيه إلى لجنة مختصة
                          </button>
                          <button className="w-full bg-[#E6BE8A] text-slate-900 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105">
                             المصادقة والتوقيع (م 170)
                          </button>
                          <button className="w-full bg-red-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                             طلب توضيحات إضافية
                          </button>
                       </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-tighter">تقارير التبليغ القانوني (م 171)</h4>
                       <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                             <span className="text-[10px] font-bold text-slate-600">الأمانة العامة للحكومة</span>
                             <span className="text-[8px] bg-slate-100 px-2 py-0.5 rounded text-slate-400">بانتظار</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                             <span className="text-[10px] font-bold text-slate-600">نيابة الملك</span>
                             <span className="text-[8px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-600 font-black">تم التبليغ</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
