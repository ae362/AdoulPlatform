import React from 'react';
import { CheckCircle, Circle, Lock, ArrowRight } from 'lucide-react';
import { WorkflowPhase } from '../../../utils/WorkflowStateManager';

interface WorkflowProgressProps {
  currentPhase: WorkflowPhase;
  progress: number;
  completedPhases: WorkflowPhase[];
  onPhaseClick?: (phase: WorkflowPhase) => void;
}

const phaseLabels: Record<WorkflowPhase, { ar: string; en: string; icon: string }> = {
  'audit_and_inclusion': { 
    ar: 'التدقيق والتضمين', 
    en: 'Audit & Inclusion',
    icon: '📋'
  },
  'signature_portal_entry': { 
    ar: 'فتح رواق التوقيع', 
    en: 'Signature Portal Entry',
    icon: '🚪'
  },
  'first_notary_signature': { 
    ar: 'توقيع العدل الأول', 
    en: '1st Notary Signature',
    icon: '👨‍⚖️'
  },
  'second_notary_signature': { 
    ar: 'توقيع العدل الثاني', 
    en: '2nd Notary Signature',
    icon: '👨‍⚖️'
  },
  'lock_and_fingerprint': { 
    ar: 'القفل والبصمة الرقمية', 
    en: 'Lock & Fingerprint',
    icon: '🔐'
  },
  'letter_template_preparation': { 
    ar: 'تجهيز قالب الخطاب', 
    en: 'Letter Template Prep',
    icon: '📜'
  },
  'security_strip_insertion': { 
    ar: 'إدراج الشريط السفلي', 
    en: 'Security Strip',
    icon: '🔒'
  },
  'qr_generation': { 
    ar: 'توليد رمز QR', 
    en: 'QR Generation',
    icon: '📱'
  },
  'secure_archiving': { 
    ar: 'الأرشفة المؤمنة', 
    en: 'Secure Archiving',
    icon: '📁'
  },
  'final_output': { 
    ar: 'الإرسال/الطباعة', 
    en: 'Final Output',
    icon: '🎉'
  },
  'completed': { 
    ar: 'مكتمل', 
    en: 'Completed',
    icon: '✅'
  },
};

const phases: WorkflowPhase[] = [
  'audit_and_inclusion',
  'signature_portal_entry',
  'first_notary_signature',
  'second_notary_signature',
  'lock_and_fingerprint',
  'letter_template_preparation',
  'security_strip_insertion',
  'qr_generation',
  'secure_archiving',
  'final_output',
  'completed',
];

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  currentPhase,
  progress,
  completedPhases,
  onPhaseClick,
}) => {
  const currentIndex = phases.indexOf(currentPhase);

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900">سير العملية</h3>
          <span className="font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="space-y-4">
        {phases.map((phase, index) => {
          const isCompleted = completedPhases.includes(phase);
          const isCurrent = phase === currentPhase;
          const isUpcoming = index > currentIndex;

          return (
            <div key={phase} className="flex gap-4">
              {/* Timeline Connector */}
              <div className="flex flex-col items-center">
                {/* Phase Badge */}
                <button
                  onClick={() => onPhaseClick?.(phase)}
                  disabled={isUpcoming}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-black transition-all ${
                    isCompleted
                      ? 'bg-green-600 text-white shadow-lg'
                      : isCurrent
                      ? 'bg-blue-600 text-white animate-pulse shadow-xl'
                      : isUpcoming
                      ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  title={isUpcoming ? 'المراحل السابقة غير مكتملة' : ''}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : isCurrent ? (
                    <div className="text-xl">{phaseLabels[phase].icon}</div>
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>

                {/* Connector Line to Next Phase */}
                {index < phases.length - 1 && (
                  <div
                    className={`w-1 h-12 transition-all ${
                      isCompleted ? 'bg-green-600' : 'bg-slate-300'
                    }`}
                  ></div>
                )}
              </div>

              {/* Phase Details */}
              <div className={`flex-1 pt-2 ${isUpcoming ? 'opacity-50' : 'opacity-100'}`}>
                <div
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50 shadow-lg'
                      : isCompleted
                      ? 'border-green-600 bg-green-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-right">
                      <h4 className="font-black text-slate-900">
                        {phaseLabels[phase].ar}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {phaseLabels[phase].en}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap mr-2">
                      {isCompleted ? (
                        <span className="bg-green-200 text-green-900">✓ مكتملة</span>
                      ) : isCurrent ? (
                        <span className="bg-blue-200 text-blue-900 animate-pulse">⏳ جارية</span>
                      ) : (
                        <span className="bg-slate-200 text-slate-600">⏸ معلقة</span>
                      )}
                    </div>
                  </div>

                  {/* Phase Description */}
                  <div className="mt-3 text-xs text-slate-600 leading-relaxed pr-10">
                    {getPhaseDescription(phase)}
                  </div>

                  {/* Blocked Warning */}
                  {isUpcoming && (
                    <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded text-xs font-bold">
                      <Lock className="w-3 h-3" />
                      لا يمكن الانتقال إلى هذه المرحلة قبل إكمال المراحل السابقة
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legal Notice */}
      <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded text-xs text-red-900 font-bold leading-relaxed">
        <p className="font-black mb-2">⚠️ تنبيه قانوني</p>
        <p>
          لا يمكن تجاوز أي مرحلة من المراحل المذكورة أعلاه. كل مرحلة مرتبطة تقنياً بما قبلها. 
          المخالفة قد تؤدي إلى بطلان الوثيقة وتعرض العدل للمسؤولية القانونية.
        </p>
      </div>
    </div>
  );
};

function getPhaseDescription(phase: WorkflowPhase): string {
  const descriptions: Record<WorkflowPhase, string> = {
    'audit_and_inclusion': 'تدقيق الوثيقة من قبل قسم التدقيق وتسجيلها في السجل العام',
    'signature_portal_entry': 'الانتقال التلقائي إلى رواق التوقيع الإلكتروني مع التحقق من توفر جهاز Wacom',
    'first_notary_signature': 'توقيع العدل الأول عبر جهاز Wacom STU-540 مع تسجيل البيانات البيومترية',
    'second_notary_signature': 'توقيع العدل الثاني (العاطف) مع تسجيل بصمة المصادقة الخضراء',
    'lock_and_fingerprint': 'إغلاق النسخة العدلية وتوليد بصمة SHA-256 الرقمية وتسجيل في سجل الأمان',
    'letter_template_preparation': 'تطبيق قالب الخطاب وربط النسخة الأصلية بنسخة الخطاب',
    'security_strip_insertion': 'إدراج المستطيل الأفقي السفلي (الشريط الأمني) النهائي في أسفل الرسم',
    'qr_generation': 'توليد رمز QR المشفر للتحقق من الأثيقة',
    'secure_archiving': 'نقل الرسم النهائي إلى الأرشيف المؤمن مع حفظ نسختي ما قبل وما بعد الخطاب',
    'final_output': 'إرسال المستند للقاضي أو طباعته بالعلامة المائية الأمنية',
    'completed': 'اكتملت جميع المراحل بنجاح والوثيقة جاهزة للاستخدام',
  };
  return descriptions[phase] || '';
}

export default WorkflowProgress;
