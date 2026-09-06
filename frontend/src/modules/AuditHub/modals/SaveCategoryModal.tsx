import React from 'react';
import { 
  HeartPulse, 
  Building2, 
  ScrollText, 
  LayoutGrid, 
  FolderArchive, 
  Scale, 
  FileSignature, 
  Loader2, 
  X, 
  CheckCircle2, 
  ShieldCheck,
  Book,
  FileText,
  ChevronLeft
} from 'lucide-react';

export const SaveCategoryModal = ({ isOpen, onClose, onSave, fileName, intent, isLoading }: any) => {
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const categories = [
        { id: 'marriage', label: 'الزواج', icon: HeartPulse, color: 'text-emerald-600', accent: 'bg-emerald-500', glow: 'shadow-emerald-500/25', bg: 'bg-emerald-50', border: 'border-emerald-200', docType: 'رسم_زواج' },
        { id: 'divorce', label: 'الطلاق', icon: ScrollText, color: 'text-rose-600', accent: 'bg-rose-500', glow: 'shadow-rose-500/25', bg: 'bg-rose-50', border: 'border-rose-200', docType: 'رسم_طلاق' },
        { id: 'property', label: 'الأملاك', icon: LayoutGrid, color: 'text-blue-600', accent: 'bg-blue-500', glow: 'shadow-blue-500/25', bg: 'bg-blue-50', border: 'border-blue-200', docType: 'رسم_أملاك' },
        { id: 'inheritance', label: 'التركات', icon: Book, color: 'text-slate-700', accent: 'bg-slate-600', glow: 'shadow-slate-500/20', bg: 'bg-slate-100', border: 'border-slate-300', docType: 'رسم_تركات' },
        { id: 'misc', label: 'باقي الوثائق', icon: FolderArchive, color: 'text-amber-700', accent: 'bg-amber-500', glow: 'shadow-amber-500/25', bg: 'bg-amber-50', border: 'border-amber-200', docType: 'باقي_الوثائق' },
    ];

    React.useEffect(() => {
      if (isOpen) {
        setSelectedCategoryId(null);
        setIsSubmitting(false);
      }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const isBusy = isSubmitting || Boolean(isLoading);
    const selectedIndex = Math.max(0, categories.findIndex((cat) => cat.id === selectedCategoryId));
    const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId) || null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => !isBusy && onClose()}></div>
            <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 font-amiri">اختيار تصنيف الحفظ</h3>
                    <p className="text-slate-600 font-bold text-sm">
                      {intent === 'signing'
                        ? 'اختر نوع الرسم أولًا، ثم سيتم فتح رواق التوقيع مباشرة'
                        : 'المرجو تصنيف الرسم للحفظ ضمن السلة المناسبة'}
                    </p>
                    </div>
                    <button disabled={isBusy} onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 disabled:opacity-30">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8">
                    <div className="mb-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">المستند الحالي</p>
                            <p className="text-slate-800 font-black">{fileName}</p>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="pointer-events-none absolute right-6 top-8 bottom-8 w-1 rounded-full bg-slate-200" />
                        <div
                          className={`pointer-events-none absolute right-6 top-8 w-1 rounded-full transition-all duration-500 ${selectedCategory?.accent || 'bg-blue-500'} ${selectedCategory?.glow || ''}`}
                          style={{ height: `${selectedCategory ? 22 + selectedIndex * 92 : 0}px` }}
                        />

                        <div className="grid grid-cols-1 gap-3">
                            {categories.map((cat, index) => {
                              const isSelected = selectedCategoryId === cat.id;
                              return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                    className={`relative flex items-center gap-4 p-5 rounded-3xl border transition-all duration-300 active:scale-[0.98] group text-right w-full ${
                                      isSelected
                                        ? `${cat.bg} ${cat.border} shadow-xl ${cat.glow} ring-2 ring-offset-2 ring-offset-white ring-current ${cat.color}`
                                        : `${cat.bg} ${cat.border} hover:shadow-lg`
                                    } ${isBusy ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-4 transition-all duration-300 ${
                                      isSelected ? `${cat.accent} border-white shadow-lg` : 'bg-white border-slate-300'
                                    }`} />
                                    <div className={`mr-8 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        <cat.icon className={`w-7 h-7 ${cat.color}`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                          <h4 className={`text-xl font-black ${cat.color} mb-0.5`}>{cat.label}</h4>
                                          <span className={`text-[11px] font-black transition-all duration-300 ${isSelected ? cat.color : 'text-slate-400'}`}>
                                            {isSelected ? 'تم الاختيار' : `${index + 1}/5`}
                                          </span>
                                        </div>
                                        <p className="text-slate-500 font-bold text-xs uppercase opacity-80">
                                          {intent === 'signing'
                                            ? `اختيار ${cat.label} ثم فتح رواق التوقيع`
                                            : `إرسال إلى رواق ${(cat.label).includes('رسوم') ? cat.label : cat.label}`}
                                        </p>
                                    </div>
                                    <ChevronLeft className={`w-6 h-6 transition-all duration-300 ${isSelected ? `${cat.color} opacity-100 translate-x-0` : `${cat.color} opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0`}`} />
                                </button>
                              );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                    <button 
                      disabled={isBusy} 
                      onClick={onClose} 
                      className="text-slate-500 font-bold hover:text-slate-800 px-8 py-2 disabled:opacity-40"
                    >
                      تراجع
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCategory || isBusy}
                      onClick={() => {
                        if (!selectedCategory || isBusy) return;
                        setIsSubmitting(true);
                        onSave(selectedCategory.docType);
                      }}
                      className={`px-6 py-3 rounded-2xl font-black text-sm text-white transition-all flex items-center justify-center gap-2 ${
                        selectedCategory && !isBusy
                          ? `${selectedCategory.accent} hover:brightness-110 shadow-lg ${selectedCategory.glow}`
                          : 'bg-slate-300 cursor-not-allowed opacity-70'
                      }`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin inline-block" />
                          <span>{intent === 'signing' ? 'جاري الانتقال إلى التوقيع...' : 'جاري الحفظ والاعتماد...'}</span>
                        </>
                      ) : (
                        intent === 'signing' ? 'متابعة إلى رواق التوقيع' : 'اعتماد الصنف المختار'
                      )}
                    </button>
                </div>
            </div>
        </div>
    );
};
