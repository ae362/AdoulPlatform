import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../trpc';
import { DEFAULT_DOCUMENT } from '../pageBuilder/defaultLayout';
import type { BuilderDocument, NodeType } from '../pageBuilder/schema';
import { createInitialBuilderState, builderReducer } from '../pageBuilder/store';
import { BlocksPalette } from '../pageBuilder/palette';
import { LayersTree } from '../pageBuilder/layers';
import { Inspector } from '../pageBuilder/inspector';
import { Navigate } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverlay, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { LandingPage } from '../components/LandingPage';
import { canAcceptChild, isContainerLike } from '../pageBuilder/schema';
import { parseBuilderDocument } from '../pageBuilder/migrate';
import { buildIndex } from '../pageBuilder/treeUtils';

type DropIndicator = { parentId: string; index: number } | null;

const STORAGE_KEY = 'page_builder_layout_v2';
const CMS_KEY = 'page_builder_layout';

const safeParseDoc = (raw: string | null | undefined): BuilderDocument => parseBuilderDocument(raw) ?? DEFAULT_DOCUMENT;

const downloadJson = (filename: string, data: any) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export function CreatorPageBuilder() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, sessionToken, logout } = useAuth();

  const cms = trpc.cms.getContent.useQuery({});
  const saveMutation = trpc.cms.updateContent.useMutation();

  const [state, dispatch] = useReducer(builderReducer, undefined, createInitialBuilderState);
  const [leftTab, setLeftTab] = useState<'blocks' | 'layers'>('blocks');
  const [paletteDragType, setPaletteDragType] = useState<Exclude<NodeType, 'page'> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const [mode, setMode] = useState<'edit' | 'view'>('edit');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const docIndex = useMemo(() => buildIndex(state.doc.root), [state.doc]);
  const selectedNode = state.selectedId ? docIndex.get(state.selectedId)?.node ?? null : null;

  const serverDoc: BuilderDocument | null = useMemo(() => {
    const raw = cms.data?.[CMS_KEY]?.value;
    return parseBuilderDocument(raw);
  }, [cms.data]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'creator') return;

    // Prefer CMS, else localStorage, else default
    if (serverDoc) {
      dispatch({ type: 'LOAD', doc: serverDoc });
      return;
    }

    const localRaw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('page_builder_layout_v1');
    dispatch({ type: 'LOAD', doc: safeParseDoc(localRaw) });
  }, [authLoading, user, serverDoc]);

  const hasUnsaved = useMemo(() => {
    if (!serverDoc) return true;
    return JSON.stringify(serverDoc) !== JSON.stringify(state.doc);
  }, [serverDoc, state.doc]);

  const save = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.doc));
    if (!sessionToken) return;
    await saveMutation.mutateAsync({
      sessionToken,
      updates: [{ key: CMS_KEY, value: JSON.stringify(state.doc) }],
    });
    await cms.refetch();
  };

  const resetToServer = () => {
    if (serverDoc) dispatch({ type: 'LOAD', doc: serverDoc });
  };

  const addBlock = (type: Exclude<NodeType, 'page'>) => {
    if (mode !== 'edit') return;
    const selected = state.selectedId ? docIndex.get(state.selectedId)?.node : null;
    const rootId = state.doc.root.id;
    let parentId = rootId;
    if (type !== 'section') {
      if (selected && isContainerLike(selected.type) && canAcceptChild(selected.type, type)) {
        parentId = selected.id;
      } else {
        const firstSection = Array.from(docIndex.values()).find((v) => v.node.type === 'section' && canAcceptChild('section', type))?.node;
        if (firstSection) parentId = firstSection.id;
      }
    }
    const idx = docIndex.get(parentId)?.node.children.length ?? 0;
    dispatch({ type: 'ADD_NODE', parentId, index: idx, nodeType: type });
  };

  const clearDragState = () => {
    setActiveId(null);
    setPaletteDragType(null);
    setDropIndicator(null);
  };

  const computeIndicatorFromOver = (overData: any): DropIndicator => {
    if (overData?.kind === 'container') {
      const parentId = String(overData.containerId);
      const idx = docIndex.get(parentId)?.node.children.length ?? 0;
      return { parentId, index: idx };
    }
    if (overData?.kind === 'node') {
      const nodeId = String(overData.nodeId);
      const overNode = docIndex.get(nodeId)?.node ?? null;
      const parentId = (overData.parentId ?? docIndex.get(nodeId)?.parentId ?? state.doc.root.id) as string;
      const sibs = docIndex.get(parentId)?.node.children ?? [];
      const ids = sibs.map((c: any) => c.id);
      const at = ids.indexOf(nodeId);
      const beforeIndex = at === -1 ? ids.length : at;
      const rect = (overData.__rect as { top: number; height: number } | undefined) ?? null;
      const pointerY = typeof overData.__pointerY === 'number' ? overData.__pointerY : null;

      if (overNode && rect && pointerY != null && isContainerLike(overNode.type)) {
        const rel = (pointerY - rect.top) / Math.max(rect.height, 1);
        if (rel > 0.33 && rel < 0.66) {
          const idx = overNode.children.length ?? 0;
          return { parentId: nodeId, index: idx };
        }
        if (rel >= 0.66) return { parentId, index: beforeIndex + 1 };
        return { parentId, index: beforeIndex };
      }

      if (rect && pointerY != null) {
        const rel = (pointerY - rect.top) / Math.max(rect.height, 1);
        return { parentId, index: rel >= 0.5 ? beforeIndex + 1 : beforeIndex };
      }

      return { parentId, index: beforeIndex };
    }
    return null;
  };

  const onDragStart = (e: DragStartEvent) => {
    if (mode !== 'edit') return;
    setActiveId(String(e.active.id));
    const data = e.active.data.current as any;
    if (data?.kind === 'palette') setPaletteDragType(data.nodeType as Exclude<NodeType, 'page'>);
    if (data?.kind === 'node') dispatch({ type: 'SELECT', id: data.nodeId ?? String(e.active.id) });
  };

  const onDragOver = (e: DragOverEvent) => {
    if (mode !== 'edit') return;
    const over = e.over;
    if (!over) {
      setDropIndicator(null);
      return;
    }
    const overData = over.data.current as any;
    const pointerY = (() => {
      const ev: any = e.activatorEvent;
      if (!ev) return null;
      if (typeof ev.clientY === 'number') return ev.clientY;
      if (ev.touches && ev.touches[0] && typeof ev.touches[0].clientY === 'number') return ev.touches[0].clientY;
      return null;
    })();
    setDropIndicator(computeIndicatorFromOver({ ...overData, __rect: over.rect, __pointerY: pointerY }));
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (mode !== 'edit') {
      clearDragState();
      return;
    }
    const active = e.active;
    const over = e.over;
    const activeData = active.data.current as any;
    const overData = over?.data.current as any;

    const target = dropIndicator ?? computeIndicatorFromOver(overData);
    clearDragState();
    if (!over || !target) return;

    if (activeData?.kind === 'palette') {
      const nodeType = activeData.nodeType as Exclude<NodeType, 'page'>;
      const parentType = docIndex.get(target.parentId)?.node.type;
      if (!parentType || !canAcceptChild(parentType, nodeType)) return;
      dispatch({ type: 'ADD_NODE', parentId: target.parentId, index: target.index, nodeType });
      return;
    }

    const movingId = (activeData?.kind === 'node' ? activeData.nodeId : null) ?? String(active.id);
    const movingType = docIndex.get(movingId)?.node.type;
    const parentType = docIndex.get(target.parentId)?.node.type;
    if (!movingType || !parentType || !canAcceptChild(parentType, movingType)) return;
    dispatch({ type: 'MOVE_NODE', id: movingId, newParentId: target.parentId, newIndex: target.index });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          (target as any).isContentEditable);
      if (isTyping) return;

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
        return;
      }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        if (!state.selectedId) return;
        e.preventDefault();
        dispatch({ type: 'COPY' });
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        if (!state.selectedId) return;
        e.preventDefault();
        dispatch({ type: 'PASTE_AFTER', targetId: state.selectedId });
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        if (!state.selectedId) return;
        e.preventDefault();
        dispatch({ type: 'DUPLICATE_NODE', id: state.selectedId });
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!state.selectedId) return;
        e.preventDefault();
        dispatch({ type: 'DELETE_NODE', id: state.selectedId });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.selectedId]);

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>;
  }
  if (!user || user.role !== 'creator') return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      <div className="sticky top-0 z-[20000] border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="text-lg font-extrabold text-slate-900">منشئ صفحة الترحيب</div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {hasUnsaved ? 'غير محفوظ' : 'محفوظ'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-200"
            >
              العودة للموقع
            </button>
            <button
              type="button"
              onClick={() => setMode((m) => (m === 'edit' ? 'view' : 'edit'))}
              className={`rounded-xl px-4 py-2 text-sm font-extrabold ${
                mode === 'edit' ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {mode === 'edit' ? 'وضع التعديل' : 'وضع المعاينة'}
            </button>
            <div className="hidden md:flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ['desktop', 'Desktop'],
                  ['tablet', 'Tablet'],
                  ['mobile', 'Mobile'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setViewport(key)}
                  className={`rounded-lg px-3 py-2 text-xs font-extrabold ${
                    viewport === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={label}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => downloadJson('page-layout.json', state.doc)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-200"
            >
              تصدير JSON
            </button>
            <label className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-200 cursor-pointer">
              استيراد JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const txt = await file.text();
                  try {
                    const parsed = parseBuilderDocument(txt);
                    if (!parsed) throw new Error('invalid');
                    dispatch({ type: 'LOAD', doc: parsed });
                  } catch {
                    alert('JSON غير صالح');
                  } finally {
                    e.currentTarget.value = '';
                  }
                }}
              />
            </label>
            <button
              type="button"
              onClick={resetToServer}
              disabled={!serverDoc}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-200 disabled:opacity-40"
            >
              إعادة تحميل
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saveMutation.isPending}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {saveMutation.isPending ? '...جار الحفظ' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-red-500"
            >
              خروج
            </button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={clearDragState}
      >
        <div className="grid h-[calc(100vh-56px)] grid-cols-1 gap-4 p-4 lg:grid-cols-[320px_1fr_360px]">
        {/* Left: Blocks / Layers */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 lg:h-full lg:overflow-y-auto">
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setLeftTab('blocks')}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${
                leftTab === 'blocks' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'
              }`}
            >
              Blocks
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('layers')}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${
                leftTab === 'layers' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'
              }`}
            >
              Layers
            </button>
          </div>

          {leftTab === 'blocks' ? (
            <BlocksPalette onAdd={addBlock} />
          ) : (
            <LayersTree
              doc={state.doc}
              selectedId={state.selectedId}
              onSelect={(id) => dispatch({ type: 'SELECT', id })}
              onRename={(id, name) => dispatch({ type: 'SET_NODE_PROPS', id, patch: { label: name } })}
              onDelete={(id) => dispatch({ type: 'DELETE_NODE', id })}
            />
          )}

          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            اختصارات: Delete للحذف • Ctrl/Cmd+C للنسخ • Ctrl/Cmd+V للصق • Ctrl/Cmd+Z للتراجع • Ctrl/Cmd+Shift+Z للإعادة
          </div>
        </aside>

        {/* Center: Canvas */}
        <main className="rounded-2xl border border-slate-200 bg-slate-50 lg:h-full lg:overflow-auto">
          <div className="min-h-full w-full px-2 py-4 flex justify-center">
            <div
              className="bg-white shadow-sm"
              style={{
                width: viewport === 'mobile' ? 375 : viewport === 'tablet' ? 768 : 1280,
              }}
            >
              <LandingPage
                builderDoc={state.doc}
                builderMode={mode}
                builderSelectedId={state.selectedId}
                builderDispatch={dispatch}
                paletteDragType={paletteDragType}
                isDragging={Boolean(activeId)}
                dropIndicator={dropIndicator}
              />
            </div>
          </div>
        </main>

        {/* Right: Inspector */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 lg:h-full lg:overflow-y-auto">
          <Inspector
            node={selectedNode}
            onProps={(patch) => selectedNode && dispatch({ type: 'SET_NODE_PROPS', id: selectedNode.id, patch })}
            onStyle={(patch) => selectedNode && dispatch({ type: 'SET_NODE_STYLE', id: selectedNode.id, patch })}
            onDelete={() => state.selectedId && dispatch({ type: 'DELETE_NODE', id: state.selectedId })}
            onDuplicate={() => state.selectedId && dispatch({ type: 'DUPLICATE_NODE', id: state.selectedId })}
          />
        </aside>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-lg">
              {activeId.startsWith('palette:')
                ? activeId.replace('palette:', '')
                : (docIndex.get(activeId)?.node.props?.label ?? docIndex.get(activeId)?.node.type ?? 'عنصر')}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
