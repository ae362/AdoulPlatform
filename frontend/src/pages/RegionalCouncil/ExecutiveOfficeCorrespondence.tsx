import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Correspondence {
  id: string;
  ref: string;
  type: 'incoming' | 'outgoing';
  category: string;
  subject: string;
  sender_recipient: string;
  legal_basis: string;
  status: 'new' | 'referred' | 'draft' | 'signed' | 'sent' | 'archived';
  at: string;
  deadline?: string;
}

const SEED_CORRESPONDENCE: Correspondence[] = [
  {
    id: '1',
    ref: 'RG-COR-2026-0001',
    type: 'incoming',
    category: 'المكتب التنفيذي',
    subject: 'تنفيذ مخرجات دورة المجلس الوطني رقم 22',
    sender_recipient: 'الهيئة الوطنية للعدول',
    legal_basis: 'المادة 174',
    status: 'new',
    at: '2026-01-28',
    deadline: '2026-02-10',
  },
  {
    id: '2',
    ref: 'RG-COR-2026-0002',
    type: 'outgoing',
    category: 'قاضي التوثيق',
    subject: 'تقرير رأي معلل في إخلال مهني',
    sender_recipient: 'قاضي التوثيق بالمحكمة الابتدائية',
    legal_basis: 'المادة 174',
    status: 'signed',
    at: '2026-01-30',
  },
  {
    id: '3',
    ref: 'RG-COR-2026-0003',
    type: 'incoming',
    category: 'عدول',
    subject: 'طلب انتقال لمكتب جديد',
    sender_recipient: 'ذ. عبد الواحد التازي',
    legal_basis: 'المادة 49',
    status: 'archived',
    at: '2026-01-15',
  },
  {
    id: '4',
    ref: 'RG-COR-2026-0004',
    type: 'outgoing',
    category: 'انتخابات',
    subject: 'إرسال لوائح الناخبين النهائية',
    sender_recipient: 'الهيئة الوطنية للعدول',
    legal_basis: 'المادة 177',
    status: 'sent',
    at: '2026-01-20',
  }
];

export default function ExecutiveOfficeCorrespondence() {
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'outgoing' | 'archive'>('all');
  const [items, setItems] = useState<Correspondence[]>(SEED_CORRESPONDENCE);
  const [selectedItem, setSelectedItem] = useState<Correspondence | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'referred': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'signed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'sent': return 'bg-green-100 text-green-700 border-green-200';
      case 'archived': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'جديد / تسجيل';
      case 'referred': return 'قيد الإحالة';
      case 'draft': return 'مسودة جواب';
      case 'signed': return 'موقع إلكترونياً';
      case 'sent': return 'تم الإرسال';
      case 'archived': return 'مؤرشف';
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
    <div className="flex h-[calc(100vh-250px)] gap-6 animate-fade-in overflow-hidden">
      
      {/* 📜 Right Sidebar: Legal Basis (RTL Context) */}
      <aside className="w-80 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-6 shadow-sm overflow-y-auto">
        <div>
          <h3 className="text-xl font-black text-red-950 mb-4 border-b-2 border-red-950 pb-2">
            📌 الأساس القانوني (مشروع 16.22)
          </h3>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            العلاقات التي يُلزم أو يجيز بها القانون المجلس الجهوي تقوم أساساً على البنود التالية:
          </p>

          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border-r-4 border-red-900">
               <h4 className="font-bold text-red-900 mb-2">المادة 174: المراقبة والسهر</h4>
               <ul className="text-xs text-slate-600 space-y-2">
                 <li>• السهر على تطبيق قرارات المكتب التنفيذي</li>
                 <li>• إحالة المشاكل الجهوية</li>
                 <li>• مراقبة العدول وإشعار السلطة بالإخلالات</li>
                 <li>• إبداء الرأي في الإخلالات المهنية</li>
               </ul>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border-r-4 border-emerald-900">
               <h4 className="font-bold text-emerald-900 mb-2">المواد 177 ← 193: الانتخابات</h4>
               <p className="text-xs text-slate-600">إعداد اللوائح، المحاضر، التبليغ، والطعون الجهوية.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border-r-4 border-blue-900">
               <h4 className="font-bold text-blue-900 mb-2">المادة 195: المالية</h4>
               <p className="text-xs text-slate-600">إعداد ورفع التقارير المالية الجهوية للمكتب التنفيذي.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border-r-4 border-amber-900">
               <h4 className="font-bold text-amber-900 mb-2">المادة 200: التدريب</h4>
               <p className="text-xs text-slate-600">تدبير شؤون المتدربين بعد استشارة رئيس المجلس.</p>
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3">
           <span className="text-2xl animate-pulse">📤</span>
           <p className="text-[10px] text-red-900 font-bold leading-tight">تدفق مراسلات رسمي متشعب يجب تنظيمه بدقة إلكترونية.</p>
        </div>
      </aside>

      {/* 📂 Main Section */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 flex gap-2 shadow-sm">
           {[
             { id: 'all', label: 'الكل', icon: '📋' },
             { id: 'incoming', label: '📥 الواردات (Entrant)', icon: '📥' },
             { id: 'outgoing', label: '📤 الصادرات (Sortant)', icon: '📤' },
             { id: 'archive', label: '🗄️ الأرشيف القانوني', icon: '🗄️' },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === tab.id ? 'bg-red-950 text-[#E6BE8A] shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               <span>{tab.icon}</span>
               {tab.label}
             </button>
           ))}
        </div>

        {/* Directory Structure Simulation */}
        <div className="grid grid-cols-4 gap-4">
           {[
             { label: 'مراسلات الانتخابات', icon: '🗳️', count: 12, color: 'border-emerald-200' },
             { label: 'المراقبة والتأديب', icon: '⚖️', count: 5, color: 'border-red-200' },
             { label: 'التسيير المالي', icon: '💼', count: 8, color: 'border-blue-200' },
             { label: 'المكتب التنفيذي', icon: '🏛️', count: 15, color: 'border-amber-200' },
           ].map(dir => (
             <div key={dir.label} className={`bg-white p-4 rounded-2xl border-b-4 ${dir.color} shadow-sm cursor-pointer hover:scale-[1.02] transition-transform`}>
                <div className="flex justify-between items-center mb-2">
                   <span className="text-2xl">{dir.icon}</span>
                   <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">{dir.count}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-xs">{dir.label}</h4>
             </div>
           ))}
        </div>

        {/* List View */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
           <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <span>📂</span>
                 سجل المراسلات الإلكترونية
              </h3>
              <div className="flex gap-2">
                 <input 
                   type="text" 
                   placeholder="بحث بالرقم أو الموضوع..." 
                   className="px-4 py-1.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-950/20"
                 />
                 <button className="bg-red-950 text-[#E6BE8A] px-4 py-1.5 rounded-xl text-sm font-bold shadow-sm">
                   + مراسلة جديدة
                 </button>
              </div>
           </div>

           <div className="overflow-y-auto flex-1">
              <table className="w-full text-right">
                 <thead className="sticky top-0 bg-white border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                       <th className="p-4">المرجع</th>
                       <th className="p-4">النوع / الفئة</th>
                       <th className="p-4">الموضوع</th>
                       <th className="p-4">المصدر / الوجهة</th>
                       <th className="p-4">الحالة</th>
                       <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(item => (
                      <tr 
                         key={item.id} 
                         className="hover:bg-slate-50 transition-colors group cursor-pointer"
                         onClick={() => setSelectedItem(item)}
                      >
                         <td className="p-4 font-mono text-xs font-bold text-slate-500">
                           {item.ref}
                         </td>
                         <td className="p-4">
                           <div className="flex flex-col">
                             <span className={`text-[10px] font-bold ${item.type === 'incoming' ? 'text-blue-600' : 'text-emerald-600'}`}>
                               {item.type === 'incoming' ? '📥 وارد' : '📤 صادر'}
                             </span>
                             <span className="text-xs font-bold text-slate-800">{item.category}</span>
                           </div>
                         </td>
                         <td className="p-4">
                           <p className="text-sm font-bold text-slate-900">{item.subject}</p>
                           <p className="text-[10px] text-slate-400">الأساس: {item.legal_basis}</p>
                         </td>
                         <td className="p-4 text-xs font-bold text-slate-600">
                           {item.sender_recipient}
                         </td>
                         <td className="p-4">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(item.status)}`}>
                             {getStatusLabel(item.status)}
                           </span>
                         </td>
                         <td className="p-4">
                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button title="معاينة" className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">👁️</button>
                               <button title="تحميل PDF" className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100">📄</button>
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           {/* 🔄 Workflow Status Bar */}
           <div className="bg-slate-900 p-4 border-t border-slate-800 flex items-center justify-around">
              {[
                { label: 'تسجيل تلقائي', icon: '📝', step: 1 },
                { label: 'ترقيم ذكي', icon: '🔢', step: 2 },
                { label: 'إحالة داخلية', icon: '🔗', step: 3 },
                { label: 'تحرير الجواب', icon: '✍️', step: 4 },
                { label: 'توقيع إلكتروني', icon: '🔏', step: 5 },
                { label: 'أرشفة نهائية', icon: '🗄️', step: 6 },
              ].map(step => (
                <div key={step.step} className="flex flex-col items-center gap-1 opacity-60">
                   <span className="text-xl">{step.icon}</span>
                   <span className="text-[8px] font-black text-[#E6BE8A] uppercase">{step.label}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Detail Modal Simulation */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
              <div className="bg-red-950 p-8 text-white flex justify-between items-start">
                 <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className="bg-[#E6BE8A] text-red-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                         {selectedItem.ref}
                       </span>
                       <span className="text-red-200 text-xs font-bold">{selectedItem.at}</span>
                    </div>
                    <h2 className="text-2xl font-black">{selectedItem.subject}</h2>
                    <p className="text-red-100 mt-2 opacity-80">الأساس القانوني: {selectedItem.legal_basis}</p>
                 </div>
                 <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-2xl">✕</button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto grid grid-cols-3 gap-8">
                 <div className="col-span-2 space-y-8">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                       <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                          <span>📝</span> محتوى المراسلة / ملخص الطلب
                       </h3>
                       <p className="text-sm text-slate-600 leading-relaxed">
                          بناء على مقتضيات المادة 174 من القانون رقم 16.22 المتعلق بتنظيم مهنة العدالة، 
                          يرجى من المجلس الجهوي تقديم إفادة مفصلة حول الوضعية المهنية المذكورة أعلاه...
                       </p>
                    </div>

                    <div className="space-y-4">
                       <h3 className="font-bold text-slate-800 flex items-center gap-2 px-2">
                          <span>📦</span> المرفقات والوثائق المصاحبة
                       </h3>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 border border-slate-200 rounded-2xl flex items-center justify-between group hover:bg-slate-50 cursor-pointer transition-all">
                             <div className="flex items-center gap-3">
                                <span className="text-2xl">📄</span>
                                <div>
                                   <p className="text-xs font-bold text-slate-800">الطلب الأصلي.pdf</p>
                                   <p className="text-[10px] text-slate-400">2.4 MB</p>
                                </div>
                             </div>
                             <button className="text-slate-300 group-hover:text-red-900">⬇️</button>
                          </div>
                          <div className="p-4 border border-slate-200 rounded-2xl flex items-center justify-between group hover:bg-slate-50 cursor-pointer transition-all">
                             <div className="flex items-center gap-3">
                                <span className="text-2xl">📁</span>
                                <div>
                                   <p className="text-xs font-bold text-slate-800">بطاقة تقنية.pdf</p>
                                   <p className="text-[10px] text-slate-400">540 KB</p>
                                </div>
                             </div>
                             <button className="text-slate-300 group-hover:text-red-900">⬇️</button>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                       <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
                          <span>📡</span> مسار المراسلة (Workflow)
                       </h3>
                       <ul className="space-y-4 relative">
                          <div className="absolute top-2 right-2 bottom-2 w-0.5 bg-emerald-200 border-dashed border-r"></div>
                          <li className="relative pr-6 flex justify-between items-center group">
                             <span className="absolute top-1 right-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm -mr-2"></span>
                             <span className="text-[10px] font-bold text-emerald-800">التسجيل بالسجل</span>
                             <span className="text-[8px] text-emerald-500">تم بنجاح</span>
                          </li>
                          <li className="relative pr-6 flex justify-between items-center group opacity-50">
                             <span className="absolute top-1 right-0 w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-sm -mr-2"></span>
                             <span className="text-[10px] font-bold text-slate-800">الإحالة على اللجنة</span>
                             <span className="text-[8px] text-slate-500">بانتظار التأشير</span>
                          </li>
                       </ul>
                    </div>

                    <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
                       <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                          <span>🔏</span> التوقيع الإلكتروني للمجلس
                       </h3>
                       <div className="p-4 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md">
                          <p className="text-[10px] text-slate-400 leading-relaxed italic">
                             معزز بتشفير SHA-256. 
                             توقيع رئيس المجلس الجهوي المعتمد لدى الهيئة الوطنية.
                          </p>
                          <button className="mt-4 w-full bg-[#E6BE8A] text-red-950 py-2 rounded-xl text-[10px] font-black uppercase hover:scale-95 transition-transform">
                             توقيع وإرسال الآن
                          </button>
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
