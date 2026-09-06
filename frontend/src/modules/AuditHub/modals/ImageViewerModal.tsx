import React from 'react';
import { 
  X, 
  FileText, 
  Download,
  Printer
} from 'lucide-react';

export const ImageViewerModal = ({ isOpen, onClose, doc }: any) => {
    if (!isOpen || !doc) return null;
    
    return (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl">
            {/* Header Control Bar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent z-[1100]">
                <div className="flex gap-4">
                     <button className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all">
                        <Printer className="w-5 h-5" />
                     </button>
                     <button className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all">
                        <Download className="w-5 h-5" />
                     </button>
                </div>
                <div className="text-center">
                    <h2 className="text-white font-black text-lg">معاينة السند العدلي الأصلي</h2>
                    <p className="text-slate-400 text-[12px] font-bold">دقة عالية - معالجة رقمية</p>
                </div>
                <button 
                    onClick={onClose}
                    className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-all shadow-xl active:scale-95 group font-black"
                >
                     <span className="text-[14px]">إغلاق المعاينة</span>
                     <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>
            
            <div className="w-full h-full flex items-center justify-center p-20 overflow-auto scrollbar-hide cursor-zoom-in">
                <div className="bg-white rounded-sm shadow-[0_0_150px_rgba(0,0,0,0.8)] p-1 animate-in zoom-in duration-700">
                    <img 
                      src={doc.url || doc.fileUrl || doc.file_url || doc.fileURL || doc.publicUrl || doc.public_url} 
                        alt="Full Resolution View" 
                        className="max-h-[85vh] object-contain"
                    />
                </div>
            </div>

            {/* Bottom Floating Close (Visual Backup) */}
            <button 
                onClick={onClose}
                className="absolute bottom-10 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-3xl border border-white/10 font-bold transition-all animate-bounce"
            >
                إغلاق (ESC)
            </button>
        </div>
    );
};
