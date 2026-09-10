import React from 'react';
import { X, Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
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
              <Shield className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-serif text-amber-100">سياسة الخصوصية وحماية المعطيات ذات الطابع الشخصي</h3>
              <p className="text-xs text-amber-200/80">وفق مقتضيات القانون رقم 09-08 والظهير الشريف رقم 1-09-15</p>
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
              <FileText className="w-4 h-4 text-amber-800" />
              1. الإطار القانوني والتنظيمي
            </h4>
            <p className="text-slate-600 leading-6">
              تلتزم <strong>المنظومة الرقمية للتوثيق العدلي</strong> بالمملكة المغربية بحماية المعطيات ذات الطابع الشخصي لكافة المرتفقين والعدول والسادة القضاة، طبقاً لمقتضيات القانون رقم 09-08 الصادر بتنفيذه الظهير الشريف رقم 1-09-15 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي، ومطابقة لإرشادات اللجنة الوطنية لمراقبة حماية المعطيات ذات الطابع الشخصي (CNDP).
            </p>
          </div>

          {/* Section 2 */}
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              2. طبيعة المعطيات التي تتم معالجتها
            </h4>
            <p className="text-slate-600 mb-2">
              في إطار ممارسة مهنة خطة العدالة طبقاً للقانون رقم 16.03، تشمل المعطيات المعالجة حصراً:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 pr-2">
              <li>معطيات التعريف الشخصي: الاسم الكامل، رقم البطاقة الوطنية للتعريف الإلكترونية (CNIE)، العنوان العائلي والمهني.</li>
              <li>معطيات الحالة المدنية والتسجيلات العدلية المشمولة بالرسوم والعقود المحررة.</li>
              <li>بيانات الختم الإلكتروني والتوقيع البيومتري المؤمن المؤطر بضمانات عدم الإنكار.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-800" />
              3. أمن وسلامة المعطيات والسر المهني
            </h4>
            <p className="text-slate-600">
              تخضع جميع الوثائق والمعطيات لقواعد السر المهني الصارمة المنصوص عليها في التشريع المغربي الجاري به العمل. تطبق المنظومة تدابير تقنية وأمنية سيادية متقدمة تشمل التشفير غير القابل للكسر (HMAC-SHA256)، وعزل السجلات في بيئة استضافة سحابية سيادية وطنية، مع منع وصول أي طرف غير مصرح له قضائياً أو قانونياً.
            </p>
          </div>

          {/* Section 4 */}
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-700" />
              4. حقوق المرتفقين وأصحاب المعطيات
            </h4>
            <p className="text-slate-600 mb-2">
              وفقاً لمقتضيات المواد 7 و8 و9 من القانون رقم 09-08، يحق لكل معني بالأمر:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pr-2">
              <li>حق الاطلاع على معطياته المسجلة في السجلات العدلية المفتوحة له قانوناً.</li>
              <li>حق طلب التصحيح القضائي أو القانوني وفق مساطر إصلاح الرسوم العدلية المعتمدة لدى قضاء الأسرة ومحاكم المملكة.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-amber-900 text-white rounded-xl font-bold hover:bg-amber-800 transition-colors shadow-md"
          >
            إغلاق ومتابعة
          </button>
        </div>
      </div>
    </div>
  );
};

