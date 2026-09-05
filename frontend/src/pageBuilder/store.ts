import type { BuilderDocument, BuilderNode, NodeType } from './schema';
import { DEFAULT_DOCUMENT } from './defaultLayout';
import { parseBuilderDocument, upgradeToV2 } from './migrate';
import { deleteNode, duplicateNode, insertNode, makeId, moveNode } from './treeUtils';

export type BuilderState = {
  doc: BuilderDocument;
  selectedId: string | null;
  clipboard: BuilderNode | null;
  past: BuilderDocument[];
  future: BuilderDocument[];
};

export type BuilderAction =
  | { type: 'LOAD'; doc: unknown }
  | { type: 'SELECT'; id: string | null }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_NODE_PROPS'; id: string; patch: Record<string, any> }
  | { type: 'SET_NODE_STYLE'; id: string; patch: Record<string, any> }
  | { type: 'ADD_NODE'; parentId: string; index: number; nodeType: Exclude<NodeType, 'page'> }
  | { type: 'DELETE_NODE'; id: string }
  | { type: 'MOVE_NODE'; id: string; newParentId: string; newIndex: number }
  | { type: 'DUPLICATE_NODE'; id: string }
  | { type: 'COPY' }
  | { type: 'PASTE_AFTER'; targetId: string };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const withHistory = (state: BuilderState, nextDoc: BuilderDocument): BuilderState => ({
  ...state,
  doc: nextDoc,
  past: [...state.past, state.doc],
  future: [],
});

const updateNodeById = (root: BuilderNode, id: string, updater: (node: BuilderNode) => BuilderNode) => {
  if (root.id === id) return updater(root);
  return {
    ...root,
    children: root.children.map((child) => updateNodeById(child, id, updater)),
  };
};

const findWithParent = (
  root: BuilderNode,
  id: string,
): { node: BuilderNode; parent: BuilderNode | null; index: number } | null => {
  if (root.id === id) return { node: root, parent: null, index: 0 };
  const stack: Array<{ node: BuilderNode; parent: BuilderNode | null }> = [{ node: root, parent: null }];
  while (stack.length) {
    const { node } = stack.pop()!;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.id === id) return { node: child, parent: node, index: i };
      stack.push({ node: child, parent: node });
    }
  }
  return null;
};

const cloneSubtreeWithNewIds = (node: BuilderNode): BuilderNode => {
  const newId = makeId();
  return {
    id: newId,
    type: node.type,
    props: clone(node.props ?? {}),
    style: clone(node.style ?? {}),
    children: node.children.map(cloneSubtreeWithNewIds),
  };
};

export const createInitialBuilderState = (): BuilderState => ({
  doc: clone(DEFAULT_DOCUMENT),
  selectedId: null,
  clipboard: null,
  past: [],
  future: [],
});

export const builderReducer = (state: BuilderState, action: BuilderAction): BuilderState => {
  switch (action.type) {
    case 'LOAD': {
      return {
        ...state,
        doc: upgradeToV2(action.doc),
        selectedId: null,
        clipboard: null,
        past: [],
        future: [],
      };
    }
    case 'SELECT':
      return { ...state, selectedId: action.id };
    case 'UNDO': {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return { ...state, doc: previous, past: state.past.slice(0, -1), future: [state.doc, ...state.future] };
    }
    case 'REDO': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return { ...state, doc: next, past: [...state.past, state.doc], future: state.future.slice(1) };
    }
    case 'SET_NODE_PROPS': {
      const nextDoc: BuilderDocument = {
        ...state.doc,
        root: updateNodeById(state.doc.root, action.id, (n) => ({ ...n, props: { ...(n.props ?? {}), ...clone(action.patch) } })),
      };
      return withHistory(state, nextDoc);
    }
    case 'SET_NODE_STYLE': {
      const nextDoc: BuilderDocument = {
        ...state.doc,
        root: updateNodeById(state.doc.root, action.id, (n) => ({ ...n, style: { ...(n.style ?? {}), ...clone(action.patch) } })),
      };
      return withHistory(state, nextDoc);
    }
    case 'ADD_NODE': {
      const { doc: next, insertedId } = insertNode(state.doc, action.parentId, action.index, action.nodeType);
      const nextState = withHistory(state, next);
      return insertedId ? { ...nextState, selectedId: insertedId } : nextState;
    }
    case 'DELETE_NODE': {
      const next = deleteNode(state.doc, action.id);
      const cleared = state.selectedId === action.id ? null : state.selectedId;
      return { ...withHistory(state, next), selectedId: cleared };
    }
    case 'MOVE_NODE': {
      const next = moveNode(state.doc, action.id, action.newParentId, action.newIndex);
      return next === state.doc ? state : withHistory(state, next);
    }
    case 'DUPLICATE_NODE': {
      const { doc: next, insertedId } = duplicateNode(state.doc, action.id);
      const nextState = withHistory(state, next);
      return insertedId ? { ...nextState, selectedId: insertedId } : nextState;
    }
    case 'COPY': {
      if (!state.selectedId) return state;
      const found = findWithParent(state.doc.root, state.selectedId);
      if (!found) return state;
      return { ...state, clipboard: clone(found.node) };
    }
    case 'PASTE_AFTER': {
      if (!state.clipboard) return state;
      const next = clone(state.doc);
      const found = findWithParent(next.root, action.targetId);
      if (!found || !found.parent) return state;
      const copied = cloneSubtreeWithNewIds(state.clipboard);
      found.parent.children.splice(found.index + 1, 0, copied);
      return { ...withHistory(state, next), selectedId: copied.id };
    }
    default:
      return state;
  }
};

// Re-export parser for callers that want to upgrade JSON from storage.
export { parseBuilderDocument };

