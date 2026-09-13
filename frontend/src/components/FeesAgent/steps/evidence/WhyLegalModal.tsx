import React from 'react';
import { X, ShieldAlert, BookOpen, Scale, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DocumentEvidenceRule } from '../../services/evidenceRulesEngine';

interface WhyLegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: DocumentEvidenceRule;
}

export const WhyLegalModal: React.FC<WhyLegalModalProps> = ({ isOpen, onClose, rule }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-amiri text-white">الأساس القانوني والإجرائي لمتطلبات الإثبات</h3>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>القاعدة المطبقة: {rule.legalReference}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4 text-slate-800 text-sm leading-relaxed">
          {/* Version badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">إصدار القاعدة:</span>
              <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{rule.ruleVersion}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">تاريخ بدء التطبيق:</span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{rule.effectiveDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">النظام القانوني:</span>
              <span className="font-bold text-slate-800">الانتقال للقانون 51.26</span>
            </div>
          </div>

          {/* Q1: Dual Age */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 font-black text-blue-900 text-sm">
              <span className="h-6 w-6 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center font-bold">1</span>
              <span>لماذا يتحقق النظام من سن الشاهد مرتين (عند التحمل وعند الأداء)؟</span>
            </div>
            <p className="text-xs text-slate-700 pr-8">
              {rule.whyExplainer.dualAge}
              <br />
              <strong className="text-blue-800">السند القانوني:</strong> تميز المادة 67 من القانون رقم 51.26 صراحة بين تاريخ معاينة وتحمل الواقعة المشهود بها (حيث يشترط بلوغ سن التمييز: {rule.bearingAgeMin} سنة)، وبين تاريخ أداء الشهادة رسمياً أمام العدلين ومجلس التلقي (حيث يشترط كمال الأهلية وبلوغ سن الرشد: {rule.performanceAgeMin} سنة شمسية كاملة).
            </p>
          </div>

          {/* Q2: Minimum Witnesses */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 font-black text-emerald-900 text-sm">
              <span className="h-6 w-6 rounded-full bg-emerald-200 text-emerald-800 text-xs flex items-center justify-center font-bold">2</span>
              <span>لماذا يشترط النظام 12 شاهداً كحد أدنى، ولا يحدد حداً أقصى؟</span>
            </div>
            <p className="text-xs text-slate-700 pr-8">
              {rule.whyExplainer.minimumWitnesses}
              <br />
              <strong className="text-emerald-800">السند القانوني:</strong> تنص المادة على ألا يقل عدد أفراد اللفيف عن اثني عشر (12) شاهداً لضمان حصول التواتر والاستفاضة الشرعية، ولا يمنع النظام زيادة العدد (13 أو 14...) لكون الزيادة معتبرة في تقوية الحجة الإثباتية.
            </p>
          </div>

          {/* Q3: Inquest & Kinship */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
              <span className="h-6 w-6 rounded-full bg-amber-200 text-amber-800 text-xs flex items-center justify-center font-bold">3</span>
              <span>لماذا يُسأل العدل عن القرابة والمصاهرة ويوثق التحري (Audit Trail)؟</span>
            </div>
            <p className="text-xs text-slate-700 pr-8">
              {rule.whyExplainer.inquestAndKinship}
              <br />
              <strong className="text-amber-800">السند القانوني:</strong> العدل ليس مجرد كاتب لإملاء الشهود، بل هو مؤتمن رسمي ملزم بالتحري في أهلية الشاهد وخلوه من موانع التهمة أو جلب المصلحة أو دفع المضرة، طبقاً لقواعد التجريح المقررة فقهياً وقانونياً.
            </p>
          </div>

          {/* Q4: Role of System */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">حدود التدقيق الآلي:</strong>
              {' '}يقدم النظام تدقيقاً برمجياً استباقياً للمساعدة المهنية ولا يحل بحال محل السلطة التقديرية للعدلين في التحري، ويضمن تطابق الإجراء مع المعايير الوطنية قبل إحالة المحرر للتوقيع أو المراقبة القضائية.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm"
          >
            فهمت الأساس القانوني
          </button>
        </div>
      </div>
    </div>
  );
};

