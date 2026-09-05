import React, { useState, useMemo } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function DailyLedgerModule() {
  const { sessionToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'stats'>('form');
  const [operationMode, setOperationMode] = useState<'certificate' | 'copy' | 'both' | null>(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState<any>(null);
  const [pendingEntry, setPendingEntry] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);

  const entriesQuery = trpc.dailyLedger.getRecentEntries.useQuery(
    { sessionToken: sessionToken || '', date: activeTab === 'list' ? filterDate : undefined },
    { enabled: !!sessionToken }
  );

  const statsQuery = trpc.dailyLedger.getStats.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken }
  );

  const addEntryMutation = trpc.dailyLedger.addEntry.useMutation({
    onSuccess: () => {
      entriesQuery.refetch();
      statsQuery.refetch();
    }
  });

  const addCorrectionMutation = trpc.dailyLedger.addCorrection.useMutation({
    onSuccess: () => {
        alert('تم تسجيل عملية التصحيح المحاسبي بنجاح');
        setShowCorrectionForm(false);
        setSelectedEntryForDetails(null);
        entriesQuery.refetch();
        statsQuery.refetch();
    }
  });

  const [formData, setFormData] = useState({
    family_name: '',
    personal_name: '',
    id_card: '',
    judge_auth_number: '',
    judge_auth_date: '',
    adl1_number: '',
    adl1_volume: '',
    adl1_page: '',
    reception_date: '',
    certificate_type: 'الزواج',
    certificate_amount: 0,
    receipt_number: '',
    copy_type: 'نسخة الزواج',
    copy_amount: 0,
    confirmed_tariff: false,
    delivered_copy: false,
    same_day: true
  });

  const [correctionData, setCorrectionData] = useState({
    amount_received: 0,
    notes: ''
  });

  const handleModeSelection = (mode: 'certificate' | 'copy' | 'both') => {
    setOperationMode(mode);
    setFormData(prev => ({
        ...prev,
        certificate_amount: 0,
        copy_amount: 0,
        receipt_number: ''
    }));
  };

  const totals = useMemo(() => {
    if (!entriesQuery.data) return 0;
    return entriesQuery.data.reduce((sum: number, e: any) => sum + Number(e.amount_received), 0);
  }, [entriesQuery.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'form') return;
    const total = (operationMode !== 'copy' ? formData.certificate_amount : 0) + (operationMode !== 'certificate' ? formData.copy_amount : 0);
    if (total <= 0) { alert('يرجى إدخال قيمة العمليات'); return; }
    setPendingEntry(formData);
    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    if (!pendingEntry) return;
    try {
        if (operationMode !== 'copy' && pendingEntry.certificate_amount > 0) {
            await addEntryMutation.mutateAsync({
                sessionToken: sessionToken || '',
                entry: {
                    family_name: pendingEntry.family_name,
                    personal_name: pendingEntry.personal_name,
                    id_card: pendingEntry.id_card,
                    certificate_type: pendingEntry.certificate_type,
                    operation_type: 'Original',
                    amount_received: Number(pendingEntry.certificate_amount),
                    receipt_number: pendingEntry.receipt_number,
                    adl1_number: pendingEntry.adl1_number,
                    adl1_volume: pendingEntry.adl1_volume,
                    adl1_page: pendingEntry.adl1_page,
                    reception_date: pendingEntry.reception_date,
                    questions_responses: { confirmed_tariff: pendingEntry.confirmed_tariff, delivered_copy: pendingEntry.delivered_copy, same_day: pendingEntry.same_day }
                }
            });
        }
        if (operationMode !== 'certificate' && pendingEntry.copy_amount > 0) {
            await addEntryMutation.mutateAsync({
                sessionToken: sessionToken || '',
                entry: {
                    family_name: pendingEntry.family_name,
                    personal_name: pendingEntry.personal_name,
                    id_card: pendingEntry.id_card,
                    certificate_type: pendingEntry.certificate_type,
                    operation_type: 'Copy',
                    amount_received: Number(pendingEntry.copy_amount),
                    receipt_number: operationMode === 'both' ? pendingEntry.receipt_number + '-COPY' : pendingEntry.receipt_number,
                    copy_type: pendingEntry.copy_type,
                    judge_auth_number: pendingEntry.judge_auth_number,
                    judge_auth_date: pendingEntry.judge_auth_date,
                    questions_responses: { confirmed_tariff: pendingEntry.confirmed_tariff, delivered_copy: pendingEntry.delivered_copy, same_day: pendingEntry.same_day }
                }
            });
        }
        setShowConfirmModal(false);
        setOperationMode(null);
        setActiveTab('list');
        setFormData({ family_name: '', personal_name: '', id_card: '', judge_auth_number: '', judge_auth_date: '', adl1_number: '', adl1_volume: '', adl1_page: '', reception_date: '', certificate_type: 'الزواج', certificate_amount: 0, receipt_number: '', copy_type: 'نسخة الزواج', copy_amount: 0, confirmed_tariff: false, delivered_copy: false, same_day: true });
    } catch (err: any) { alert(err.message); }
  };

  const filteredEntries = useMemo(() => {
    if (!entriesQuery.data) return [];
    return entriesQuery.data.filter((e: any) => e.family_name?.includes(searchTerm) || e.personal_name?.includes(searchTerm) || e.receipt_number?.includes(searchTerm));
  }, [entriesQuery.data, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 shadow-xl flex justify-between items-center border-b-4 border-emerald-500">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg">
            <span className="text-3xl text-white"></span>
          </div>
          <div>
            <h1 className="text-3xl font-black font-maghribi">سجل البيانات للعمليات الحسابية الالكتروني</h1>
          </div>
        </div>
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button onClick={() => { setActiveTab('form'); setOperationMode(null); }} className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'form' ? 'bg-emerald-600 shadow-lg text-white' : 'text-slate-400 hover:text-white'}`}> تسجيل جديد</button>
          <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'list' ? 'bg-emerald-600 shadow-lg text-white' : 'text-slate-400 hover:text-white'}`}> سجل اللائحة</button>
          <button onClick={() => setActiveTab('stats')} className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'stats' ? 'bg-emerald-600 shadow-lg text-white' : 'text-slate-400 hover:text-white'}`}> الإحصائيات</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-slate-50 to-slate-100">
        {activeTab === 'form' && !operationMode && (
            <div className="max-w-4xl mx-auto py-20 space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-black text-slate-900 font-maghribi">ما هي العملية التي تريد تسجيلها الآن</h2>
                    <p className="text-slate-500 font-bold">يرجى اختيار نوع العملية للمتابعة في إدخال البيانات</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
                    <button onClick={() => handleModeSelection('certificate')} className="group bg-white p-10 rounded-[3rem] shadow-xl border-b-8 border-emerald-500 hover:scale-105 transition-all flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-5xl group-hover:bg-emerald-500 group-hover:text-white transition-all"></div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-slate-900">تلقي أصل</h3>
                            <p className="text-sm text-slate-400 mt-2 font-bold">تسجيل رسم أصلي أو شهادة جديدة</p>
                        </div>
                    </button>
                    <button onClick={() => handleModeSelection('copy')} className="group bg-white p-10 rounded-[3rem] shadow-xl border-b-8 border-blue-600 hover:scale-105 transition-all flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-5xl group-hover:bg-blue-600 group-hover:text-white transition-all"></div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-slate-900">استخراج نسخة</h3>
                            <p className="text-sm text-slate-400 mt-2 font-bold">تسجيل طلب نسخة عادية أو تنفيذية</p>
                        </div>
                    </button>
                    <button onClick={() => handleModeSelection('both')} className="group bg-white p-10 rounded-[2.5rem] shadow-xl border-b-8 border-amber-500 hover:scale-105 transition-all flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center text-5xl group-hover:bg-amber-500 group-hover:text-white transition-all"></div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-slate-900">عملية مزدوجة</h3>
                            <p className="text-sm text-slate-400 mt-2 font-bold">تلقي أصل مع استخراج نسخة فورية</p>
                        </div>
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'form' && operationMode && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden relative">
                <button onClick={() => setOperationMode(null)} className="absolute top-6 left-8 bg-slate-100 hover:bg-slate-200 text-slate-500 px-4 py-2 rounded-xl text-xs font-black transition-all"> تغيير النوع</button>

                <div className="bg-slate-900 px-8 py-10 flex justify-between items-center border-b border-white/5">
                   <div className="text-right">
                        <h2 className="text-2xl font-black text-white">إدخال بيانات {operationMode === 'certificate' ? 'الأصل' : operationMode === 'copy' ? 'النسخة' : 'العملية المزدوجة'}</h2>
                        <p className="text-slate-400 text-sm mt-1">تأكد من رقم التوصيل والمبالغ المحصلة</p>
                   </div>
                   <div className="bg-emerald-500/10 text-emerald-500 px-6 py-2 rounded-full border border-emerald-500/20 font-black text-sm">
                        {format(new Date(), 'EEEE dd MMMM yyyy', { locale: ar })}
                   </div>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-12 text-right">
                   {/* Identity Section */}
                    <div className="bg-slate-50/50 p-8 rounded-[2rem] border-2 border-slate-100">
                        <div className="flex items-center gap-3 mb-8 justify-end">
                            <h3 className="font-black text-slate-800 text-lg">المعلومات الأساسية للمتعاقد</h3>
                            <span className="text-2xl"></span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <label className="block text-sm font-black text-slate-700 mr-1">الاسم العائلي *</label>
                                <input required className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all" placeholder="أدخل الاسم العائلي..." value={formData.family_name} onChange={e => setFormData({...formData, family_name: e.target.value})} />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-sm font-black text-slate-700 mr-1">الاسم الشخصي *</label>
                                <input required className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all" placeholder="أدخل الاسم الشخصي..." value={formData.personal_name} onChange={e => setFormData({...formData, personal_name: e.target.value})} />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-sm font-black text-slate-700 mr-1">رقم البطاقة الوطنية (إختياري)</label>
                                <input className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all" placeholder="مثلا: AB123456" value={formData.id_card} onChange={e => setFormData({...formData, id_card: e.target.value})} />
                            </div>
                            
                            {(operationMode === 'certificate' || operationMode === 'both') ? (
                                <>
                                    <div className="space-y-3">
                                        <label className="block text-sm font-black text-slate-700 mr-1">سجل بينات العدل الاول (رقمه)</label>
                                        <input className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all" placeholder="الرقم..." value={formData.adl1_number} onChange={e => setFormData({...formData, adl1_number: e.target.value})} />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-sm font-black text-slate-700 mr-1">عدده</label>
                                        <input className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all" placeholder="العدد..." value={formData.adl1_volume} onChange={e => setFormData({...formData, adl1_volume: e.target.value})} />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-sm font-black text-slate-700 mr-1">صحيفته</label>
                                        <input className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all" placeholder="الصفحة..." value={formData.adl1_page} onChange={e => setFormData({...formData, adl1_page: e.target.value})} />
                                    </div>
                                    <div className="space-y-3 lg:col-span-3">
                                        <label className="block text-sm font-black text-slate-700 mr-1">تاريخ تلقي الشهادة</label>
                                        <input type="date" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all" value={formData.reception_date} onChange={e => setFormData({...formData, reception_date: e.target.value})} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <label className="block text-sm font-black text-slate-700 mr-1">الرقم التسلسلي للاذن الصادر عن القاضي</label>
                                        <input className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all" placeholder="رقم الإذن..." value={formData.judge_auth_number} onChange={e => setFormData({...formData, judge_auth_number: e.target.value})} />
                                    </div>
                                    <div className="space-y-3 lg:col-span-2">
                                        <label className="block text-sm font-black text-slate-700 mr-1">تاريخ منح الاذن</label>
                                        <input type="date" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all" value={formData.judge_auth_date} onChange={e => setFormData({...formData, judge_auth_date: e.target.value})} />
                                    </div>
                                </>
                            )}
                        </div>
                   </div>

                   {/* Operation Details */}
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {(operationMode === 'certificate' || operationMode === 'both') && (
                            <div className="bg-emerald-50/50 p-8 rounded-[2rem] border-2 border-emerald-100 space-y-6">
                                <div className="flex items-center gap-3 border-b border-emerald-100 pb-4 justify-end">
                                    <h4 className="font-black text-emerald-900">تلقي شهادة / رسم أصلي</h4>
                                    <span className="bg-white p-2 rounded-xl text-xl shadow-sm"></span>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-emerald-700 mr-1 uppercase">نوع الشهادة الأصلية</label>
                                    <select className="w-full bg-white border-2 border-emerald-200 rounded-2xl px-4 py-4 font-bold focus:border-emerald-500 outline-none" value={formData.certificate_type} onChange={e => setFormData({...formData, certificate_type: e.target.value})}>
                                        <option>الزواج</option><option>الطلاق</option><option>الاملاك</option><option>باقي الوثائق</option><option>التركات</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-emerald-700 mr-1 uppercase">القيمة (DH)</label>
                                        <input type="number" className="w-full bg-white border-2 border-emerald-200 rounded-2xl px-5 py-4 font-mono font-black text-xl text-emerald-700 focus:border-emerald-500 outline-none text-left" value={formData.certificate_amount} onChange={e => setFormData({...formData, certificate_amount: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-emerald-700 mr-1 uppercase">رقم التوصيل</label>
                                        <input className="w-full bg-white border-2 border-emerald-200 rounded-2xl px-5 py-4 font-mono font-black text-xl text-amber-700 focus:border-emerald-500 outline-none text-left" placeholder="0000" value={formData.receipt_number} onChange={e => setFormData({...formData, receipt_number: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(operationMode === 'copy' || operationMode === 'both') && (
                            <div className="bg-blue-50/50 p-8 rounded-[2rem] border-2 border-blue-100 space-y-6">
                                <div className="flex items-center gap-3 border-b border-blue-100 pb-4 justify-end">
                                    <h4 className="font-black text-blue-900">استخراج نسخة أو نظير</h4>
                                    <span className="bg-white p-2 rounded-xl text-xl shadow-sm"></span>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-blue-700 mr-1 uppercase">نوع النسخة / النظير</label>
                                    <select className="w-full bg-white border-2 border-blue-200 rounded-2xl px-4 py-4 font-bold focus:border-blue-500 outline-none" value={formData.copy_type} onChange={e => setFormData({...formData, copy_type: e.target.value})}>
                                        <option value="نسخة الزواج">نسخة الزواج</option>
                                        <option value="نسخة الطلاق">نسخة الطلاق</option>
                                        <option value="نسخة الاملاك">نسخة الاملاك</option>
                                        <option value="باقي الوثائق">باقي الوثائق</option>
                                        <option value="نسخة التركات">نسخة التركات</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-blue-700 mr-1 uppercase">قيمة النسخة (DH)</label>
                                        <input type="number" className="w-full bg-white border-2 border-blue-200 rounded-2xl px-5 py-4 font-mono font-black text-xl text-blue-700 focus:border-blue-500 outline-none text-left" value={formData.copy_amount} onChange={e => setFormData({...formData, copy_amount: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-blue-700 mr-1 uppercase">رقم التوصيل</label>
                                        <input className="w-full bg-white border-2 border-blue-200 rounded-2xl px-5 py-4 font-mono font-black text-xl text-amber-700 focus:border-emerald-500 outline-none text-left" placeholder="0000" value={operationMode === 'copy' ? formData.receipt_number : (formData.receipt_number ? formData.receipt_number + '-COPY' : '')} readOnly={operationMode === 'both'} onChange={e => setFormData({...formData, receipt_number: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        )}
                   </div>

                   {/* Checklist */}
                   <div className="bg-slate-900 rounded-[2rem] p-8 space-y-8 shadow-2xl">
                        <div className="flex items-center gap-3 justify-end">
                            <h3 className="font-black text-white text-lg">مسار التدقيق والرقابة (Checklist)</h3>
                            <span className="text-2xl"></span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${formData.confirmed_tariff ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`} onClick={() => setFormData({...formData, confirmed_tariff: !formData.confirmed_tariff})}>
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.confirmed_tariff ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                                    {formData.confirmed_tariff && <span className="text-white text-xs font-black"></span>}
                                </div>
                                <label className="text-xs font-bold text-slate-300">مطابقة التعريفة القانونية</label>
                            </div>
                            <div className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${formData.delivered_copy ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`} onClick={() => setFormData({...formData, delivered_copy: !formData.delivered_copy})}>
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.delivered_copy ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                                    {formData.delivered_copy && <span className="text-white text-xs font-black"></span>}
                                </div>
                                <label className="text-xs font-bold text-slate-300">تم تسليم الوثيقة للمتعاقد</label>
                            </div>
                            <div className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${formData.same_day ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`} onClick={() => setFormData({...formData, same_day: !formData.same_day})}>
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.same_day ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                                    {formData.same_day && <span className="text-white text-xs font-black"></span>}
                                </div>
                                <label className="text-xs font-bold text-slate-300">التسجيل في نفس اليوم</label>
                            </div>
                        </div>
                   </div>

                   <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] text-xl font-black shadow-2xl hover:bg-emerald-700 transition-all active:scale-[0.98]">تأكيد وحفظ في السجل اليومي</button>
                </form>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
           <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500">
               <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 gap-4">
                   <div className="flex gap-4 w-full md:w-auto">
                        <input type="date" className="bg-slate-50 border-2 border-slate-200 rounded-xl px-5 py-2.5 font-black text-slate-800 focus:outline-none focus:border-emerald-500 transition-all flex-1" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                   </div>
                   <div className="relative w-full md:w-96">
                        <input placeholder="بحث بالاسم أو رقم التوصيل..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-12 py-3 font-bold text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-sm text-right" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        <span className="absolute right-4 top-3.5 text-lg"></span>
                   </div>
               </div>

               <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto text-right">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-right">الرقم العام</th>
                                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-right">صاحب الشهادة</th>
                                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-center">النوع</th>
                                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-center">العملية</th>
                                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-center">القيمة (DH)</th>
                                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-center">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {entriesQuery.isLoading ? (
                                    <tr><td colSpan={6} className="py-20 text-center font-black animate-pulse text-slate-400">جاري تحميل البيانات...</td></tr>
                                ) : filteredEntries.length === 0 ? (
                                    <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-bold italic">لا توجد سجلات في هذا التاريخ</td></tr>
                                ) : filteredEntries.map((e: any) => (
                                    <tr key={e.id} className={`hover:bg-slate-50/80 transition-all group ${e.is_correction ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-8 py-6 font-mono font-black text-slate-400">#{e.serial_number}</td>
                                        <td className="px-8 py-6 font-black text-slate-800">
                                            <div>{e.family_name} {e.personal_name}</div>
                                            <div className="text-[9px] text-slate-400">توقيت الإدخال: {e.entry_time}</div>
                                        </td>
                                        <td className="px-8 py-6 text-center font-bold text-slate-600">{e.certificate_type}</td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${e.operation_type === 'Original' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                                {e.operation_type === 'Original' ? ' تلقي أصل' : ' نسخة / نظير'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center font-mono font-black text-slate-900 border-x border-slate-50">{Number(e.amount_received).toLocaleString()}</td>
                                        <td className="px-8 py-6 text-center">
                                            <button onClick={() => setSelectedEntryForDetails(e)} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-600 transition-all shadow-sm">التفاصيل </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-900 text-white border-t-4 border-emerald-500">
                                    <td colSpan={4} className="px-8 py-6 font-black text-left uppercase">إجمالي المداخيل المسجلة:</td>
                                    <td className="px-8 py-6 text-center font-mono font-black text-2xl text-emerald-400">{totals.toLocaleString()} DH</td>
                                    <td className="px-8 py-6"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
               </div>
           </div>
        )}

        {activeTab === 'stats' && statsQuery.data && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="bg-white p-12 rounded-[4rem] shadow-xl border-t-8 border-emerald-500 hover:scale-105 transition-all">
                        <h4 className="text-slate-400 font-black text-xs uppercase mb-4 tracking-widest">مداخيل اليوم</h4>
                        <p className="text-4xl font-black text-slate-900">{statsQuery.data.daily.total.toLocaleString()} DH</p>
                        <p className="text-[10px] text-slate-400 mt-4 font-bold">عدد العمليات: {statsQuery.data.daily.count}</p>
                    </div>
                    <div className="bg-white p-12 rounded-[4rem] shadow-xl border-t-8 border-blue-600 hover:scale-105 transition-all">
                        <h4 className="text-slate-400 font-black text-xs uppercase mb-4 tracking-widest">مداخيل الشهر</h4>
                        <p className="text-4xl font-black text-slate-900">{statsQuery.data.monthly.total.toLocaleString()} DH</p>
                        <p className="text-[10px] text-slate-400 mt-4 font-bold">عدد العمليات: {statsQuery.data.monthly.count}</p>
                    </div>
                    <div className="bg-white p-12 rounded-[4rem] shadow-xl border-t-8 border-amber-500 hover:scale-105 transition-all">
                        <h4 className="text-slate-400 font-black text-xs uppercase mb-4 tracking-widest">مداخيل السنة</h4>
                        <p className="text-4xl font-black text-slate-900">{statsQuery.data.yearly.total.toLocaleString()} DH</p>
                        <p className="text-[10px] text-slate-400 mt-4 font-bold">تحديث تراكمي مستمر</p>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedEntryForDetails && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] shadow-3xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-top-20 duration-500 text-right">
                  <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                      <div className="flex items-center gap-4 text-right">
                          <span className="text-3xl"></span>
                          <div>
                              <h3 className="text-2xl font-black italic">تفاصيل السجل المهني #{selectedEntryForDetails.serial_number}</h3>
                              <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">المعرف الرقمي: {selectedEntryForDetails.id}</p>
                          </div>
                      </div>
                      <button onClick={() => { setSelectedEntryForDetails(null); setShowCorrectionForm(false); }} className="bg-slate-800 hover:bg-red-500 w-12 h-12 rounded-2xl transition-all flex items-center justify-center text-xl text-white"></button>
                  </div>

                  <div className="p-10 overflow-y-auto space-y-10">
                        {!showCorrectionForm ? (
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 text-right">
                                            <h4 className="text-slate-400 font-black text-[10px] uppercase mb-4 tracking-widest">صاحب الشهادة</h4>
                                            <p className="text-3xl font-black text-slate-900">{selectedEntryForDetails.family_name} {selectedEntryForDetails.personal_name}</p>
                                            {selectedEntryForDetails.id_card && <p className="text-emerald-600 font-black mt-2">رقم البطاقة: {selectedEntryForDetails.id_card}</p>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-900 p-6 rounded-2xl text-center">
                                                <h4 className="text-slate-400 font-bold text-[10px] mb-2">المبلغ المستخلص</h4>
                                                <p className="text-2xl font-black text-white">{Number(selectedEntryForDetails.amount_received).toLocaleString()} DH</p>
                                            </div>
                                            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 text-center">
                                                <h4 className="text-amber-900 font-bold text-[10px] mb-2">رقم التوصيل</h4>
                                                <p className="text-2xl font-black text-amber-600">{selectedEntryForDetails.receipt_number}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-[2.5rem] p-8 flex flex-col justify-center border-2 border-slate-100 text-right space-y-6">
                                          {selectedEntryForDetails.operation_type === 'Original' ? (
                                              <>
                                                  <div className="border-b border-slate-200 pb-2">
                                                      <h4 className="text-slate-400 font-black text-[10px] uppercase tracking-widest">سجل بيانات العدل الأول</h4>
                                                  </div>
                                                  <div>
                                                      <p className="text-xs text-slate-500 font-bold">الرقم / العدد / الصفحة:</p>
                                                      <p className="text-xl font-black text-slate-900">{selectedEntryForDetails.adl1_number || "---"} / {selectedEntryForDetails.adl1_volume || "---"} / {selectedEntryForDetails.adl1_page || "---"}</p>
                                                  </div>
                                                  <div>
                                                      <p className="text-xs text-slate-500 font-bold">تاريخ تلقي الشهادة:</p>
                                                      <p className="text-xl font-black text-slate-900">{selectedEntryForDetails.reception_date || "---"}</p>
                                                  </div>
                                              </>
                                          ) : (
                                              <>
                                                  <div className="border-b border-slate-200 pb-2">
                                                      <h4 className="text-slate-400 font-black text-[10px] uppercase tracking-widest">إذن قاضي التوثيق</h4>
                                                  </div>
                                                  <div>
                                                      <p className="text-xs text-slate-500 font-bold">الرقم التسلسلي للاذن:</p>
                                                      <p className="text-xl font-black text-slate-900">{selectedEntryForDetails.judge_auth_number || "---"}</p>
                                                  </div>
                                                  <div>
                                                      <p className="text-xs text-slate-500 font-bold">تاريخ منح الاذن:</p>
                                                      <p className="text-xl font-black text-slate-900">{selectedEntryForDetails.judge_auth_date || "---"}</p>
                                                  </div>
                                              </>
                                          )}
                                      </div>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-right">
                                    <h4 className="text-slate-500 font-black text-xs mb-4"> مسار التدقيق (Checklist responses)</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        {selectedEntryForDetails.questions_responses && Object.entries(selectedEntryForDetails.questions_responses).map(([k, v]: any) => (
                                            <div key={k} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-[10px]">
                                                <span className={`font-black ${v ? 'text-emerald-600' : 'text-red-500'}`}>{v ? ' نعم' : ' لا'}</span>
                                                <span className="text-slate-400 font-bold truncate ml-2">{k === 'confirmed_tariff' ? 'تعريفة مطابقة' : k === 'delivered_copy' ? 'تم التسليم' : 'نفس اليوم'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setShowCorrectionForm(true)} className="flex-1 bg-red-600 text-white py-5 rounded-2xl font-black text-sm shadow-lg hover:bg-red-700 transition-all uppercase tracking-widest border-b-4 border-red-900"> تسجيل تصحيح محاسبي</button>
                                    <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-lg hover:bg-black transition-all uppercase tracking-widest border-b-4 border-slate-700"> طباعة وصل العمليات</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in slide-in-from-bottom-10 text-right">
                                <div className="bg-red-50 border-r-8 border-red-600 p-8 rounded-3xl">
                                    <h4 className="text-red-900 font-black text-xl mb-2 italic">نظام التصحيح المحاسبي</h4>
                                    <p className="text-red-700 text-sm font-bold leading-relaxed">بناء على بروتوكول الرقابة القضائية لا يمكن حذف أي عملية بعد الحفظ. الموازنة تتم عبر إضافة دخول أو خروج موازي. يرجى إدخال القيمة التصحيحية وسببها.</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-black text-slate-500 mr-2 uppercase tracking-widest">المبلغ التصحيحي (مثلا: -50 لإلغاء جزئي أو +50 لزيادة)</label>
                                        <input type="number" className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2rem] px-8 py-5 font-black text-3xl text-red-600 text-left" value={correctionData.amount_received} onChange={e => setCorrectionData({...correctionData, amount_received: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-black text-slate-500 mr-2 uppercase tracking-widest">سبب وتبرير التصحيح (إلزامي للتدقيق)</label>
                                        <textarea placeholder="يرجى كتابة سبب التغيير هنا..." className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2rem] px-8 py-5 font-bold min-h-[150px] outline-none focus:border-red-600" value={correctionData.notes} onChange={e => setCorrectionData({...correctionData, notes: e.target.value})} />
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => {
                                            if (!correctionData.notes) { alert('يجب كتابة سبب التصحيح قبل الحفظ'); return; }
                                            addCorrectionMutation.mutate({ sessionToken: sessionToken || '', originalId: selectedEntryForDetails.id, correction: { ...selectedEntryForDetails, amount_received: correctionData.amount_received, notes: correctionData.notes } });
                                        }} className="flex-1 bg-red-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-red-700 transition-all">تأكيد التصحيح وتوثيقه</button>
                                        <button onClick={() => setShowCorrectionForm(false)} className="px-12 bg-slate-100 py-5 rounded-[2rem] font-black text-slate-400 hover:bg-slate-200 transition-all">إلغاء</button>
                                    </div>
                                </div>
                            </div>
                        )}
                  </div>
              </div>
          </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 text-right">
          <div className="bg-white rounded-[4rem] shadow-4xl max-w-xl w-full overflow-hidden text-center animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900 py-12 text-white text-center">
               <span className="text-7xl"></span>
               <h3 className="text-3xl font-black mt-6 italic">تأكيد التوقيع الرسمي</h3>
            </div>
            <div className="p-12 space-y-8">
                <p className="font-bold text-slate-500 text-lg leading-relaxed uppercase tracking-tighter">أنت على وشك حفظ العملية الحالية في السجل اليومي المراقب قضائيا. هل تؤكد صحة البيانات المالية وأرقام التوصيلات</p>
                <div className="flex gap-6">
                   <button onClick={confirmSave} className="flex-[2] bg-emerald-600 text-white py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95 border-b-8 border-emerald-900 italic uppercase">نعم حفظ وتوقيع</button>
                   <button onClick={() => setShowConfirmModal(false)} className="flex-1 bg-slate-100 py-6 rounded-[2.5rem] font-black text-slate-400 hover:bg-slate-200 transition-all uppercase tracking-widest italic">مراجعة</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}