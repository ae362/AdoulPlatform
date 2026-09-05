import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { NodeType } from './schema';

const PALETTE: { type: Exclude<NodeType, 'page'>; label: string; icon: string }[] = [
  { type: 'section', label: 'Section', icon: '▦' },
  { type: 'container', label: 'Container', icon: '⬚' },
  { type: 'panel', label: 'Panel', icon: '▤' },
  { type: 'card', label: 'Card', icon: '🧩' },
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'button', label: 'Button', icon: '⎆' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'spacer', label: 'Spacer', icon: '↕' },
  { type: 'divider', label: 'Divider', icon: '─' },
];

function PaletteItem({ type, label, icon, onAdd }: { type: Exclude<NodeType, 'page'>; label: string; icon: string; onAdd: () => void }) {
  const id = `palette:${type}`;
  const draggable = useDraggable({ id, data: { kind: 'palette', nodeType: type } });

  return (
    <div
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      className={`flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50 cursor-grab active:cursor-grabbing ${
        draggable.isDragging ? 'opacity-50' : ''
      }`}
      onDoubleClick={(e) => {
        e.preventDefault();
        onAdd();
      }}
    >
      <div className="flex items-center gap-2">
        <span className="w-6 text-center text-slate-500">{icon}</span>
        <span>{label}</span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-extrabold text-white hover:bg-slate-800"
        title="Add"
      >
        +
      </button>
    </div>
  );
}

export function BlocksPalette({
  onAdd,
}: {
  onAdd: (type: Exclude<NodeType, 'page'>) => void;
}) {
  return (
    <div className="space-y-2">
      {PALETTE.map((b) => (
        <PaletteItem key={b.type} type={b.type} label={b.label} icon={b.icon} onAdd={() => onAdd(b.type)} />
      ))}
    </div>
  );
}
