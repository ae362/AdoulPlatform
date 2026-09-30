import React, { useState } from 'react';
import { ClientFollowUp, DeedWorkflowStatus } from '../types';
import {
  FileText,
  Eye,
  Send,
  FolderOpen,
} from 'lucide-react';

export interface DocumentsTabProps {
  client: ClientFollowUp;
  onUpdateDeedStatus: (status: DeedWorkflowStatus, note?: string) => void;
  onSendDraft: () => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  client,
  onUpdateDeedStatus,
  onSendDraft,
}) => {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedDocTitle, setSelectedDocTitle] = useState(
    'مسودة رسم ' + client.currentDeed.deedType,
  );

  const workflowSteps: {
    status: DeedWorkflowStatus;
    title: string;
    icon: string;
    desc: string;
  }[] = [
    {
      status: 'مسودة_للمعاينة',
      title: 'مسودة للمعاينة',
      icon: '📝',
      desc: 'المسودة محررة وجاهزة للمراجعة',
    },
    {
      status: 'أرسلت_المسودة',
      title: 'أُرسلت',
      icon: '📤',
      desc: 'أُرسلت لطالب الإشهاد للمطالعة',
    },
    {
      status: 'تمت_المعاينة',
      title: 'تمت المعاينة',
      icon: '👁️',
      desc: 'اطلع عليها طالب الإشهاد',
    },
    {
      status: 'توجد_ملاحظات',
      title: 'توجد ملاحظات',
      icon: '⚠️',
      desc: 'طلب تعديل أو تصحيح بيانات',
    },
    {
      status: 'تم_تحديث_المسودة',
      title: 'تحديث المسودة',
      icon: '✏️',
      desc: 'تم إدراج التصحيحات بنجاح',
    },
    {
      status: 'تم_إنجاز_الرسم',
      title: 'إنجاز الرسم',
      icon: '⚖️',
      desc: 'الرسم نهائي ومضمن وموقع',
    },
  ];

  const currentStatus = client.currentDeed.workflowStatus;
  const currentStepIndex = workflowSteps.findIndex(
    (s) => s.status === currentStatus,
  );

  const attachments = [
    {
      id: 'doc-1',
      title: `مسودة ${client.currentDeed.deedType} (سجل ${client.currentDeed.ledgerNumber} / ${client.currentDeed.deedNumber})`,
      category: 'مسودة الإشهاد العدلي',
      date: client.currentDeed.receiptDate,
      badge: 'الرسم الجاري',
      color: 'border-blue-300 bg-blue-50/50',
    },
    {
      id: 'doc-2',
      title: `البطاقة الوطنية للتعريف الإلكترونية (${client.cin})`,
      category: 'إثبات الهوية الشخصية',
      date: '2026-03-01',
      badge: 'وثيقة رسمية',
      color: 'border-slate-200 bg-white',
    },
    {
      id: 'doc-3',
      title: 'رسم الملكية الأصلي / شهادة المحافظة العقارية',
      category: 'وثائق التملك والوعاء العقاري',
      date: '2026-03-02',
      badge: 'أصل الملكية',
      color: 'border-slate-200 bg-white',
    },
    {
      id: 'doc-4',
      title: 'الشهادة الإدارية لإبراء الذمة الجبائية والبلدية',
      category: 'الشواهد الإدارية الملحقة',
      date: '2026-03-04',
      badge: 'شهادة إدارية',
      color: 'border-slate-200 bg-white',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. المسار التفاعلي لحالة المسودة */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-black text-slate-800 font-amiri">
              المسار التفاعلي لمسودة الرسم والاعتماد
            </h3>
            <p className="text-xs text-slate-500">
              متابعة دقيقة لمراحل التدقيق بين مكتب العدل وطالب الإشهاد حتى التضمين النهائي
            </p>
          </div>

          <button
            type="button"
            onClick={onSendDraft}
            className="px-4 py-2 rounded-2xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-black shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>📤 إرسال المسودة لطالب الإشهاد</span>
          </button>
        </div>

        {/* Stepper Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2">
          {workflowSteps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <button
                key={step.status}
                type="button"
                onClick={() => onUpdateDeedStatus(step.status)}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer relative ${
                  isCurrent
                    ? 'border-blue-900 bg-blue-50/80 shadow-md ring-2 ring-blue-900/20'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                    : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-xl mb-1">{step.icon}</div>
                <div className="text-xs font-black mb-0.5 leading-snug">
                  {step.title}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1">
                  {step.desc}
                </div>

                {isCurrent && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full text-[9px] font-black bg-blue-900 text-white">
                    الحالة الحالية
                  </span>
                )}
                {isCompleted && (
                  <span className="absolute -top-1 left-2 text-emerald-600 text-xs">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. قائمة الوثائق المدلى بها ومسودة الرسم */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h4 className="text-sm font-black text-slate-800 font-amiri flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-900" />
          <span>حزمة وثائق الملف والرسم العدلي</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attachments.map((doc) => (
            <div
              key={doc.id}
              className={`p-4 rounded-2xl border ${doc.color} flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900/10 text-blue-900 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-black text-slate-900 line-clamp-1">
                      {doc.title}
                    </h5>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {doc.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {doc.category} • تاريخ الإدراج: {doc.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocTitle(doc.title);
                    setPreviewModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 text-xs transition cursor-pointer"
                  title="معاينة الوثيقة"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-900" />
                <h3 className="text-base font-black text-slate-900 font-amiri">
                  معاينة الوثيقة الرسمية
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕ إغلاق
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 mb-4 max-h-[60vh] overflow-y-auto font-amiri text-sm leading-relaxed text-slate-800 space-y-4">
              <div className="text-center pb-3 border-b border-slate-200">
                <p className="text-xs text-slate-500 font-bold">
                  المملكة المغربية • وزارة العدل
                </p>
                <p className="text-sm font-black text-slate-900 mt-1">
                  مكتب التوثيق العدلي
                </p>
                <p className="text-xs text-blue-900 font-mono mt-0.5">
                  مرجع سجل البيانات: {client.currentDeed.ledgerNumber} / عدد {client.currentDeed.deedNumber}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-base text-slate-900">
                  {selectedDocTitle}
                </h4>
                <p>
                  الحمد لله وحده، بمكتب التوثيق العدلي الكائن بـ {client.address}، حضر أمام العدلين الموقعين أسفله:
                </p>
                <p className="font-bold text-slate-900 bg-white p-3 rounded-xl border border-slate-200">
                  طالب الإشهاد: السيد(ة) {client.fullName}، الحامل للبطاقة الوطنية للتعريف رقم {client.cin}، المقيم بـ {client.address}.
                </p>
                <p>
                  وقد صرح وأشهد على نفسه بطواعية ورضا تام بصحة المعاملة المتعلقة بـ ({client.currentDeed.deedType}) وفق الشروط والبنود المتفق عليها قانوناً وشرعاً.
                </p>
                <p className="text-xs text-slate-500 italic">
                  [معاينة رقمية مشفرة ومطابقة للأصل العدلي المحفوظ بسجلات التضمين]
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-mono">
                الحالة: {client.currentDeed.workflowStatus}
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition"
              >
                تم الاطلاع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;
