import React from 'react';
import { X, Scale, BookOpen, AlertCircle, FileCheck } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-amber-900/20 overflow-hidden text-right my-8 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-red-950 text-white p-6 flex items-center justify-between border-b border-amber-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-400/30">
              <Scale className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-serif text-amber-100">شروط الاستخدام والخدمات الرقمية</h3>
              <p className="text-xs text-amber-200/80">المؤطرة بالقانون رقم 16.03 المنظم لخطة العدالة والنصوص المطبقة له</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-amber-200/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 leading-relaxed text-sm">
          {/* Section 1 */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60">
            <h4 className="text-base font-bold text-amber-950 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-800" />
              1. نطاق ومجال التطبيق
            </h4>
            <p className="text-slate-600 leading-6">
              تحدد هذه الشروط القواعد المنظمة لاستعمال <strong>المنظومة الرقمية للتوثيق العدلي</strong> من قبل السادة العدول، والمجالس الجهوية، والمكتب التنفيذي للهيئة الوطنية للعدول، والسادة القضاة المكلفين بالتوثيق، إضافة إلى المرتفقين المستفيدين من خدمات التحقق الرقمي واستخراج النسخ.
            </p>
          </div>

          {/* Section 2 */}
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-700" />
              2. حجية المحررات والوثائق الرقمية
            </h4>
            <p className="text-slate-600 mb-2">
              تكتسي العقود والرسوم الموثقة عبر المنظومة الحجية الرسمية التامة المقررة في التشريع المغربي، شريطة:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 pr-2">
              <li>تلقي الإشهاد من قبل عدلين منتصبين للإشهاد وفق الشروط الشرعية والقانونية.</li>
              <li>توثيق التوقيع البيومتري وتثبيت الختم الرقمي المشفر غير القابل للتعديل.</li>
              <li>استيفاء إجراءات الخطاب القضائي من طرف قاضي التوثيق المختص طبقاً للمساطر المعمول بها.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-800" />
              3. التزامات ومسؤوليات المستخدمين
            </h4>
            <p className="text-slate-600">
              يلتزم كل مستخدم بالحفاظ على سرية بيانات الولوج وشهادات التوقيع الإلكتروني المسلمة له، ويتحمل كامل المسؤولية القانونية والتأديبية عن أية عمليات تجري تحت اعتماداته. يمنع منعاً باتاً تفويض الحسابات أو استغلال المنظومة خارج الإطار المهني التوثيقي المحدد قانوناً.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-amber-900 text-white rounded-xl font-bold hover:bg-amber-800 transition-colors shadow-md"
          >
            الموافقة والمتابعة
          </button>
        </div>
      </div>
    </div>
  );
};

