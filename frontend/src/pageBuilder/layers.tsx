import React, { useMemo, useState } from 'react';
import type { BuilderDocument, BuilderNode } from './schema';

const labelFor = (node: BuilderNode) => {
  const label = node.props?.label;
  if (typeof label === 'string' && label.trim()) return label.trim();
  if (node.type === 'text') {
    const t = node.props?.text;
    if (typeof t === 'string' && t.trim()) return t.trim().slice(0, 24);
  }
  return node.type;
};

export function LayersTree({
  doc,
  selectedId,
  onSelect,
  onRename,
  onDelete,
}: {
  doc: BuilderDocument;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const rootId = doc.root.id;
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const isExpanded = (id: string) => expanded[id] ?? id === rootId;

  const items = useMemo(() => {
    const out: Array<{ node: BuilderNode; depth: number }> = [];
    const walk = (node: BuilderNode, depth: number) => {
      out.push({ node, depth });
      if (!node.children.length) return;
      if (!isExpanded(node.id)) return;
      for (const c of node.children) walk(c, depth + 1);
    };
    walk(doc.root, 0);
    return out;
  }, [doc.root, expanded, rootId]);

  return (
    <div className="space-y-1">
      {items.map(({ node, depth }) => {
        const id = node.id;
        const hasChildren = node.children.length > 0;
        const selected = selectedId === id;
        const label = labelFor(node);
        return (
          <div
            key={id}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${selected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50'}`}
            style={{ paddingRight: 8 + depth * 12 }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(id)}
                className="w-6 rounded-md bg-slate-100 px-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                {isExpanded(id) ? '−' : '+'}
              </button>
            ) : (
              <div className="w-6" />
            )}

            <button type="button" onClick={() => onSelect(id)} className="flex-1 text-right">
              <span className="font-bold">{label}</span> <span className="text-xs text-slate-500">({node.type})</span>
            </button>

            {id !== rootId ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt('اسم العنصر', label);
                    if (name) onRename(id, name);
                  }}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(id)}
                  className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                >
                  🗑
                </button>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

