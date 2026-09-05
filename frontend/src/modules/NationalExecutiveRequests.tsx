import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { OrnateScrollBanner } from '../components/common/OrnateScrollBanner';

type RequestStatus = 'جديد' | 'قيد المعالجة' | 'مكتمل' | 'مرفوض' | 'طلب استكمال';

type NationalRequestType = 
  | 'نقل مكتب' 
  | 'إعفاء' 
  | 'إشهاد خارج الدائرة' 
  | 'تعديل بيانات مهنية' 
  | 'طلب رخصة مؤقتة'
  | 'استثناء تنظيمي';

interface NationalRequest {
  id: string;
  type: NationalRequestType;
  legalBasis: string;
  submittedAt: string;
  status: RequestStatus;
  processingDays: number;
  appealable: boolean;
  notaryName: string;
  description: string;
}

const SEED_REQUESTS: NationalRequest[] = [
  {
    id: 'HN-TREQ-2026-0001',
    type: 'نقل مكتب',
    legalBasis: 'المادة 49',
    submittedAt: '2026-01-15',
    status: 'مكتمل',
    processingDays: 14,
    appealable: true,
    notaryName: 'أحمد العمراني',
    description: 'طلب انتقال من دائرة نفوذ محكمة الاستئناف بالرباط إلى الدار البيضاء.'
  },
  {
    id: 'HN-TREQ-2026-0002',
    type: 'إشهاد خارج الدائرة',
    legalBasis: 'المادة 171',
    submittedAt: '2026-01-20',
    status: 'قيد المعالجة',
    processingDays: 5,
    appealable: false,
    notaryName: 'أحمد العمراني',
    description: 'طلب ترخيص استثنائي لتلقي إشهاد خارج دائرة الاختصاص المكاني.'
  },
  {
    id: 'HN-TREQ-2026-0003',
    type: 'تعديل بيانات مهنية',
    legalBasis: 'المادة 169',
    submittedAt: '2026-01-25',
    status: 'جديد',
    processingDays: 1,
    appealable: true,
    notaryName: 'أحمد العمراني',
    description: 'تغيير العنوان المهني للمكتب العدلي.'
  }
];

export const NationalExecutiveRequests: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new-request' | 'tracking'>('dashboard');
  const [requests, setRequests] = useState<NationalRequest[]>(SEED_REQUESTS);
  const [selectedReq, setSelectedReq] = useState<NationalRequest | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'نقل مكتب' as NationalRequestType,
    description: '',
    legalBasis: 'المقتضيات الانتقالية - المادة 49'
  });

  const getLegalBasis = (type: NationalRequestType) => {
    const map = {
      'نقل مكتب': 'المادة 49',
      'إعفاء': 'المادة 172',
      'إشهاد خارج الدائرة': 'المادة 171',
      'تعديل بيانات مهنية': 'المادة 169',
      'طلب رخصة مؤقتة': 'المادة 170',
      'استثناء تنظيمي': 'المادة 174'
    };
    return map[type] || 'المقتضيات العامة';
  };

  const handleSendRequest = () => {
    if (!formData.description.trim()) {
      alert('يرجى كتابة مضمون الطلب وتوضيحه.');
      return;
    }

    const newReq: NationalRequest = {
      id: `HN-TREQ-2026-${String(requests.length + 1).padStart(4, '0')}`,
      type: formData.type,
      legalBasis: getLegalBasis(formData.type),
      submittedAt: new Date().toISOString().split('T')[0],
      status: 'جديد',
      processingDays: 0,
      appealable: true,
      notaryName: user?.full_name || 'عدل ممارس',
      description: formData.description
    };

    setRequests([newReq, ...requests]);
    setFormData({ type: 'نقل مكتب', description: '', legalBasis: 'المادة 49' });
    setActiveTab('dashboard');
    // Simulated success feedback
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl z-[100] font-black animate-bounce';
    toast.innerText = `✓ تم إرسال طلب ${formData.type} بنجاح. رقم المرجع: ${newReq.id}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  const stats = useMemo(() => ({
    total: requests.length,
    new: requests.filter(r => r.status === 'جديد').length,
    processing: requests.filter(r => r.status === 'قيد المعالجة').length,
    completed: requests.filter(r => r.status === 'مكتمل').length,
    rejected: requests.filter(r => r.status === 'مرفوض').length,
  }), [requests]);

  const StatusBadge = ({ status }: { status: RequestStatus }) => {
    const colors = {
      'جديد': 'bg-blue-50 text-blue-700 border-blue-200 shadow-blue-100',
      'قيد المعالجة': 'bg-amber-50 text-amber-700 border-amber-200 shadow-amber-100',
      'مكتمل': 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100',
      'مرفوض': 'bg-red-50 text-red-700 border-red-200 shadow-red-100',
      'طلب استكمال': 'bg-purple-50 text-purple-700 border-purple-200 shadow-purple-100',
    };
    return (
      <span className={`px-4 py-1 rounded-full text-[10px] font-black border shadow-sm ${colors[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Cinematic Header */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#5a0c0b] to-[#2d0606] p-12 text-white shadow-2xl border-b-8 border-[#E6BE8A]">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none select-none overflow-hidden">
           <div className="text-[25rem] -mt-20 -ml-20 rotate-12">🏛️</div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="text-right">
            <h1 className="text-4xl font-black font-amiri mb-3 tracking-tight">الطلبات الموجهة للمكتب التنفيذي</h1>
            <p className="text-[#E6BE8A] text-lg font-bold opacity-80 leading-relaxed max-w-2xl">
              نظام تدبير الطلبات الموجهة للهيئة الوطنية للعدول - التواصل المباشر مع المجلس التنفيذي.
            </p>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => setActiveTab('new-request')}
               className="px-8 py-4 bg-[#E6BE8A] text-[#5a0c0b] rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-all flex items-center gap-2"
             >
               <span>➕</span> إنشاء طلب جديد
             </button>
             <button 
               onClick={() => setActiveTab('dashboard')}
               className="px-8 py-4 bg-white/10 text-white rounded-2xl font-black text-sm border border-white/20 hover:bg-white/20 transition-all"
             >
               لوحة البيانات
             </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2">إجمالي الطلبات</p>
              <p className="text-3xl font-black text-slate-900">{stats.total}</p>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-r-4 border-blue-500">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pb-2">طلبات جديدة</p>
              <p className="text-3xl font-black text-blue-700">{stats.new}</p>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-r-4 border-amber-500">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest pb-2">قيد المعالجة</p>
              <p className="text-3xl font-black text-amber-700">{stats.processing}</p>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-r-4 border-emerald-500">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pb-2">مكتملة</p>
              <p className="text-3xl font-black text-emerald-700">{stats.completed}</p>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-r-4 border-red-500">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest pb-2">مرفوضة</p>
              <p className="text-3xl font-black text-red-700">{stats.rejected}</p>
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Request List */}
         <div className="lg:col-span-2 space-y-6">
            {activeTab === 'dashboard' && (
              <>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                   <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                     <span>📋</span> سجل الطلبات الأخيرة
                   </h3>
                   <div className="space-y-4">
                      {requests.map(req => (
                        <div 
                          key={req.id} 
                          onClick={() => { setSelectedReq(req); setActiveTab('tracking'); }}
                          className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border border-slate-100 hover:border-[#E6BE8A] hover:shadow-lg transition-all cursor-pointer group relative bg-slate-50/50"
                        >
                           <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                 {req.type === 'نقل مكتب' ? '🏢' : '📜'}
                              </div>
                              <div>
                                 <div className="flex items-center gap-2 mb-1">
                                    <span className="font-sans text-[10px] font-black text-slate-400">#{req.id}</span>
                                    <StatusBadge status={req.status} />
                                 </div>
                                 <h4 className="font-black text-slate-800 font-amiri text-lg leading-tight">{req.type}</h4>
                                 <p className="text-xs text-slate-500 font-bold mt-1">تاريخ الإرسال: {req.submittedAt} • {req.legalBasis}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4 mt-4 md:mt-0">
                              <div className="text-left">
                                 <p className="text-[10px] font-black text-slate-400 uppercase">مدة المعالجة</p>
                                 <p className="text-sm font-black text-slate-700">{req.processingDays} أيام</p>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#5a0c0b] transition-colors">
                                 ←
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </>
            )}

            {activeTab === 'new-request' && (
              <div className="bg-white rounded-[3rem] border border-slate-200 p-12 shadow-sm animate-in zoom-in-95 duration-500">
                 <h3 className="text-3xl font-black text-slate-900 mb-8 font-amiri border-b border-slate-100 pb-6">إنشاء طلب جديد للهيئة الوطنية</h3>
                 <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">نوع الطلب</label>
                          <select 
                            className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#5a0c0b] transition-all appearance-none cursor-pointer"
                            value={formData.type}
                            onChange={(e) => setFormData(p => ({ ...p, type: e.target.value as NationalRequestType }))}
                          >
                             <option value="نقل مكتب">نقل مكتب</option>
                             <option value="إعفاء">إعفاء</option>
                             <option value="إشهاد خارج الدائرة">إشهاد خارج الدائرة</option>
                             <option value="تعديل بيانات مهنية">تعديل بيانات مهنية</option>
                             <option value="طلب رخصة مؤقتة">طلب رخصة مؤقتة</option>
                             <option value="استثناء تنظيمي">استثناء تنظيمي</option>
                          </select>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الأساس القانوني (تلقائي)</label>
                          <div className="w-full bg-slate-100 border-2 border-slate-100 p-5 rounded-2xl font-black text-[#5a0c0b] border-[#5a0c0b]/20">
                             {getLegalBasis(formData.type)}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مضمون الطلب والتبريرات</label>
                       <textarea 
                         rows={6} 
                         className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] font-bold text-slate-700 outline-none focus:border-[#5a0c0b] transition-all text-lg font-amiri leading-loose placeholder:text-slate-300" 
                         placeholder="يرجى شرح دوافع الطلب بوضوح..."
                         value={formData.description}
                         onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                       ></textarea>
                    </div>

                    <div className="bg-[#5a0c0b]/5 p-8 rounded-[2rem] border border-dashed border-[#5a0c0b]/20 flex items-start gap-6">
                       <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">📎</div>
                       <div className="flex-1">
                          <h4 className="font-black text-[#5a0c0b] mb-1">المرفقات والمستندات</h4>
                          <p className="text-xs text-slate-500 font-bold mb-4">يجب إرفاق نسخ من البطاقة الوطنية، صور المكتب، أو أي وثائق تدعم الطلب (PDF, JPG).</p>
                          <button type="button" className="px-6 py-2 bg-[#5a0c0b] text-white rounded-xl text-[10px] font-black">تحميل الملفات</button>
                       </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                       <button type="button" onClick={() => setActiveTab('dashboard')} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all">إلغاء الطلب</button>
                       <button 
                         type="button"
                         onClick={handleSendRequest}
                         className="px-12 py-4 bg-[#5a0c0b] text-white rounded-2xl font-black text-xs shadow-xl shadow-red-900/20 hover:bg-black transition-all group overflow-hidden relative"
                       >
                         <span className="relative z-10 flex items-center gap-2">
                           <span>⚖️</span> تأكيد وإرسال للهيئة
                         </span>
                         <div className="absolute inset-0 bg-white/10 translate-y-12 group-hover:translate-y-0 transition-transform"></div>
                       </button>
                    </div>
                 </form>
              </div>
            )}

            {activeTab === 'tracking' && selectedReq && (
              <div className="bg-white rounded-[3rem] border border-slate-200 p-12 shadow-sm animate-in slide-in-from-left duration-500">
                 <div className="flex justify-between items-start mb-10 border-b border-slate-100 pb-8">
                    <div>
                      <span className="bg-[#E6BE8A] text-[#5a0c0b] px-4 py-1 rounded-full text-[10px] font-black mb-3 inline-block tracking-widest font-sans">{selectedReq.id}</span>
                      <h3 className="text-3xl font-black text-slate-900 font-amiri">{selectedReq.type}</h3>
                      <p className="text-slate-500 font-bold mt-2">الحالة الحالية: <span className="text-slate-900">{selectedReq.status}</span></p>
                    </div>
                    <button onClick={() => setActiveTab('dashboard')} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">✕</button>
                 </div>

                 {/* Tracking Map - Visual Flow */}
                 <div className="space-y-12 mb-16 relative">
                    <div className="absolute right-6 top-8 bottom-8 w-1 bg-slate-100 z-0"></div>
                    
                    {[
                      { step: '1', title: 'إنشاء الطلب عبر بوابة العدل', content: 'تم اختيار نوع الطلب وتعبئة البيانات والمرفقات وتحديد السند القانوني.', status: 'completed', icon: '📝' },
                      { step: '2', title: 'نظام استقبال الطلبات (Intake)', content: 'توليد الرقم المرجعي الفريد وتسجيل الوقت وتصنيف الطلب قانونياً.', status: 'completed', icon: '📥' },
                      { step: '3', title: 'التحقق الإداري بالمجلس التنفيذي', content: 'مراجعة اكتمال الحقول والمرفقات والتحقق من أهلية العدل المرسل.', status: selectedReq.status === 'جديد' ? 'active' : 'completed', icon: '🔍' },
                      { step: '4', title: 'المداولة واتخاذ القرار', content: 'إحالة الطلب للجنة المختصة (اللجنة التنظيمية) للمداولة السرية وتوثيق المحضر.', status: selectedReq.status === 'قيد المعالجة' ? 'active' : (selectedReq.status === 'مكتمل' ? 'completed' : 'pending'), icon: '⚖️' },
                      { step: '5', title: 'تحرير القرار وإرسال الرد', content: 'إعداد القرار النهائي PDF وأرشفته وإشعار العدل تلقائياً بالنتيجة.', status: selectedReq.status === 'مكتمل' ? 'completed' : 'pending', icon: '🏁' },
                    ].map((flow, idx) => (
                      <div key={idx} className="relative z-10 flex gap-8">
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg text-lg ${
                            flow.status === 'completed' ? 'bg-emerald-600 text-white' : 
                            flow.status === 'active' ? 'bg-[#5a0c0b] text-white animate-pulse' : 
                            'bg-slate-100 text-slate-300'
                         }`}>
                           {flow.status === 'completed' ? '✓' : flow.step}
                         </div>
                         <div className={`flex-1 p-6 rounded-2xl border ${
                           flow.status === 'active' ? 'bg-[#5a0c0b]/5 border-[#5a0c0b]/20 shadow-lg' : 'bg-slate-50/50 border-slate-100'
                         }`}>
                           <div className="flex items-center gap-3 mb-2">
                             <span className="text-xl">{flow.icon}</span>
                             <h4 className={`text-lg font-black font-amiri ${flow.status === 'active' ? 'text-[#5a0c0b]' : 'text-slate-800'}`}>{flow.title}</h4>
                           </div>
                           <p className="text-xs text-slate-500 font-bold leading-relaxed">{flow.content}</p>
                         </div>
                      </div>
                    ))}
                 </div>

                 {/* Legal Map Detail */}
                 <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 relative overflow-hidden group">
                    <div className="absolute -left-10 -bottom-10 text-[15rem] opacity-5 rotate-12 transition-transform duration-700 group-hover:rotate-45">⚖️</div>
                    <h4 className="text-xl font-black font-amiri mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
                      <span className="text-[#E6BE8A]"> الخريطة القانونية للطلب</span>
                    </h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-[#E6BE8A] uppercase tracking-widest">نوع الطلب</p>
                          <p className="font-black text-sm">{selectedReq.type}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-[#E6BE8A] uppercase tracking-widest">المادة القانونية</p>
                          <p className="font-black text-sm">{selectedReq.legalBasis}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-[#E6BE8A] uppercase tracking-widest">الجهة المختصة</p>
                          <p className="font-black text-sm">المجلس التنفيذي للهيئة</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-[#E6BE8A] uppercase tracking-widest">أجل المعالجة</p>
                          <p className="font-black text-sm">15 يوماً عمل</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-[#E6BE8A] uppercase tracking-widest">إمكانية الطعن</p>
                          <p className="font-black text-sm">{selectedReq.appealable ? 'نعم (بناءً على المادة 174)' : 'غير قابل للطعن'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-[#E6BE8A] uppercase tracking-widest">القرار النهائي</p>
                          <p className="font-black text-sm">{selectedReq.status === 'مكتمل' ? 'تمت الموافقة' : 'قيد المداولة'}</p>
                       </div>
                    </div>
                    {selectedReq.status === 'مكتمل' && (
                      <div className="mt-10 flex justify-end">
                         <button className="px-10 py-4 bg-[#E6BE8A] text-[#5a0c0b] rounded-2xl font-black text-xs shadow-xl hover:scale-105 transition-all">
                           📥 تحميل القرار الرسمي (PDF)
                         </button>
                      </div>
                    )}
                 </div>
              </div>
            )}
         </div>

         {/* Sidebar / Tips */}
         <div className="space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-2 h-full bg-[#5a0c0b]"></div>
               <h4 className="text-xl font-black font-amiri text-slate-900 mb-6 flex items-center gap-3">
                 <span>💡</span> ملاحظات التصميم
               </h4>
               <ul className="space-y-6">
                  <li className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">🎨</div>
                     <div>
                        <p className="text-sm font-black text-slate-800">ألوان متدرجة ذكية</p>
                        <p className="text-xs text-slate-500 font-bold mt-1">يتم تمييز الحالات (جديد، قيد المعالجة، مكتمل) بألوان تعزز الإدراك البصري الفوري.</p>
                     </div>
                  </li>
                  <li className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">🔢</div>
                     <div>
                        <p className="text-sm font-black text-slate-800">تصنيف قانوني تلقائي</p>
                        <p className="text-xs text-slate-500 font-bold mt-1">يتم ربط كل طلب بالمادة القانونية المختصة والمجلس التنفيذي آلياً.</p>
                     </div>
                  </li>
                  <li className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">🔔</div>
                     <div>
                        <p className="text-sm font-black text-slate-800">تنبيهات فورية</p>
                        <p className="text-xs text-slate-500 font-bold mt-1">إشعارات تلقائية عند تحديث القرار أو تجاوز مدة المعالجة القانونية.</p>
                     </div>
                  </li>
               </ul>
            </div>

            <div className="bg-gradient-to-br from-[#5a0c0b] to-[#800020] rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
               <div className="absolute -right-6 -top-6 text-7xl opacity-10 rotate-12 transition-transform duration-700 group-hover:rotate-0">🏛️</div>
               <h4 className="text-lg font-black font-amiri mb-4 text-[#E6BE8A] border-b border-white/10 pb-4">الهيئة الوطنية</h4>
               <p className="text-xs font-bold leading-relaxed opacity-80">
                 يهدف هذا النظام إلى مكننة العلاقة بين العدل والمكتب التنفيذي، لضمان الشفافية وتسريع البت في طلبات الانتقال والتراخيص المهنية وفق المقتضيات القانونية الجديدة.
               </p>
               <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-white/5">👤</div>
                  <div>
                    <p className="text-[10px] font-black text-[#E6BE8A] uppercase">السيد رئيس الهيئة</p>
                    <p className="text-xs font-bold">المكتب التنفيذي المركزي</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
