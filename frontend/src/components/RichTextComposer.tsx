import React from 'react';

type Props = {
  valueHtml: string;
  onChangeHtml: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

function isMacLike() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

const FONT_SIZES = [
  { label: '12', px: 12 },
  { label: '14', px: 14 },
  { label: '16', px: 16 },
  { label: '18', px: 18 },
  { label: '24', px: 24 },
  { label: '32', px: 32 },
];

const FONT_FAMILIES = [
  { label: 'افتراضي', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Noto Naskh Arabic', value: '"Noto Naskh Arabic", serif' },
  { label: 'Amiri', value: 'Amiri, serif' },
];

const FONT_TAG_SIZE_TO_PX: Record<string, number> = {
  '1': 10,
  '2': 12,
  '3': 14,
  '4': 16,
  '5': 18,
  '6': 24,
  '7': 32,
};

function normalizeEditorHtml(html: string) {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  if (!root) return html;

  const fonts = Array.from(root.querySelectorAll('font'));
  for (const fontEl of fonts) {
    const span = doc.createElement('span');
    const sizeAttr = fontEl.getAttribute('size');
    const faceAttr = fontEl.getAttribute('face');
    const colorAttr = fontEl.getAttribute('color');

    const styles: string[] = [];
    if (sizeAttr && FONT_TAG_SIZE_TO_PX[sizeAttr]) styles.push(`font-size:${FONT_TAG_SIZE_TO_PX[sizeAttr]}px`);
    if (faceAttr) styles.push(`font-family:${faceAttr}`);
    if (colorAttr) styles.push(`color:${colorAttr}`);
    if (styles.length) span.setAttribute('style', styles.join(';'));

    span.innerHTML = fontEl.innerHTML;
    fontEl.replaceWith(span);
  }

  // Remove empty wrappers like <span></span> / <div></div> created by commands
  const emptySpans = Array.from(root.querySelectorAll('span'));
  for (const s of emptySpans) {
    if ((s.textContent ?? '').trim() === '' && s.querySelectorAll('br,img,span,b,strong,i,em,u').length === 0) {
      s.remove();
    }
  }

  return root.innerHTML;
}

function selectionHasText() {
  const sel = window.getSelection?.();
  if (!sel || sel.rangeCount === 0) return false;
  const text = sel.toString();
  return !!text && text.trim().length > 0;
}

export function RichTextComposer({ valueHtml, onChangeHtml, disabled, placeholder }: Props) {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [textColor, setTextColor] = React.useState('#111827'); // slate-900
  const [highlightColor, setHighlightColor] = React.useState('#fff59d'); // light yellow
  const [fontFamily, setFontFamily] = React.useState('');
  const [fontSizePx, setFontSizePx] = React.useState(14);
  const [stylePreset, setStylePreset] = React.useState<'normal' | 'title' | 'h1' | 'h2'>('normal');

  const syncOut = () => {
    const html = normalizeEditorHtml(editorRef.current?.innerHTML ?? '');
    if (editorRef.current && editorRef.current.innerHTML !== html) editorRef.current.innerHTML = html;
    onChangeHtml(html);
  };

  const exec = (command: string, value?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    try {
      // Prefer CSS-based output over <b>/<font> when possible
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('styleWithCSS', false, 'true');
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand(command, false, value);
    } catch {
      // no-op (execCommand can fail in some environments)
    }
    syncOut();
  };

  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== valueHtml) el.innerHTML = valueHtml || '';
  }, [valueHtml]);

  const onInput = () => {
    syncOut();
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const mod = isMacLike() ? e.metaKey : e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      exec('bold');
    } else if (key === 'i') {
      e.preventDefault();
      exec('italic');
    } else if (key === 'u') {
      e.preventDefault();
      exec('underline');
    } else if (key === 'k') {
      e.preventDefault();
      const url = window.prompt('أدخل رابطاً (https://...)');
      if (url) exec('createLink', url);
    }
  };

  const applyFontSize = (px: number) => {
    setFontSizePx(px);
    // execCommand fontSize accepts 1..7, we'll map to closest and then normalize <font>
    const closest = Object.entries(FONT_TAG_SIZE_TO_PX).reduce(
      (acc, [size, mappedPx]) => {
        const diff = Math.abs(mappedPx - px);
        return diff < acc.diff ? { diff, size } : acc;
      },
      { diff: Number.POSITIVE_INFINITY, size: '3' }
    );
    exec('fontSize', closest.size);
  };

  const applyFontFamily = (family: string) => {
    setFontFamily(family);
    if (!family) {
      exec('removeFormat');
      return;
    }
    // execCommand fontName often yields <font face=...>; normalize will convert it
    exec('fontName', family);
  };

  const applyStylePreset = (preset: typeof stylePreset) => {
    setStylePreset(preset);
    if (preset === 'normal') exec('formatBlock', 'p');
    else if (preset === 'title') exec('formatBlock', 'h1');
    else if (preset === 'h1') exec('formatBlock', 'h2');
    else if (preset === 'h2') exec('formatBlock', 'h3');
  };

  const insertLink = () => {
    if (disabled) return;
    const url = window.prompt('أدخل رابطاً (https://...)');
    if (!url) return;
    if (!selectionHasText()) {
      exec('insertText', url);
    }
    exec('createLink', url);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        <div className="flex items-center gap-2">
          <select
            value={fontFamily}
            disabled={disabled}
            onChange={(e) => applyFontFamily(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
            title="الخط"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={String(fontSizePx)}
            disabled={disabled}
            onChange={(e) => applyFontSize(Number(e.target.value))}
            className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
            title="الحجم"
          >
            {FONT_SIZES.map((s) => (
              <option key={s.px} value={String(s.px)}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={stylePreset}
            disabled={disabled}
            onChange={(e) => applyStylePreset(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
            title="النمط"
          >
            <option value="normal">Normal</option>
            <option value="title">Title</option>
            <option value="h1">Heading</option>
            <option value="h2">Heading 2</option>
          </select>
        </div>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('bold')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="غامق (Ctrl/⌘+B)"
          >
            B
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('italic')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold italic text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="مائل (Ctrl/⌘+I)"
          >
            I
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('underline')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold underline text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="تحته خط (Ctrl/⌘+U)"
          >
            U
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('strikeThrough')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold line-through text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="يتوسطه خط"
          >
            S
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('superscript')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="مرتفع"
          >
            x²
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('subscript')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="منخفض"
          >
            x₂
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="text-xs font-semibold text-slate-700">لون</span>
            <input
              type="color"
              value={textColor}
              disabled={disabled}
              onChange={(e) => {
                const next = e.target.value;
                setTextColor(next);
                exec('foreColor', next);
              }}
              className="h-6 w-10 cursor-pointer bg-transparent"
              title="لون النص"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="text-xs font-semibold text-slate-700">تمييز</span>
            <input
              type="color"
              value={highlightColor}
              disabled={disabled}
              onChange={(e) => {
                const next = e.target.value;
                setHighlightColor(next);
                exec('hiliteColor', next);
              }}
              className="h-6 w-10 cursor-pointer bg-transparent"
              title="لون التمييز"
            />
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('justifyRight')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="محاذاة يمين"
          >
            ⟫
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('justifyCenter')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="توسيط"
          >
            ≡
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('justifyLeft')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="محاذاة يسار"
          >
            ⟪
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('justifyFull')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="ضبط"
          >
            ☰
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('insertUnorderedList')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="قائمة نقطية"
          >
            ••
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('insertOrderedList')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="قائمة رقمية"
          >
            1.
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('outdent')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="إنقاص الإزاحة"
          >
            ⇤
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('indent')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="زيادة الإزاحة"
          >
            ⇥
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={insertLink}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="رابط (Ctrl/⌘+K)"
          >
            🔗
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('undo')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="تراجع"
          >
            ↶
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('redo')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="إعادة"
          >
            ↷
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => exec('removeFormat')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="إزالة التنسيق"
          >
            إزالة التنسيق
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={onInput}
        onKeyDown={onKeyDown}
        role="textbox"
        aria-multiline="true"
        className="min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-50"
        data-placeholder={placeholder ?? ''}
        suppressContentEditableWarning
        style={{
          // placeholder for contentEditable via CSS attribute
          // (Tailwind doesn't support ::before with attr out of the box)
          position: 'relative',
        }}
      />
      <style>
        {`
          [data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: rgb(100 116 139); /* slate-500 */
          }
        `}
      </style>
    </div>
  );
}
