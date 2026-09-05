import React, { useState } from 'react';

export interface DeedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileNumber?: string;
  draftText: string;
}

export const DeedPreviewModal: React.FC<DeedPreviewModalProps> = ({
  isOpen,
  onClose,
  fileNumber,
  draftText,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-4">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-500">عرض الرسم</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">{fileNumber || '---'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100"
            >
              {copied ? 'تم النسخ ✓' : 'نسخ المسودة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              إغلاق
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto p-5">
          <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-5 font-amiri text-lg leading-loose text-slate-900">
            {draftText}
          </pre>
        </div>
      </div>
    </div>
  );
};

