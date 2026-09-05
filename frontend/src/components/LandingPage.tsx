import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../trpc';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { BuilderDocument, NodeType } from '../pageBuilder/schema';
import { CSS } from '@dnd-kit/utilities';
import { parseBuilderDocument } from '../pageBuilder/migrate';
import { Resizable } from 're-resizable';
import { useAuth } from '../contexts/AuthContext';

type CmsValue = { value: string; type?: string; description?: string };
export type CmsContentMap = Record<string, CmsValue>;

type NavLink = { label: string; href?: string; hasAuth?: boolean };
type NavGroup = { id: string; label: string; highlighted?: boolean; path?: string; items: NavLink[] };

type LandingPageProps = {
  contentOverride?: CmsContentMap;
  builderDoc?: BuilderDocument | null;
  builderMode?: 'view' | 'edit';
  builderSelectedId?: string | null;
  builderDispatch?: React.Dispatch<any> | null;
  paletteDragType?: Exclude<NodeType, 'page'> | null;
  isDragging?: boolean;
  dropIndicator?: { parentId: string; index: number } | null;
};

type DocViewNode = {
  id: string;
  type: NodeType;
  name: string;
  parentId: string | null;
  children: string[];
  props: Record<string, any>;
  style: Record<string, any>;
};

type DocView = {
  rootId: string;
  nodes: Record<string, DocViewNode>;
};

const safeJsonParse = <T,>(raw: string | undefined | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const toDocView = (doc: BuilderDocument): DocView => {
  const nodes: Record<string, DocViewNode> = {};
  const walk = (node: any, parentId: string | null) => {
    const name = (node.props?.label as string | undefined) ?? node.type;
    nodes[node.id] = {
      id: node.id,
      type: node.type,
      name,
      parentId,
      children: (node.children ?? []).map((c: any) => c.id),
      props: node.props ?? {},
      style: node.style ?? {},
    };
    for (const child of node.children ?? []) walk(child, node.id);
  };
  walk(doc.root, null);
  return { rootId: doc.root.id, nodes };
};

const getTextFromDoc = (doc: DocView | null | undefined, id: string, fallback: string) =>
  (doc?.nodes?.[id]?.props?.text as string | undefined) ?? fallback;

const setTextInDoc = (dispatch: React.Dispatch<any> | null | undefined, id: string, text: string) => {
  if (!dispatch) return;
  dispatch({ type: 'SET_NODE_PROPS', id, patch: { text } });
};

const parsePx = (v: any): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d+(?:\.\d+)?)px$/);
  if (!m) return null;
  return Number(m[1]);
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const HoverImageEditor: React.FC<{
  editable: boolean;
  selected?: boolean;
  src: string;
  alt: string;
  fit?: string;
  onSetSrc: (next: string) => void;
  onSetAlt?: (next: string) => void;
  onSelect?: () => void;
}> = ({ editable, selected = false, src, alt, fit, onSetSrc, onSetAlt, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(src);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setUrl(src), [src]);

  if (!editable) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-200 ${
        selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
    >
      <div className="pointer-events-auto absolute top-3 left-3 flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-black/70 px-3 py-2 text-xs font-extrabold text-white shadow hover:bg-black/80"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
            setOpen((v) => !v);
          }}
        >
          Edit image
        </button>
        <button
          type="button"
          className="rounded-lg bg-black/70 px-3 py-2 text-xs font-extrabold text-white shadow hover:bg-black/80"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
            fileRef.current?.click();
          }}
        >
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const dataUrl = await readFileAsDataUrl(file);
            onSetSrc(dataUrl);
            e.currentTarget.value = '';
          }}
        />
      </div>

      {open ? (
        <div
          className="pointer-events-auto absolute top-14 left-3 w-[320px] rounded-xl border border-white/20 bg-black/80 p-3 text-white shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <label className="block">
            <div className="mb-1 text-[11px] font-bold text-white/80">Image URL</div>
            <input
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white outline-none"
              placeholder="https://..."
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-500"
              onClick={() => onSetSrc(url)}
            >
              Apply
            </button>
            <button
              type="button"
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          {onSetAlt ? (
            <label className="mt-3 block">
              <div className="mb-1 text-[11px] font-bold text-white/80">Alt</div>
              <input
                value={alt}
                onChange={(e) => onSetAlt(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white outline-none"
              />
            </label>
          ) : null}

          {fit ? <div className="mt-2 text-[11px] text-white/60">fit: {fit}</div> : null}
        </div>
      ) : null}
    </div>
  );
};

const InlineEditableText: React.FC<{
  tag: keyof JSX.IntrinsicElements;
  value: string;
  editable: boolean;
  selected: boolean;
  onSelect: () => void;
  onChange: (next: string) => void;
  className?: string;
}> = ({ tag, value, editable, selected, onSelect, onChange, className }) => {
  const Tag: any = tag;
  const ref = useRef<any>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  useEffect(() => {
    if (!editable || !selected || !editing) return;
    ref.current?.focus?.();
  }, [editable, editing, selected]);

  return (
    <Tag
      ref={ref}
      className={className}
      contentEditable={editable && selected && editing}
      suppressContentEditableWarning
      onMouseDown={(e: any) => {
        if (!editable) return;
        e.stopPropagation();
        onSelect();
        setEditing(true);
      }}
      onInput={(e: any) => {
        if (!editable || !editing) return;
        onChange(e.currentTarget.innerText);
      }}
      onBlur={(e: any) => {
        if (!editable || !editing) return;
        setEditing(false);
        onChange(e.currentTarget.innerText);
      }}
      style={editable ? { cursor: 'text' } : undefined}
    >
      {value}
    </Tag>
  );
};

const getChildTextNodeIds = (doc: DocView, nodeId: string) => {
  const node = doc.nodes[nodeId];
  if (!node) return { titleId: null as string | null, bodyId: null as string | null };
  const textChildren = (node.children ?? []).filter((cid) => doc.nodes[cid]?.type === 'text');
  return { titleId: textChildren[0] ?? null, bodyId: textChildren[1] ?? null };
};

const FeaturesGridView: React.FC<{
  doc: DocView;
  cardIds: string[];
}> = ({ doc, cardIds }) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
      {cardIds.map((cardId) => {
        const { titleId, bodyId } = getChildTextNodeIds(doc, cardId);
        const rawTitle = titleId ? (doc.nodes[titleId]?.props?.text as string) : 'عنوان';
        const token = rawTitle.split(' ')[0] ?? '';
        const hasIconToken = token.length > 0 && token.length <= 3 && rawTitle.startsWith(`${token} `);
        const title = hasIconToken ? rawTitle.slice(token.length + 1) : rawTitle;
        const body = bodyId ? (doc.nodes[bodyId]?.props?.text as string) : '...';
        const icon = ((doc.nodes[cardId]?.props?.icon as string | undefined) ?? (hasIconToken ? token : '')) || '';
        return (
          <div
            key={cardId}
            className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-4xl">
              {icon}
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">{title}</h3>
            <p className="text-gray-600 leading-relaxed mb-4">{body}</p>
          </div>
        );
      })}
    </div>
  );
};

const EditableDocCard: React.FC<{
  doc: DocView;
  cardId: string;
  selectedId: string | null | undefined;
  dispatch: React.Dispatch<any>;
  editable: boolean;
  className: (args: { isSelected: boolean; isOver: boolean }) => string;
  badge?: (args: { isSelected: boolean }) => React.ReactNode;
}> = ({ doc, cardId, selectedId, dispatch, editable, className, badge }) => {
  const parentId = doc.nodes[cardId]?.parentId ?? null;
  const sortable = useSortable({ id: cardId, data: { kind: 'node', nodeId: cardId, parentId } });
  const droppable = useDroppable({ id: `drop:${cardId}`, data: { kind: 'container', containerId: cardId } });
  const isSelected = selectedId === cardId;

  const { titleId, bodyId } = getChildTextNodeIds(doc, cardId);
  const title = titleId ? ((doc.nodes[titleId]?.props?.text as string) ?? '') : '';
  const body = bodyId ? ((doc.nodes[bodyId]?.props?.text as string) ?? '') : '';
  const icon = ((doc.nodes[cardId]?.props?.icon as string | undefined) ?? '') || '';

  return (
    <div
      ref={(el) => {
        sortable.setNodeRef(el);
        droppable.setNodeRef(el);
      }}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.35 : 1,
      }}
      className={className({ isSelected, isOver: droppable.isOver })}
      onMouseDown={(e) => {
        if (!editable) return;
        e.stopPropagation();
        dispatch({ type: 'SELECT', id: cardId });
      }}
    >
      {editable ? (
        <button
          type="button"
          className="absolute top-3 left-3 z-10 cursor-grab active:cursor-grabbing rounded-md bg-slate-900/90 px-2 py-1 text-[11px] font-bold text-white shadow"
          {...sortable.attributes}
          {...sortable.listeners}
          onMouseDown={(e) => {
            e.stopPropagation();
            dispatch({ type: 'SELECT', id: cardId });
          }}
          title="سحب"
        >
          ⠿
        </button>
      ) : null}

      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-5xl">{icon}</span>
      </div>

      {titleId ? (
        <InlineEditableText
          tag="h3"
          value={title}
          editable={editable}
          selected={selectedId === titleId}
          onSelect={() => dispatch({ type: 'SELECT', id: titleId })}
          onChange={(next) => setTextInDoc(dispatch, titleId, next)}
          className="font-bold text-2xl mb-3 outline-none"
        />
      ) : null}

      {bodyId ? (
        <InlineEditableText
          tag="p"
          value={body}
          editable={editable}
          selected={selectedId === bodyId}
          onSelect={() => dispatch({ type: 'SELECT', id: bodyId })}
          onChange={(next) => setTextInDoc(dispatch, bodyId, next)}
          className="mb-4 text-lg outline-none"
        />
      ) : null}

      {badge ? badge({ isSelected }) : null}
    </div>
  );
};

const EditableFeatureCard: React.FC<{
  doc: DocView;
  cardId: string;
  selectedId: string | null | undefined;
  dispatch: React.Dispatch<any>;
  editable: boolean;
}> = ({ doc, cardId, selectedId, dispatch, editable }) => {
  const parentId = doc.nodes[cardId]?.parentId ?? null;
  const sortable = useSortable({ id: cardId, data: { kind: 'node', nodeId: cardId, parentId } });
  const droppable = useDroppable({ id: `drop:${cardId}`, data: { kind: 'container', containerId: cardId } });
  const isSelected = selectedId === cardId;
  const nodeStyle = doc.nodes[cardId]?.style ?? {};
  const widthPx = parsePx(nodeStyle.width);
  const heightPx = parsePx(nodeStyle.height);

  const { titleId, bodyId } = getChildTextNodeIds(doc, cardId);
  const rawTitle = titleId ? (doc.nodes[titleId]?.props?.text as string) : 'عنوان';
  const token = rawTitle.split(' ')[0] ?? '';
  const hasIconToken = token.length > 0 && token.length <= 3 && rawTitle.startsWith(`${token} `);
  const title = hasIconToken ? rawTitle.slice(token.length + 1) : rawTitle;
  const body = bodyId ? (doc.nodes[bodyId]?.props?.text as string) : '...';
  const icon = ((doc.nodes[cardId]?.props?.icon as string | undefined) ?? (hasIconToken ? token : '')) || '';

  const inner = (
    <div
      className={`relative group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${
        droppable.isOver ? 'ring-2 ring-indigo-500' : isSelected ? 'ring-2 ring-indigo-500' : editable ? 'ring-1 ring-transparent hover:ring-indigo-300' : ''
      }`}
      style={{ ...nodeStyle, width: undefined, height: undefined }}
      onMouseDown={(e) => {
        if (!editable) return;
        e.stopPropagation();
        dispatch({ type: 'SELECT', id: cardId });
      }}
    >
      {editable ? (
        <div className="pointer-events-none absolute -top-3 right-3 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-extrabold text-white shadow">
          {doc.nodes[cardId]?.name ?? 'Card'}
        </div>
      ) : null}

      {editable ? (
        <button
          type="button"
          className="absolute top-3 left-3 z-10 cursor-grab active:cursor-grabbing rounded-md bg-slate-900/90 px-2 py-1 text-[11px] font-bold text-white shadow"
          {...sortable.attributes}
          {...sortable.listeners}
          onMouseDown={(e) => {
            e.stopPropagation();
            dispatch({ type: 'SELECT', id: cardId });
          }}
          title="سحب"
        >
          ⠿
        </button>
      ) : null}

      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-4xl">
        {icon}
      </div>

      {titleId ? (
        <InlineEditableText
          tag="h3"
          value={title}
          editable={editable}
          selected={selectedId === titleId}
          onSelect={() => dispatch({ type: 'SELECT', id: titleId })}
          onChange={(next) => setTextInDoc(dispatch, titleId, next)}
          className="text-2xl font-bold text-gray-800 mb-4 outline-none"
        />
      ) : (
        <h3 className="text-2xl font-bold text-gray-800 mb-4">{title}</h3>
      )}

      {bodyId ? (
        <InlineEditableText
          tag="p"
          value={body}
          editable={editable}
          selected={selectedId === bodyId}
          onSelect={() => dispatch({ type: 'SELECT', id: bodyId })}
          onChange={(next) => setTextInDoc(dispatch, bodyId, next)}
          className="text-gray-600 leading-relaxed mb-4 outline-none"
        />
      ) : (
        <p className="text-gray-600 leading-relaxed mb-4">{body}</p>
      )}
    </div>
  );

  return (
    <div
      ref={(el) => {
        sortable.setNodeRef(el);
        droppable.setNodeRef(el);
      }}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.35 : 1,
      }}
    >
      <Resizable
        size={{
          width: widthPx ? `${widthPx}px` : (nodeStyle.width as any) ?? '100%',
          height: heightPx ? `${heightPx}px` : (nodeStyle.height as any) ?? 'auto',
        }}
        enable={
          editable && isSelected
            ? { top: false, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }
            : false
        }
        minWidth={180}
        minHeight={80}
        onResizeStop={(_, __, ref) => {
          const rect = ref.getBoundingClientRect();
          dispatch({ type: 'SET_NODE_STYLE', id: cardId, patch: { width: `${Math.round(rect.width)}px`, height: `${Math.round(rect.height)}px` } });
        }}
        style={{ width: '100%' }}
        handleStyles={
          editable && isSelected
            ? {
                bottomRight: { width: 12, height: 12, background: '#4f46e5', borderRadius: 999 },
                bottomLeft: { width: 12, height: 12, background: '#4f46e5', borderRadius: 999 },
                topRight: { width: 12, height: 12, background: '#4f46e5', borderRadius: 999 },
                topLeft: { width: 12, height: 12, background: '#4f46e5', borderRadius: 999 },
                right: { width: 6, background: '#4f46e5', borderRadius: 999 },
                left: { width: 6, background: '#4f46e5', borderRadius: 999 },
                bottom: { height: 6, background: '#4f46e5', borderRadius: 999 },
              }
            : undefined
        }
      >
        {inner}
      </Resizable>
    </div>
  );
};

const EditableFeaturesGrid: React.FC<{
  doc: DocView;
  selectedId: string | null | undefined;
  dispatch: React.Dispatch<any>;
  isDragging: boolean;
  dropIndicator: { parentId: string; index: number } | null;
  paletteDragType: Exclude<NodeType, 'page'> | null | undefined;
}> = ({ doc, selectedId, dispatch, isDragging, dropIndicator, paletteDragType }) => {
  const featuresNode = doc.nodes['features'];
  const allIds = featuresNode?.children ?? [];
  const cardIds = allIds.filter((cid) => doc.nodes[cid]?.type === 'card');
  const droppable = useDroppable({ id: 'drop:features', data: { kind: 'container', containerId: 'features' } });
  const showIndicator = isDragging && dropIndicator?.parentId === 'features';

  return (
    <div
      ref={droppable.setNodeRef}
      className={`grid md:grid-cols-2 lg:grid-cols-4 gap-8 ${droppable.isOver ? 'outline outline-2 outline-indigo-500 rounded-2xl' : ''}`}
    >
      {cardIds.length === 0 ? (
        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-600">
          {paletteDragType ? 'أسقط هنا لإضافة عنصر' : 'اسحب بطاقة من Blocks وأسقطها هنا'}
        </div>
      ) : null}

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        {cardIds.map((cardId, idx) => (
          <React.Fragment key={cardId}>
            {showIndicator && dropIndicator?.index === allIds.indexOf(cardId) ? (
              <div className="col-span-full h-1 rounded bg-indigo-500" />
            ) : null}
            <EditableFeatureCard doc={doc} cardId={cardId} selectedId={selectedId} dispatch={dispatch} editable={true} />
          </React.Fragment>
        ))}
        {showIndicator && dropIndicator?.index === allIds.length ? <div className="col-span-full h-1 rounded bg-indigo-500" /> : null}
      </SortableContext>
    </div>
  );
};

const getCardIds = (doc: DocView | null | undefined, sectionId: string) => {
  if (!doc) return [];
  const node = doc.nodes[sectionId];
  if (!node) return [];
  return (node.children ?? []).filter((cid) => doc.nodes[cid]?.type === 'card');
};

function SortableBlock({
  doc,
  nodeId,
  selectedId,
  dispatch,
  editable,
  children,
}: {
  doc: DocView;
  nodeId: string;
  selectedId: string | null | undefined;
  dispatch: React.Dispatch<any>;
  editable: boolean;
  children: React.ReactNode;
}) {
  const parentId = doc.nodes[nodeId]?.parentId ?? null;
  const sortable = useSortable({ id: nodeId, data: { kind: 'node', nodeId, parentId } });
  const isSelected = selectedId === nodeId;

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.35 : 1,
      }}
      className={`relative group rounded-2xl ${isSelected ? 'ring-2 ring-indigo-500' : editable ? 'ring-1 ring-transparent hover:ring-indigo-300' : ''}`}
      onMouseDown={(e) => {
        if (!editable) return;
        e.stopPropagation();
        dispatch({ type: 'SELECT', id: nodeId });
      }}
    >
      {editable ? (
        <button
          type="button"
          className="absolute -top-3 left-3 z-10 cursor-grab active:cursor-grabbing rounded-md bg-slate-900/90 px-2 py-1 text-[11px] font-bold text-white shadow"
          {...sortable.attributes}
          {...sortable.listeners}
          onMouseDown={(e) => {
            e.stopPropagation();
            dispatch({ type: 'SELECT', id: nodeId });
          }}
          title="سحب"
        >
          ⠿
        </button>
      ) : null}
      {children}
    </div>
  );
}

function BuilderNodePreview({
  doc,
  nodeId,
  selectedId,
  dispatch,
  editable,
}: {
  doc: DocView;
  nodeId: string;
  selectedId: string | null | undefined;
  dispatch: React.Dispatch<any>;
  editable: boolean;
}) {
  const node = doc.nodes[nodeId];
  if (!node) return null;

  if (node.type === 'card') {
    return <EditableFeatureCard doc={doc} cardId={nodeId} selectedId={selectedId} dispatch={dispatch} editable={editable} />;
  }

  if (node.type === 'text') {
    return (
      <div className="rounded-2xl bg-white/70 p-4">
        <InlineEditableText
          tag={(node.props?.variant ?? 'p') as any}
          value={(node.props?.text as string) ?? ''}
          editable={editable}
          selected={selectedId === nodeId}
          onSelect={() => dispatch({ type: 'SELECT', id: nodeId })}
          onChange={(next) => dispatch({ type: 'SET_NODE_PROPS', id: nodeId, patch: { text: next } })}
          className="outline-none"
        />
      </div>
    );
  }

  if (node.type === 'button') {
    return (
      <div className="rounded-2xl bg-white/70 p-4">
        <button type="button" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white">
          <span
            contentEditable={editable && selectedId === nodeId}
            suppressContentEditableWarning
            onInput={(e) => dispatch({ type: 'SET_NODE_PROPS', id: nodeId, patch: { text: (e.currentTarget as HTMLElement).innerText } })}
            className="outline-none"
          >
            {(node.props?.text as string) ?? 'زر'}
          </span>
        </button>
      </div>
    );
  }

  if (node.type === 'image') {
    const src = (node.props?.src as string | undefined) ?? '';
    const alt = (node.props?.alt as string | undefined) ?? '';
    const fit = (node.props?.fit as string | undefined) ?? 'cover';
    return (
      <div className="relative group rounded-2xl bg-white/70 p-4">
        {src ? <img src={src} alt={alt} className="w-full rounded-2xl" style={{ objectFit: fit as any }} /> : <div className="h-40 rounded-2xl bg-slate-100" />}
        <HoverImageEditor
          editable={editable}
          src={src}
          alt={alt}
          fit={fit}
          onSelect={() => dispatch({ type: 'SELECT', id: nodeId })}
          onSetSrc={(next) => dispatch({ type: 'SET_NODE_PROPS', id: nodeId, patch: { src: next } })}
          onSetAlt={(next) => dispatch({ type: 'SET_NODE_PROPS', id: nodeId, patch: { alt: next } })}
        />
      </div>
    );
  }

  if (node.type === 'divider') return <div className="h-px w-full bg-slate-300" />;
  if (node.type === 'spacer') return <div style={{ height: node.style?.height ?? 16 }} />;

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm font-bold text-slate-700">
      {node.name} ({node.type})
    </div>
  );
}

function BuilderDroppableBox({
  containerId,
  className,
  children,
  dispatch,
  onSelectId,
  isActive,
}: {
  containerId: string;
  className: string;
  children: React.ReactNode;
  dispatch: React.Dispatch<any>;
  onSelectId: string;
  isActive: boolean;
}) {
  const droppable = useDroppable({ id: `drop:${containerId}`, data: { kind: 'container', containerId } });
  return (
    <div
      ref={droppable.setNodeRef}
      className={`${className} ${isActive ? 'outline outline-2 outline-indigo-500 rounded-2xl' : ''}`}
      onMouseDown={(e) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT', id: onSelectId });
      }}
    >
      {children}
    </div>
  );
}

function StaticNodePreview({ doc, nodeId }: { doc: DocView; nodeId: string }) {
  const node = doc.nodes[nodeId];
  if (!node) return null;

  if (node.type === 'card') {
    const { titleId, bodyId } = getChildTextNodeIds(doc, nodeId);
    const rawTitle = titleId ? (doc.nodes[titleId]?.props?.text as string) : 'عنوان';
    const token = rawTitle.split(' ')[0] ?? '';
    const hasIconToken = token.length > 0 && token.length <= 3 && rawTitle.startsWith(`${token} `);
    const title = hasIconToken ? rawTitle.slice(token.length + 1) : rawTitle;
    const body = bodyId ? (doc.nodes[bodyId]?.props?.text as string) : '...';
    const icon = ((doc.nodes[nodeId]?.props?.icon as string | undefined) ?? (hasIconToken ? token : '')) || '';
    return (
      <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-4xl">
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">{title}</h3>
        <p className="text-gray-600 leading-relaxed mb-4">{body}</p>
      </div>
    );
  }

  if (node.type === 'text') return <div className="rounded-2xl bg-white/70 p-4">{(node.props?.text as string) ?? ''}</div>;
  if (node.type === 'button') return <button className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white">{(node.props?.text as string) ?? 'زر'}</button>;
  if (node.type === 'image') {
    const src = (node.props?.src as string | undefined) ?? '';
    const alt = (node.props?.alt as string | undefined) ?? '';
    const fit = (node.props?.fit as string | undefined) ?? 'cover';
    return src ? <img src={src} alt={alt} className="w-full rounded-2xl" style={{ objectFit: fit as any }} /> : <div className="h-40 rounded-2xl bg-slate-100" />;
  }
  if (node.type === 'divider') return <div className="h-px w-full bg-slate-300" />;
  if (node.type === 'spacer') return <div style={{ height: node.style?.height ?? 16 }} />;
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm font-bold text-slate-700">{node.name}</div>;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  contentOverride,
  builderDoc,
  builderMode = 'view',
  builderSelectedId,
  builderDispatch,
  paletteDragType,
  isDragging = false,
  dropIndicator = null,
}) => {
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleLoginClick = () => navigate(sessionToken ? '/dashboard' : '/login');

  // --- CMS Data Fetching ---
  const { data: fetchedContent } = trpc.cms.getContent.useQuery({});
  const content = contentOverride ?? fetchedContent;
  const docFromCms = useMemo<BuilderDocument | null>(() => {
    const raw = content?.['page_builder_layout']?.value;
    return parseBuilderDocument(raw);
  }, [content?.['page_builder_layout']?.value]);
  const treeDoc = builderDoc ?? docFromCms;
  const doc = useMemo(() => (treeDoc ? toDocView(treeDoc) : null), [treeDoc]);
  
  // Helper to safely get content
  const t = (key: string, defaultVal: string) => content?.[key]?.value || defaultVal;
  
  // Parse Cards
  const cardsRaw = content?.['cards_data']?.value;
  const dynamicCards = cardsRaw ? JSON.parse(cardsRaw) : null;
  // -------------------------

  const isEditing = builderMode === 'edit' && Boolean(builderDispatch) && Boolean(doc);
  const isBuilderPreview = Boolean(builderDoc);
  const heroExtras = useMemo(() => {
    if (!doc?.nodes?.hero) return [];
    // Exclude special nodes that are rendered elsewhere (e.g. background image).
    const exclude = new Set(['hero_bg_image', 'hero_title', 'hero_sub', 'hero_btn_primary', 'hero_btn_secondary']);
    return (doc.nodes.hero.children ?? []).filter((cid) => !exclude.has(cid));
  }, [doc]);

  const defaultMenuItems: NavGroup[] = useMemo(
    () => [
      {
        id: 'admin',
        label: 'الإدارة و التنظيم',
        items: [
          { label: 'معلومات عن الهيكل الإداري للمهنة', href: '/pages/structure' },
          { label: 'الاتصال و التفاعل مع الهيئة الوطنية للعدول', href: '/pages/contact-national' },
          { label: 'الربط و التنسيق مع المجالس الجهوية للعدول', href: '/pages/regional-councils' },
        ],
      },
      {
        id: 'services',
        label: 'تلقي الشهادات العدلية و تحريرها',
        highlighted: true,
        items: [
          { label: 'منصة الشهادات العدلية', href: '/pages/certificates', hasAuth: true },
          { label: 'منصة الإيداع الإلكتروني', href: '/pages/e-deposit' },
        ],
      },
      {
        id: 'electronic-services',
        label: 'خدمات الكترونية',
        items: [
          { label: 'طلبات استخراج نسخ العقود/الشهادات العدلية', href: '/public/copy-extraction' },
          { label: 'طلبات البحث عن العقود/الشهادات العدلية', href: '/public/search-deeds' },
        ],
      },
      {
        id: 'knowledge',
        label: 'المعرفة و التكوين',
        items: [
          { label: 'الأنشطة و البرامج المهنية', href: '/knowledge/professional-programs' },
          { label: 'الخزانة السمعية البصرية', href: '/knowledge/audiovisual-library' },
          { label: 'الأرشيف الرقمي', href: '/knowledge/digital-archive' },
          { label: 'الاجتماعات و الحوارات', href: '/knowledge/meetings-dialogues' },
        ],
      },
      {
        id: 'news',
        label: 'الإعلام و المستجدات',
        items: [
          { label: 'نافذة تذكيرية ذكية', href: '/news/smart-reminder' },
          { label: 'أحدث الأخبار القانونية', href: '/news/legal-news' },
          { label: 'التعديلات التشريعية', href: '/news/legislative-changes' },
        ],
      },
      {
        id: 'directory',
        label: 'اسماء العدول',
        path: '/directory',
        items: [],
      },
    ],
    []
  );

  const menuItems = defaultMenuItems;

  const aboutBullets = useMemo(() => {
    return safeJsonParse<{ title: string; description: string }[]>(content?.['about_bullets']?.value, [
      { title: 'توفير 70% من الوقت', description: 'إنجاز المعاملات في دقائق بدلاً من ساعات' },
      { title: 'دقة 99.9%', description: 'لا أخطاء في الحسابات والوثائق' },
      { title: 'أمان متقدم', description: 'تشفير عالي المستوى لحماية بياناتك' },
    ]);
  }, [content?.['about_bullets']?.value]);

  const aiCardsFromCms = useMemo(() => {
    return safeJsonParse<{ title: string; description: string; icon: string }[]>(content?.['ai_cards']?.value, [
      { title: 'مراجعة تلقائية', description: 'فحص فوري لجميع بنود العقد واكتشاف أي تناقضات أو نقاط ضعف', icon: '🧠' },
      { title: 'توصيات ذكية', description: 'اقتراحات تلقائية لتحسين صياغة العقود وفق أفضل الممارسات القانونية', icon: '🔒' },
      { title: 'إجابات فورية', description: 'احصل على إجابات قانونية دقيقة لأي استفسار في ثوانٍ معدودة', icon: '⚡' },
    ]);
  }, [content?.['ai_cards']?.value]);

  const roleCardsFromCms = useMemo(() => {
    return safeJsonParse<
      { title: string; description: string; icon: string; badge?: string; theme?: 'light' | 'gold' }[]
    >(content?.['role_cards']?.value, [
      { title: 'السلطة الحكومية', description: 'الإشراف والمراقبة الشاملة', icon: '🏛️', badge: 'نظام داخلي سري', theme: 'light' },
      { title: 'الهيئة الوطنية للعدول', description: 'إدارة شؤون العدول', icon: '📜', badge: 'نظام داخلي سري', theme: 'light' },
      { title: 'القاضي المكلف', description: 'إصدار الأذونات', icon: '⚖️', badge: 'نظام داخلي سري', theme: 'light' },
      { title: 'العدل', description: 'إدارة العقود والوثائق', icon: '✍️', badge: '✅ التسجيل متاح', theme: 'gold' },
    ]);
  }, [content?.['role_cards']?.value]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Two-Row Header - Mahakim Style */}
      <header
        className={`${isBuilderPreview ? 'sticky top-0 z-40' : 'fixed top-0 left-0 right-0 z-50'} transition-all duration-300`}
      >
        {/* Top Row - Gray Navigation Bar */}
        <div className="bg-gray-700 text-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-10">
              {/* Right side - Navigation Menu */}
              <nav className="hidden xl:flex items-center gap-6">
                {/* Home Icon */}
                <a 
                  href="#home" 
                  className="text-white hover:text-yellow-400 transition-colors"
                  title="الرئيسية"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </a>

                {/* Hamburger Menu Icon */}
                <button className="text-white hover:text-yellow-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Menu Items */}
                {menuItems.map((menu) => (
                  <div key={menu.id} className="relative group">
                    {menu.items.length > 0 ? (
                      <>
                        <button className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                          menu.highlighted 
                            ? 'text-yellow-400 hover:text-yellow-300' 
                            : 'text-white hover:text-yellow-400'
                        }`}>
                          {menu.label}
                          <svg className="w-3 h-3 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <div className="absolute top-full right-0 mt-0 bg-white rounded-b-lg shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[280px] z-50">
                          {menu.items.map((item, idx) => (
                            <div key={idx}>
                              <a
                                href={item.href}
                                onClick={(e) => {
                                  if (item.href && !item.href.startsWith('http') && !item.href.startsWith('#')) {
                                    e.preventDefault();
                                    navigate(item.href);
                                  }
                                }}
                                className="block px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors text-sm border-b border-gray-50"
                              >
                                {item.label}
                              </a>
                              {item.hasAuth && (
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleLoginClick}
                                      className="flex-1 px-3 py-2 text-gray-700 hover:text-gray-900 font-medium text-xs transition-colors border border-gray-200 rounded-md hover:bg-white"
                                    >
                                      تسجيل الدخول
                                    </button>
                                    <button
                                      onClick={() => navigate('/register')}
                                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors font-medium text-xs"
                                    >
                                      إنشاء حساب
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      (menu as any).path ? (
                        <button
                          onClick={() => navigate((menu as any).path)}
                          className="text-sm font-medium transition-colors text-white hover:text-yellow-400"
                        >
                          {menu.label}
                        </button>
                      ) : (
                        <a
                          href={`#${menu.id}`}
                          className="text-sm font-medium transition-colors text-white hover:text-yellow-400"
                        >
                          {menu.label}
                        </a>
                      )
                    )}
                  </div>
                ))}
              </nav>

              {/* Left side - Language Selector */}
              <div className="hidden md:flex items-center gap-4">
                <span className="text-sm text-white/80">العربية</span>
              </div>

              {/* Mobile Menu Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 text-white hover:text-yellow-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row - White Logo Bar */}
        <div className={`bg-white shadow-md transition-all duration-300 ${scrolled ? 'py-2' : 'py-3'}`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center">
              {/* Right side - Ministry Logo (logo2.png) */}
              <div className="flex items-center gap-4">
                <img 
                  src="/logos/logo2.png" 
                  alt="وزارة العدل" 
                  className={`object-contain transition-all duration-300 ${scrolled ? 'h-12' : 'h-16'}`}
                />
              </div>

              {/* Center - Main Title */}
              <div className="hidden lg:block text-center flex-1">
                <h2 className="text-5xl font-black text-gray-800 font-maghribi">مهنة العدول</h2>
              </div>

              {/* Left side - Search, Ministry Text, and Adoul Logo */}
              <div className="flex items-center gap-6">
                {/* Search */}
                <div className="hidden lg:flex items-center gap-2 text-gray-500 border-r border-gray-300 pr-6">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-sm">بحث في الموقع</span>
                </div>

                {/* Ministry Text */}
                <div className="hidden sm:block text-left">
                  <p className="text-xs text-gray-500">المملكة المغربية</p>
                  <h1 className="text-sm font-bold text-gray-800">وزارة العدل</h1>
                  <p className="text-xs text-gray-600">الهيئة الوطنية للعدول</p>
                </div>

                {/* Adoul Logo */}
                <img 
                  src="/logos/adoul-logo.jpg" 
                  alt="شعار العدول" 
                  className={`object-contain rounded-lg transition-all duration-300 ${scrolled ? 'h-12' : 'h-16'}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-white border-t border-gray-100 shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-4">
              {/* Home Link */}
              <a
                href="#home"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                الرئيسية
              </a>

              {/* Menu Items */}
              {menuItems.map((menu) => (
                <div key={menu.id} className="mt-2">
                  {menu.items.length > 0 ? (
                    <>
                      <button
                        onClick={() => toggleMobileDropdown(menu.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 font-medium rounded-lg ${
                          menu.highlighted 
                            ? 'bg-gray-700 text-white hover:bg-gray-600' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {menu.label}
                        <svg 
                          className={`w-4 h-4 transition-transform ${openDropdown === menu.id ? 'rotate-180' : ''} ${menu.highlighted ? 'text-white' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openDropdown === menu.id && (
                        <div className={`mr-4 mt-1 border-r-2 ${menu.highlighted ? 'border-gray-400' : 'border-gray-200'}`}>
                          {menu.items.map((item, idx) => (
                            <div key={idx}>
                              <a
                                href={item.href}
                                onClick={(e) => {
                                  setMobileMenuOpen(false);
                                  if (item.href && !item.href.startsWith('http') && !item.href.startsWith('#')) {
                                    e.preventDefault();
                                    navigate(item.href);
                                  }
                                }}
                                className="block px-4 py-2 text-gray-600 hover:text-gray-900 text-sm"
                              >
                                {item.label}
                              </a>
                              {item.hasAuth && (
                                <div className="px-4 py-2 space-y-2">
                                  <button
                                    onClick={() => { handleLoginClick(); setMobileMenuOpen(false); }}
                                    className="w-full px-4 py-2 text-gray-700 font-medium text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
                                  >
                                    تسجيل الدخول
                                  </button>
                                  <button
                                    onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                                    className="w-full px-4 py-2 bg-gray-700 text-white font-medium text-sm rounded-lg hover:bg-gray-600"
                                  >
                                    إنشاء حساب جديد
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    (menu as any).path ? (
                      <button
                        onClick={() => { navigate((menu as any).path); setMobileMenuOpen(false); }}
                        className="w-full flex items-center px-4 py-3 font-medium rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        {menu.label}
                      </button>
                    ) : (
                      <a
                        href={`#${menu.id}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center px-4 py-3 font-medium rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        {menu.label}
                      </a>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section with Video/Image Background */}
      <section id="home" className="relative h-screen overflow-hidden group">
        {/* Background Logic */}
        <div className="absolute inset-0 z-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            preload="auto"
            className="w-full h-full object-cover"
          >
            <source src="/whatsapp_hero_video.mp4" type="video/mp4" />
            <source src="/WhatsApp Video 2026-09-01 at 5.44.00 PM.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        </div>

        {/* Hover-to-edit hero background (must sit above content) */}
        {(() => {
          const hasHeroBgNode = Boolean(doc?.nodes?.['hero_bg_image']);
          if (!hasHeroBgNode) return null;
          const builderSrc = (doc?.nodes?.['hero_bg_image']?.props?.src as string | undefined) ?? '';
          const cmsSrc = (content?.['hero_image']?.value as string | undefined) ?? '';
          const src = builderSrc || cmsSrc;
          const alt = (doc?.nodes?.['hero_bg_image']?.props?.alt as string | undefined) ?? 'Hero Background';
          const fit = (doc?.nodes?.['hero_bg_image']?.props?.fit as string | undefined) ?? 'cover';
          const isHeroBgSelected = builderSelectedId === 'hero_bg_image';
          return (
            <div className="pointer-events-none absolute inset-0 z-30">
              <HoverImageEditor
                editable={Boolean(isEditing && builderDispatch)}
                selected={Boolean(isEditing && isHeroBgSelected)}
                src={src}
                alt={alt}
                fit={fit}
                onSelect={() => builderDispatch?.({ type: 'SELECT', id: 'hero_bg_image' })}
                onSetSrc={(next) => builderDispatch?.({ type: 'SET_NODE_PROPS', id: 'hero_bg_image', patch: { src: next } })}
                onSetAlt={(next) => builderDispatch?.({ type: 'SET_NODE_PROPS', id: 'hero_bg_image', patch: { alt: next } })}
              />
            </div>
          );
        })()}

	        {/* Hero Content */}
	        <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
	          {builderDispatch && doc ? (
	            <BuilderDroppableBox
	              containerId="hero"
	              className="max-w-5xl"
	              dispatch={builderDispatch}
	              onSelectId="hero"
	              isActive={isDragging && dropIndicator?.parentId === 'hero'}
	            >
	              <div>
	            <h1
	              className={`relative text-6xl md:text-7xl font-bold font-maghribi text-white mb-6 drop-shadow-2xl leading-tight ${
	                builderMode === 'edit' ? 'rounded-xl ring-1 ring-transparent hover:ring-yellow-400/70' : ''
	              }`}
	              data-builder="hero_title"
	              contentEditable={builderMode === 'edit'}
	              suppressContentEditableWarning
	              onMouseDown={(e) => {
	                if (builderMode !== 'edit') return;
	                e.stopPropagation();
	                builderDispatch?.({ type: 'SELECT', id: 'hero_title' });
	              }}
	              onInput={(e) => {
	                if (builderMode !== 'edit') return;
	                setTextInDoc(builderDispatch, 'hero_title', (e.currentTarget as HTMLElement).innerText);
	              }}
	            >
              {getTextFromDoc(doc, 'hero_title', t('hero_title', 'مهنة العدول'))}
            </h1>

            <p
              className={`relative text-xl md:text-2xl text-white/95 mb-12 max-w-3xl mx-auto drop-shadow-lg leading-relaxed whitespace-pre-line ${
                builderMode === 'edit' ? 'rounded-xl ring-1 ring-transparent hover:ring-yellow-400/70' : ''
              }`}
              data-builder="hero_sub"
              contentEditable={builderMode === 'edit'}
              suppressContentEditableWarning
              onMouseDown={(e) => {
                if (builderMode !== 'edit') return;
                e.stopPropagation();
                builderDispatch?.({ type: 'SELECT', id: 'hero_sub' });
              }}
              onInput={(e) => {
                if (builderMode !== 'edit') return;
                setTextInDoc(builderDispatch, 'hero_sub', (e.currentTarget as HTMLElement).innerText);
              }}
            >
              {getTextFromDoc(
                doc,
                'hero_sub',
                t('hero_subtitle', 'منصة رقمية متكاملة لإدارة عقود الزواج، الرسوم، والوثائق العدلية\nبكفاءة وأمان عاليين بتقنيات حديثة')
              )}
            </p>

	            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <button
                onClick={() => {
                  const href = (doc?.nodes?.['hero_btn_primary']?.props?.href as string | undefined) ?? '/register';
                  if (href.startsWith('#')) document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                  else navigate(href);
                }}
                onMouseDown={(e) => {
                  if (!isEditing) return;
                  e.stopPropagation();
                  builderDispatch?.({ type: 'SELECT', id: 'hero_btn_primary' });
                }}
                className={`px-10 py-5 bg-white text-gray-800 text-lg font-bold rounded-xl hover:bg-yellow-400 hover:text-gray-900 transition-all transform hover:scale-105 shadow-2xl ${
                  isEditing && builderSelectedId === 'hero_btn_primary' ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                <span
                  contentEditable={isEditing && builderSelectedId === 'hero_btn_primary'}
                  suppressContentEditableWarning
                  onInput={(e) => {
                    if (!isEditing) return;
                    setTextInDoc(builderDispatch, 'hero_btn_primary', (e.currentTarget as HTMLElement).innerText);
                  }}
                  className="outline-none"
                >
                  {getTextFromDoc(doc, 'hero_btn_primary', 'ابدأ الآن')}
                </span>
              </button>
              <button
                onClick={() => {
                  const href = (doc?.nodes?.['hero_btn_secondary']?.props?.href as string | undefined) ?? '#features';
                  if (href.startsWith('#')) document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                  else navigate(href);
                }}
                onMouseDown={(e) => {
                  if (!isEditing) return;
                  e.stopPropagation();
                  builderDispatch?.({ type: 'SELECT', id: 'hero_btn_secondary' });
                }}
                className={`px-10 py-5 bg-transparent border-2 border-white text-white text-lg font-bold rounded-xl hover:bg-white hover:text-gray-900 transition-all transform hover:scale-105 shadow-2xl ${
                  isEditing && builderSelectedId === 'hero_btn_secondary' ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                <span
                  contentEditable={isEditing && builderSelectedId === 'hero_btn_secondary'}
                  suppressContentEditableWarning
                  onInput={(e) => {
                    if (!isEditing) return;
                    setTextInDoc(builderDispatch, 'hero_btn_secondary', (e.currentTarget as HTMLElement).innerText);
                  }}
                  className="outline-none"
                >
                  {getTextFromDoc(doc, 'hero_btn_secondary', 'اكتشف المميزات')}
                </span>
              </button>
	            </div>

	            {doc && heroExtras.length ? (
	              <div className="mt-10 space-y-6 text-right">
		                <SortableContext items={heroExtras} strategy={verticalListSortingStrategy}>
		                  {heroExtras.map((nid) => {
		                    const t = doc.nodes[nid]?.type;
		                    if (t === 'card') {
		                      return (
		                        <EditableFeatureCard
		                          key={nid}
		                          doc={doc}
		                          cardId={nid}
		                          selectedId={builderSelectedId}
		                          dispatch={builderDispatch as any}
		                          editable={isEditing}
		                        />
		                      );
		                    }

		                    return (
		                      <SortableBlock
		                        key={nid}
		                        doc={doc}
		                        nodeId={nid}
		                        selectedId={builderSelectedId}
		                        dispatch={builderDispatch as any}
		                        editable={isEditing}
		                      >
		                        <BuilderNodePreview
		                          doc={doc}
		                          nodeId={nid}
		                          selectedId={builderSelectedId}
		                          dispatch={builderDispatch as any}
		                          editable={isEditing}
		                        />
		                      </SortableBlock>
		                    );
		                  })}
		                </SortableContext>
	              </div>
	            ) : null}
	              </div>
	            </BuilderDroppableBox>
		          ) : (
		            <div className="max-w-5xl">
		              <h1 className="text-6xl md:text-7xl font-bold font-maghribi text-white mb-6 drop-shadow-2xl leading-tight">
		                {getTextFromDoc(doc, 'hero_title', t('hero_title', 'مهنة العدول'))}
		              </h1>
		              <p className="text-xl md:text-2xl text-white/95 mb-12 max-w-3xl mx-auto drop-shadow-lg leading-relaxed whitespace-pre-line">
		                {getTextFromDoc(
		                  doc,
		                  'hero_sub',
		                  t(
		                    'hero_subtitle',
		                    'منصة رقمية متكاملة لإدارة عقود الزواج، الرسوم، والوثائق العدلية\nبكفاءة وأمان عاليين بتقنيات حديثة'
		                  )
		                )}
		              </p>

		              <div className="flex flex-col sm:flex-row justify-center gap-6">
		                <a
		                  href="#features"
		                  className="px-10 py-5 bg-white text-gray-800 text-lg font-bold rounded-xl hover:bg-yellow-400 hover:text-gray-900 transition-all transform hover:scale-105 shadow-2xl"
		                >
		                  {getTextFromDoc(doc, 'hero_btn_primary', 'ابدأ الآن')}
		                </a>
		                <a
		                  href="#features"
		                  className="px-10 py-5 bg-transparent border-2 border-white text-white text-lg font-bold rounded-xl hover:bg-white hover:text-gray-900 transition-all transform hover:scale-105 shadow-2xl"
		                >
		                  {getTextFromDoc(doc, 'hero_btn_secondary', 'اكتشف المميزات')}
		                </a>
		              </div>

		              {doc && heroExtras.length ? (
		                <div className="mt-10 space-y-6 text-right">
		                  {heroExtras.map((nid) => (
		                    <BuilderNodePreview
		                      key={nid}
		                      doc={doc}
		                      nodeId={nid}
		                      selectedId={builderSelectedId}
		                      dispatch={builderDispatch as any}
		                      editable={false}
		                    />
		                  ))}
		                </div>
		              ) : null}
		            </div>
		          )}

            {/* Scroll indicator */}
	            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
	              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
	                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
	              </svg>
	            </div>
	        </div>

	      </section>

      {/* Featured Video Section (CMS Dynamic) */}
      {content?.['welcome_video']?.value && (
        <section className="bg-slate-900 py-16">
           <div className="max-w-5xl mx-auto px-4">
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                    <iframe 
                    src={content['welcome_video'].value} 
                    className="w-full h-full" 
                    title="Welcome Video"
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    ></iframe>
                </div>
           </div>
        </section>
      )}

      {/* Features Section - Scrollable Advertisement Sections */}
      <section id="features" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2
              className={`text-5xl font-bold font-maghribi text-gray-800 mb-4 ${
                isEditing ? 'rounded-xl ring-1 ring-transparent hover:ring-indigo-300' : ''
              }`}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onMouseDown={(e) => {
                if (!isEditing) return;
                e.stopPropagation();
                builderDispatch?.({ type: 'SELECT', id: 'features_heading' });
              }}
              onInput={(e) => {
                if (!isEditing) return;
                setTextInDoc(builderDispatch, 'features_heading', (e.currentTarget as HTMLElement).innerText);
              }}
            >
              {getTextFromDoc(doc, 'features_heading', 'منصة متكاملة للإدارة العدلية')}
            </h2>
            <div className="w-24 h-1 bg-gray-700 mx-auto mb-6"></div>
            <p
              className={`text-xl text-gray-600 max-w-3xl mx-auto ${
                isEditing ? 'rounded-xl ring-1 ring-transparent hover:ring-indigo-300' : ''
              }`}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onMouseDown={(e) => {
                if (!isEditing) return;
                e.stopPropagation();
                builderDispatch?.({ type: 'SELECT', id: 'features_subtitle' });
              }}
              onInput={(e) => {
                if (!isEditing) return;
                setTextInDoc(builderDispatch, 'features_subtitle', (e.currentTarget as HTMLElement).innerText);
              }}
            >
              {getTextFromDoc(doc, 'features_subtitle', 'اكتشف كيف يمكن لنظامنا الرقمي تحسين كفاءة عملك وتوفير الوقت')}
            </p>
          </div>

	          {doc?.nodes?.['features']?.children?.length ? (
	            builderMode === 'edit' && builderDispatch ? (
	              <EditableFeaturesGrid
	                doc={doc}
	                selectedId={builderSelectedId}
	                dispatch={builderDispatch}
	                isDragging={Boolean(isDragging)}
	                dropIndicator={dropIndicator}
	                paletteDragType={paletteDragType}
	              />
	            ) : (
	              <FeaturesGridView
	                doc={doc}
	                cardIds={(doc.nodes['features'].children ?? []).filter((cid) => doc.nodes[cid]?.type === 'card')}
	              />
	            )
	          ) : (
	            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
	            {dynamicCards && dynamicCards.length > 0 ? dynamicCards.map((card: any, idx: number) => (
	               <div key={idx} className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
	                 <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-4xl">
	                   {card.icon}
	                 </div>
	                 <h3 className="text-2xl font-bold text-gray-800 mb-4">{card.title}</h3>
	                 <p className="text-gray-600 leading-relaxed mb-4">{card.description}</p>
	               </div>
	            )) : (
	                /* Fallback Static Cards */
	                <>
	                {/* Feature 1 - Marriage Contracts */}
	                <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">عقود الزواج الإلكترونية</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                    نظام متقدم لإنشاء وإدارة عقود الزواج بشكل رقمي مع التوقيع الإلكتروني الآمن
                </p>
                <ul className="space-y-2 text-gray-600">
                    {/* ... (truncated static list items for brevity, they are just visual) ... */}
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>توقيع رقمي آمن</span></li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>أرشفة تلقائية</span></li>
                </ul>
                </div>
                
                {/* Feature 2 - Documents Archive */}
                <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                     <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">الأرشيف الرقمي</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                    حفظ وتوثيق جميع العقود والمستندات في قاعدة بيانات آمنة وسهلة الوصول
                </p>
                 <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>بحث متقدم</span></li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>نسخ احتياطية</span></li>
                </ul>
                </div>

                {/* Feature 3 - Fees Management */}
                <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">احتساب الرسوم</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                    نظام ذكي لاحتساب وإدارة الرسوم العدلية والضرائب بدقة وشفافية عالية
                </p>
                 <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>حساب دقيق</span></li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>تقارير مالية</span></li>
                </ul>
                </div>

                 {/* Feature 4 - E-Services */}
                <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">خدمات إلكترونية</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                     بوابة شاملة للخدمات الإلكترونية تتيح للمواطنين والعدول إنجاز المعاملات عن بعد
                </p>
                 <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>متاح 24/7</span></li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>سهولة الاستخدام</span></li>
                </ul>
                </div>
                </>
	            )}
	          </div>
	          )}
	        </div>
	      </section>

      {/* About */}
      <section id="about" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4">
             <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-gradient-to-br from-gray-700 to-gray-600 rounded-3xl p-12 shadow-2xl">
                <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-sm">
                  <div className="text-6xl text-white mb-6">{t('about_right_icon', '🚀')}</div>
                  <h3 className="text-3xl font-bold text-white mb-4">{t('about_right_title', 'التحول الرقمي الكامل')}</h3>
                  <p className="text-white/90 text-lg">
                    {t(
                      'about_right_text',
                      'لا مزيد من الأوراق والملفات المتناثرة. كل شيء منظم ومرتب في منصة واحدة سهلة الاستخدام'
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-4xl md:text-5xl font-bold font-maghribi text-gray-800 mb-6 leading-tight">
                {t('about_title_line1', 'ودّع الأوراق التقليدية')}
                <br />
                <span className="text-gray-700">{t('about_title_line2', 'مرحباً بالمستقبل')}</span>
              </h2>
               <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {t('about_subtitle', 'نظام متكامل يحول مكتبك العدلي إلى بيئة رقمية 100% بدون أي تعقيدات')}
              </p>
              <div className="space-y-4">
                {aboutBullets.map((b, idx) => (
                  <div key={`${b.title}-${idx}`} className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg mb-1">{b.title}</h4>
                      <p className="text-gray-600">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI */}
      <section id="ai" className="bg-gradient-to-br from-gray-900 to-gray-800 py-24 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-yellow-400 text-gray-900 px-6 py-2 rounded-full font-bold mb-6">
              <InlineEditableText
                tag="span"
                value={getTextFromDoc(doc, 'ai_badge', t('ai_badge', 'مدعوم بالذكاء الاصطناعي'))}
                editable={isEditing}
                selected={builderSelectedId === 'ai_badge'}
                onSelect={() => builderDispatch?.({ type: 'SELECT', id: 'ai_badge' })}
                onChange={(next) => setTextInDoc(builderDispatch, 'ai_badge', next)}
                className="outline-none"
              />
            </div>
            <InlineEditableText
              tag="h2"
              value={getTextFromDoc(doc, 'ai_title', t('ai_title', 'العدل المساعد الذكي'))}
              editable={isEditing}
              selected={builderSelectedId === 'ai_title'}
              onSelect={() => builderDispatch?.({ type: 'SELECT', id: 'ai_title' })}
              onChange={(next) => setTextInDoc(builderDispatch, 'ai_title', next)}
              className="text-5xl font-bold font-maghribi mb-6 outline-none"
            />
            <InlineEditableText
              tag="p"
              value={getTextFromDoc(doc, 'ai_subtitle', t('ai_subtitle', 'تقنية متقدمة لمساعدتك في مراجعة العقود واكتشاف الأخطاء القانونية بسرعة.'))}
              editable={isEditing}
              selected={builderSelectedId === 'ai_subtitle'}
              onSelect={() => builderDispatch?.({ type: 'SELECT', id: 'ai_subtitle' })}
              onChange={(next) => setTextInDoc(builderDispatch, 'ai_subtitle', next)}
              className="text-xl text-gray-300 max-w-3xl mx-auto whitespace-pre-line outline-none"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {doc && getCardIds(doc, 'ai').length
              ? getCardIds(doc, 'ai').map((cardId) => {
                  const { titleId, bodyId } = getChildTextNodeIds(doc, cardId);
                  const icon = (doc.nodes[cardId]?.props?.icon as string | undefined) ?? '';
                  return (
                    <div
                      key={cardId}
                      className={`bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 ${
                        isEditing ? 'ring-1 ring-transparent hover:ring-yellow-400/60' : ''
                      }`}
                      onMouseDown={(e) => {
                        if (!isEditing) return;
                        e.stopPropagation();
                        builderDispatch?.({ type: 'SELECT', id: cardId });
                      }}
                    >
                      <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center mb-6 text-3xl text-gray-900">
                        {icon}
                      </div>
                      {titleId ? (
                        <InlineEditableText
                          tag="h3"
                          value={(doc.nodes[titleId]?.props?.text as string) ?? ''}
                          editable={isEditing}
                          selected={builderSelectedId === titleId}
                          onSelect={() => builderDispatch?.({ type: 'SELECT', id: titleId })}
                          onChange={(next) => setTextInDoc(builderDispatch, titleId, next)}
                          className="text-2xl font-bold mb-4 outline-none"
                        />
                      ) : null}
                      {bodyId ? (
                        <InlineEditableText
                          tag="p"
                          value={(doc.nodes[bodyId]?.props?.text as string) ?? ''}
                          editable={isEditing}
                          selected={builderSelectedId === bodyId}
                          onSelect={() => builderDispatch?.({ type: 'SELECT', id: bodyId })}
                          onChange={(next) => setTextInDoc(builderDispatch, bodyId, next)}
                          className="text-gray-300 outline-none"
                        />
                      ) : null}
                    </div>
                  );
                })
              : aiCardsFromCms.map((c, idx) => (
                  <div key={`${c.title}-${idx}`} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                    <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center mb-6 text-3xl text-gray-900">
                      {c.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{c.title}</h3>
                    <p className="text-gray-300">{c.description}</p>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section
        id="roles"
        className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 py-24 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="roles-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#roles-pattern)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <InlineEditableText
              tag="h2"
              value={getTextFromDoc(doc, 'roles_title', t('roles_title', 'للجميع في المنظومة العدلية'))}
              editable={isEditing}
              selected={builderSelectedId === 'roles_title'}
              onSelect={() => builderDispatch?.({ type: 'SELECT', id: 'roles_title' })}
              onChange={(next) => setTextInDoc(builderDispatch, 'roles_title', next)}
              className="text-5xl font-bold font-maghribi mb-4 outline-none"
            />
            <div className="w-24 h-1 bg-yellow-400 mx-auto mb-6"></div>
            <InlineEditableText
              tag="p"
              value={getTextFromDoc(doc, 'roles_subtitle', t('roles_subtitle', 'نظام شامل يخدم جميع الأطراف في العملية العدلية بكفاءة واحترافية'))}
              editable={isEditing}
              selected={builderSelectedId === 'roles_subtitle'}
              onSelect={() => builderDispatch?.({ type: 'SELECT', id: 'roles_subtitle' })}
              onChange={(next) => setTextInDoc(builderDispatch, 'roles_subtitle', next)}
              className="text-xl text-white/90 max-w-3xl mx-auto whitespace-pre-line outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {doc && getCardIds(doc, 'roles').length
              ? getCardIds(doc, 'roles').map((cardId) => {
                  const theme = (doc.nodes[cardId]?.props?.theme as 'light' | 'gold' | undefined) ?? 'light';
                  const badge = (doc.nodes[cardId]?.props?.badge as string | undefined) ?? '';
                  const isGold = theme === 'gold';
                  const { titleId, bodyId } = getChildTextNodeIds(doc, cardId);
                  return (
                    <div
                      key={cardId}
                      className={
                        isGold
                          ? `bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-8 text-center border-2 border-yellow-400 shadow-2xl transform hover:scale-105 transition-all ${
                              isEditing ? 'ring-1 ring-transparent hover:ring-white/40' : ''
                            }`
                          : `bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20 hover:bg-white/20 transition-all transform hover:scale-105 ${
                              isEditing ? 'ring-1 ring-transparent hover:ring-white/40' : ''
                            }`
                      }
                      onMouseDown={(e) => {
                        if (!isEditing) return;
                        e.stopPropagation();
                        builderDispatch?.({ type: 'SELECT', id: cardId });
                      }}
                    >
                      <div
                        className={
                          isGold
                            ? 'w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6'
                            : 'w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6'
                        }
                      >
                        <span className="text-5xl">{(doc.nodes[cardId]?.props?.icon as string) ?? ''}</span>
                      </div>
                      {titleId ? (
                        <InlineEditableText
                          tag="h3"
                          value={(doc.nodes[titleId]?.props?.text as string) ?? ''}
                          editable={isEditing}
                          selected={builderSelectedId === titleId}
                          onSelect={() => builderDispatch?.({ type: 'SELECT', id: titleId })}
                          onChange={(next) => setTextInDoc(builderDispatch, titleId, next)}
                          className={isGold ? 'font-bold text-2xl mb-3 text-gray-900 outline-none' : 'font-bold text-2xl mb-3 outline-none'}
                        />
                      ) : null}
                      {bodyId ? (
                        <InlineEditableText
                          tag="p"
                          value={(doc.nodes[bodyId]?.props?.text as string) ?? ''}
                          editable={isEditing}
                          selected={builderSelectedId === bodyId}
                          onSelect={() => builderDispatch?.({ type: 'SELECT', id: bodyId })}
                          onChange={(next) => setTextInDoc(builderDispatch, bodyId, next)}
                          className={isGold ? 'text-gray-800 mb-4 text-lg outline-none' : 'text-white/80 mb-4 text-lg outline-none'}
                        />
                      ) : null}
                      {badge ? (
                        <div
                          className={
                            isGold
                              ? 'bg-green-600 rounded-lg px-4 py-2 inline-block'
                              : 'bg-yellow-500/30 backdrop-blur-sm rounded-lg px-4 py-2 inline-block'
                          }
                        >
                          <p
                            className={isGold ? 'text-sm font-bold text-white outline-none' : 'text-sm font-semibold outline-none'}
                            contentEditable={Boolean(isEditing && builderSelectedId === cardId)}
                            suppressContentEditableWarning
                            onMouseDown={(e) => {
                              if (!isEditing) return;
                              e.stopPropagation();
                              builderDispatch?.({ type: 'SELECT', id: cardId });
                            }}
                            onInput={(e) => {
                              if (!isEditing) return;
                              builderDispatch?.({ type: 'SET_NODE_PROPS', id: cardId, patch: { badge: (e.currentTarget as HTMLElement).innerText } });
                            }}
                          >
                            {badge}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              : roleCardsFromCms.map((c, idx) => {
                  const isGold = c.theme === 'gold';
                  return (
                    <div
                      key={`${c.title}-${idx}`}
                      className={
                        isGold
                          ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-8 text-center border-2 border-yellow-400 shadow-2xl transform hover:scale-105 transition-all'
                          : 'bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20 hover:bg-white/20 transition-all transform hover:scale-105'
                      }
                    >
                      <div
                        className={
                          isGold
                            ? 'w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6'
                            : 'w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6'
                        }
                      >
                        <span className="text-5xl">{c.icon}</span>
                      </div>
                      <h3 className={isGold ? 'font-bold text-2xl mb-3 text-gray-900' : 'font-bold text-2xl mb-3'}>{c.title}</h3>
                      <p className={isGold ? 'text-gray-800 mb-4 text-lg' : 'text-white/80 mb-4 text-lg'}>{c.description}</p>
                      {c.badge ? (
                        <div
                          className={
                            isGold
                              ? 'bg-green-600 rounded-lg px-4 py-2 inline-block'
                              : 'bg-yellow-500/30 backdrop-blur-sm rounded-lg px-4 py-2 inline-block'
                          }
                        >
                          <p className={isGold ? 'text-sm font-bold text-white' : 'text-sm font-semibold'}>{c.badge}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
          </div>

          <div className="mt-12 bg-yellow-500/20 backdrop-blur-md rounded-2xl p-6 border border-yellow-400/30 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <InlineEditableText
                tag="h4"
                value={getTextFromDoc(doc, 'roles_note_title', t('roles_note_title', 'ملاحظة مهمة'))}
                editable={isEditing}
                selected={builderSelectedId === 'roles_note_title'}
                onSelect={() => builderDispatch?.({ type: 'SELECT', id: 'roles_note_title' })}
                onChange={(next) => setTextInDoc(builderDispatch, 'roles_note_title', next)}
                className="font-bold text-xl outline-none"
              />
            </div>
            <InlineEditableText
              tag="p"
              value={getTextFromDoc(
                doc,
                'roles_note_text',
                t('roles_note_text', 'التسجيل العام متاح فقط للعدول. الأدوار الأخرى تستخدم نظام تسجيل داخلي خاص بصلاحيات عليا.')
              )}
              editable={isEditing}
              selected={builderSelectedId === 'roles_note_text'}
              onSelect={() => builderDispatch?.({ type: 'SELECT', id: 'roles_note_text' })}
              onChange={(next) => setTextInDoc(builderDispatch, 'roles_note_text', next)}
              className="text-lg text-white/90 whitespace-pre-line outline-none"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo and description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src="/logos/morocco-coat.jpg" 
                  alt="شعار المملكة" 
                  className="h-16 w-16 object-contain"
                />
                <div className="text-right">
                  <h3 className="text-xl font-bold">الهيئة الوطنية للعدول</h3>
                  <p className="text-gray-400 text-sm">المملكة المغربية</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed mb-4">
                نظام رقمي متكامل لإدارة عقود الزواج والرسوم العدلية والوثائق،
                مصمم خصيصاً لخدمة العدول في المملكة المغربية بأحدث التقنيات.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-lg mb-4">روابط سريعة</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button onClick={() => navigate('/register')} className="hover:text-white transition-colors">
                    إنشاء حساب
                  </button>
                </li>
                <li>
                  <button onClick={handleLoginClick} className="hover:text-white transition-colors">
                    تسجيل الدخول
                  </button>
                </li>
                <li>
                  <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">
                    المميزات
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-lg mb-4">تواصل معنا</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span>support@adoul.ma</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span dir="ltr">+212 5XX-XXXXXX</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-center md:text-right">
                © 2025 الهيئة الوطنية للعدول - المملكة المغربية. جميع الحقوق محفوظة.
              </p>
              <div className="flex gap-6 text-gray-400 text-sm">
                <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
                <a href="#" className="hover:text-white transition-colors">شروط الاستخدام</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
