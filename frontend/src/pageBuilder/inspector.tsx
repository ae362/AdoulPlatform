import React from 'react';
import type { BuilderNode, NodeType, TextVariant } from './schema';

const px = (n: string) => (n.endsWith('px') ? n : `${n}px`);

const numberOrEmpty = (v: any) => {
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return '';
  const m = v.match(/^(\d+(?:\.\d+)?)px$/);
  return m ? m[1] : '';
};

const labelFor = (node: BuilderNode) => {
  const label = node.props?.label;
  if (typeof label === 'string' && label.trim()) return label.trim();
  return node.type;
};

export function Inspector({
  node,
  onProps,
  onStyle,
  onDelete,
  onDuplicate,
}: {
  node: BuilderNode | null;
  onProps: (patch: Record<string, any>) => void;
  onStyle: (patch: Record<string, any>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  if (!node) {
    return <div className="text-sm text-slate-500">اختر عنصرًا لعرض خصائصه.</div>;
  }

  const bg = node.style?.backgroundColor ?? '';
  const color = node.style?.color ?? '';
  const type = node.type as NodeType;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-extrabold text-slate-900">{labelFor(node)}</div>
          <div className="text-xs text-slate-500">{type}</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200"
          >
            نسخ
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            حذف
          </button>
        </div>
      </div>

      {type === 'text' || type === 'button' ? (
        <label className="block">
          <div className="mb-1 text-xs font-bold text-slate-600">النص</div>
          <textarea
            value={node.props?.text ?? ''}
            onChange={(e) => onProps({ text: e.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
          />
        </label>
      ) : null}

      {type === 'button' ? (
        <label className="block">
          <div className="mb-1 text-xs font-bold text-slate-600">الرابط (URL)</div>
          <input
            dir="ltr"
            value={node.props?.href ?? ''}
            onChange={(e) => onProps({ href: e.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-mono"
            placeholder="https://..."
          />
        </label>
      ) : null}

      {type === 'card' ? (
        <label className="block">
          <div className="mb-1 text-xs font-bold text-slate-600">Icon</div>
          <input
            value={node.props?.icon ?? ''}
            onChange={(e) => onProps({ icon: e.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
            placeholder="✨"
          />
        </label>
      ) : null}

      {type === 'image' ? (
        <div className="space-y-2">
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">Upload</div>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => onProps({ src: String(reader.result ?? '') });
                reader.readAsDataURL(file);
                e.currentTarget.value = '';
              }}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">Image URL</div>
            <input
              dir="ltr"
              value={node.props?.src ?? ''}
              onChange={(e) => onProps({ src: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-mono"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">Alt</div>
            <input
              value={node.props?.alt ?? ''}
              onChange={(e) => onProps({ alt: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">Fit</div>
            <select
              value={node.props?.fit ?? 'cover'}
              onChange={(e) => onProps({ fit: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
            >
              <option value="cover">cover</option>
              <option value="contain">contain</option>
              <option value="fill">fill</option>
              <option value="none">none</option>
            </select>
          </label>
        </div>
      ) : null}

      {type === 'text' ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">النمط</div>
            <select
              value={(node.props?.variant ?? 'p') as TextVariant}
              onChange={(e) => onProps({ variant: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
            >
              <option value="h1">H1</option>
              <option value="h2">H2</option>
              <option value="h3">H3</option>
              <option value="p">P</option>
              <option value="span">Span</option>
            </select>
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">محاذاة</div>
            <select
              value={node.props?.align ?? 'right'}
              onChange={(e) => onProps({ align: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
            >
              <option value="right">يمين</option>
              <option value="center">وسط</option>
              <option value="left">يسار</option>
            </select>
          </label>
          <label className="col-span-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            <input type="checkbox" checked={Boolean(node.props?.bold)} onChange={(e) => onProps({ bold: e.target.checked })} />
            خط عريض
          </label>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="text-sm font-extrabold text-slate-900">المظهر</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">خلفية</div>
            <input
              type="color"
              value={bg || '#ffffff'}
              onChange={(e) => onStyle({ backgroundColor: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">لون النص</div>
            <input
              type="color"
              value={color || '#0f172a'}
              onChange={(e) => onStyle({ color: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">Padding</div>
            <input
              value={numberOrEmpty(node.style?.padding ?? '')}
              onChange={(e) => onStyle({ padding: e.target.value ? px(e.target.value) : undefined })}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
              placeholder="px"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">Radius</div>
            <input
              value={numberOrEmpty(node.style?.borderRadius ?? '')}
              onChange={(e) => onStyle({ borderRadius: e.target.value ? px(e.target.value) : undefined })}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
              placeholder="px"
            />
          </label>
          <label className="block col-span-2">
            <div className="mb-1 text-xs font-bold text-slate-600">Shadow</div>
            <input
              value={node.style?.boxShadow ?? ''}
              onChange={(e) => onStyle({ boxShadow: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-mono"
              placeholder="0 8px 22px rgba(0,0,0,0.06)"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">Width</div>
            <input
              value={node.style?.width ?? ''}
              onChange={(e) => onStyle({ width: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-mono"
              dir="ltr"
              placeholder="100% / 320px"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-bold text-slate-600">Height</div>
            <input
              value={node.style?.height ?? ''}
              onChange={(e) => onStyle({ height: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-mono"
              dir="ltr"
              placeholder="auto / 240px"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
