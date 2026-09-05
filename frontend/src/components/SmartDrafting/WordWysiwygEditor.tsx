import React, { useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';

type Props = {
  valueHtml: string;
  onChangeHtml: (nextHtml: string) => void;
  className?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg border text-sm font-bold transition-all ${
        disabled
          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
          : active
          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
          : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
      }`}
    >
      {children}
    </button>
  );
}

export function WordWysiwygEditor({ valueHtml, onChangeHtml, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: valueHtml,
    editorProps: {
      attributes: {
        dir: 'rtl',
        class:
          'min-h-[18rem] p-6 outline-none font-amiri text-lg leading-loose text-justify',
      },
    },
    onUpdate: ({ editor }) => {
      onChangeHtml(editor.getHTML());
    },
  });

  // Keep editor in sync when external changes update valueHtml
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== valueHtml) {
      editor.commands.setContent(valueHtml || '<p></p>', { emitUpdate: false });
    }
  }, [editor, valueHtml]);

  const canUndo = useMemo(() => !!editor?.can().undo(), [editor, valueHtml]);
  const canRedo = useMemo(() => !!editor?.can().redo(), [editor, valueHtml]);

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap justify-end gap-2 rounded-xl border bg-white p-2">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={!!editor?.isActive('bold')}
        >
          عريض
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={!!editor?.isActive('italic')}
        >
          مائل
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('right').run()}>
          يمين
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('justify').run()}>
          ضبط
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} disabled={!canUndo}>
          تراجع
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} disabled={!canRedo}>
          إعادة
        </ToolbarButton>
      </div>

      <div className="w-full rounded-xl border bg-gray-50 focus-within:bg-white transition-colors overflow-hidden">
        <EditorContent editor={editor} />
      </div>

      {!editor && (
        <div className="text-sm text-gray-500 mt-2 text-right">جاري تهيئة المحرر…</div>
      )}

      <div className="text-xs text-gray-500 mt-2 text-right">
        يدعم: الفقرات + الأسطر الجديدة + (عريض/مائل). القوائم تُصدّر بشكل مبسط.
      </div>
    </div>
  );
}
