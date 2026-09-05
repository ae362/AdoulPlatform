import React, { useCallback, useEffect, useRef } from 'react';

const ToolbarButton: React.FC<{ label: string; onClick: () => void; title?: string }> = ({ label, onClick, title }) => (
  <button
    type="button"
    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
    onClick={onClick}
    title={title}
  >
    {label}
  </button>
);

type Props = {
  value: string;
  onChange: (nextHtml: string) => void;
  onSyncFromData: () => void;
};

export const InteractivePdfEditor: React.FC<Props> = ({ value, onChange, onSyncFromData }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = useCallback((command: string, arg?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, arg);
  }, []);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleClearFormatting = useCallback(() => {
    execCommand('removeFormat');
    handleInput();
  }, [execCommand, handleInput]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    execCommand('insertText', text);
    handleInput();
  }, [execCommand, handleInput]);

  return (
    <div className="flex h-full flex-col gap-4 bg-slate-50/60 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton label="B" title="غامق" onClick={() => execCommand('bold')} />
          <ToolbarButton label="I" title="مائل" onClick={() => execCommand('italic')} />
          <ToolbarButton label="U" title="تحته خط" onClick={() => execCommand('underline')} />
          <ToolbarButton label="🡸" title="محاذاة لليمين" onClick={() => execCommand('justifyRight')} />
          <ToolbarButton label="⟷" title="محاذاة للوسط" onClick={() => execCommand('justifyCenter')} />
          <ToolbarButton label="🡺" title="محاذاة لليسار" onClick={() => execCommand('justifyLeft')} />
          <ToolbarButton label="•" title="قائمة نقطية" onClick={() => execCommand('insertUnorderedList')} />
          <ToolbarButton label="1." title="قائمة مرقمة" onClick={() => execCommand('insertOrderedList')} />
          <ToolbarButton label="↺" title="تراجع" onClick={() => execCommand('undo')} />
          <ToolbarButton label="↻" title="إعادة" onClick={() => execCommand('redo')} />
          <ToolbarButton label="✂︎ مسح التنسيق" onClick={handleClearFormatting} />
          <button
            type="button"
            className="ml-auto rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            onClick={onSyncFromData}
          >
            مزامنة مع البيانات الحالية
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-[28px] border border-slate-200 bg-slate-200/60 p-6">
        <div
          ref={editorRef}
          className="rich-editor-page"
          contentEditable
          suppressContentEditableWarning
          dir="rtl"
          onInput={handleInput}
          onPaste={handlePaste}
        />
      </div>

      <div className="rounded-xl bg-white/70 p-3 text-xs text-slate-500">
        يمكنك الكتابة وسحب الحقول الآلية لتغيير مواقعها. أي تعديل تقوم به هنا سيُرسل مباشرةً إلى خدمة توليد PDF
        المعبأ، ويمكنك إدراج نص حر أو صور إضافية إن لزم الأمر.
      </div>
    </div>
  );
};
