import type { BuilderDocument, BuilderNode, NodeType } from './schema';
import { canAcceptChild, isContainerLike } from './schema';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const makeId = () =>
  typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Date.now());

const defaultNodeForType = (id: string, type: Exclude<NodeType, 'page'>): BuilderNode => {
  switch (type) {
    case 'section':
      return { id, type, props: { label: 'Section' }, style: {}, children: [] };
    case 'container':
      return { id, type, props: { label: 'Container' }, style: {}, children: [] };
    case 'panel':
      return { id, type, props: { label: 'Panel' }, style: {}, children: [] };
    case 'card':
      return { id, type, props: { label: 'Card', icon: '✨' }, style: {}, children: [] };
    case 'text':
      return { id, type, props: { label: 'Text', text: 'نص جديد', variant: 'p', align: 'right', bold: false }, style: {}, children: [] };
    case 'button':
      return { id, type, props: { label: 'Button', text: 'زر', href: '' }, style: {}, children: [] };
    case 'image':
      return { id, type, props: { label: 'Image', src: '', alt: '', fit: 'cover' }, style: { width: '100%', height: '220px' }, children: [] };
    case 'spacer':
      return { id, type, props: { label: 'Spacer' }, style: { height: '16px' }, children: [] };
    case 'divider':
      return { id, type, props: { label: 'Divider' }, style: { height: '1px', backgroundColor: '#e2e8f0', margin: '12px 0' }, children: [] };
  }
};

export const buildIndex = (root: BuilderNode) => {
  const byId = new Map<string, { node: BuilderNode; parentId: string | null; index: number }>();
  const walk = (node: BuilderNode, parentId: string | null) => {
    byId.set(node.id, { node, parentId, index: 0 });
    node.children.forEach((child, idx) => {
      byId.set(child.id, { node: child, parentId: node.id, index: idx });
      walk(child, node.id);
    });
  };
  walk(root, null);
  return byId;
};

const findWithParent = (
  root: BuilderNode,
  id: string,
): { node: BuilderNode; parent: BuilderNode | null; index: number } | null => {
  if (root.id === id) return { node: root, parent: null, index: 0 };
  const stack: Array<{ node: BuilderNode; parent: BuilderNode | null }> = [{ node: root, parent: null }];
  while (stack.length) {
    const { node, parent } = stack.pop()!;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.id === id) return { node: child, parent: node, index: i };
      stack.push({ node: child, parent: node });
    }
  }
  return null;
};

const isIdInSubtree = (root: BuilderNode, subtreeId: string, id: string) => {
  const subtree = findWithParent(root, subtreeId)?.node;
  if (!subtree) return false;
  const stack = [subtree];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.id === id) return true;
    for (const c of n.children) stack.push(c);
  }
  return false;
};

export const insertNode = (doc: BuilderDocument, parentId: string, index: number, nodeType: Exclude<NodeType, 'page'>) => {
  const next = clone(doc);
  const parent = findWithParent(next.root, parentId)?.node;
  if (!parent) return { doc, insertedId: null as string | null };
  if (!isContainerLike(parent.type)) return { doc, insertedId: null as string | null };
  if (!canAcceptChild(parent.type, nodeType)) return { doc, insertedId: null as string | null };

  const id = makeId();
  const created = defaultNodeForType(id, nodeType);

  if (nodeType === 'card') {
    const titleId = makeId();
    const bodyId = makeId();
    created.children = [
      defaultNodeForType(titleId, 'text'),
      defaultNodeForType(bodyId, 'text'),
    ];
    created.children[0].props = { ...(created.children[0].props ?? {}), label: 'Card Title', text: 'عنوان البطاقة', variant: 'h3', align: 'right', bold: true };
    created.children[1].props = { ...(created.children[1].props ?? {}), label: 'Card Body', text: 'وصف البطاقة...', variant: 'p', align: 'right', bold: false };
  }

  const at = Math.min(Math.max(index, 0), parent.children.length);
  parent.children.splice(at, 0, created);
  return { doc: next, insertedId: id };
};

export const deleteNode = (doc: BuilderDocument, id: string) => {
  if (id === doc.root.id) return doc;
  const next = clone(doc);
  const found = findWithParent(next.root, id);
  if (!found || !found.parent) return doc;
  found.parent.children.splice(found.index, 1);
  return next;
};

export const moveNode = (doc: BuilderDocument, id: string, newParentId: string, newIndex: number) => {
  if (id === doc.root.id) return doc;
  if (id === newParentId) return doc;
  const next = clone(doc);

  const found = findWithParent(next.root, id);
  if (!found || !found.parent) return doc;

  const newParent = findWithParent(next.root, newParentId)?.node;
  if (!newParent) return doc;
  if (!isContainerLike(newParent.type)) return doc;
  if (!canAcceptChild(newParent.type, found.node.type)) return doc;
  if (isIdInSubtree(next.root, id, newParentId)) return doc;

  const oldParent = found.parent;
  const oldIndex = found.index;
  const [moved] = oldParent.children.splice(oldIndex, 1);

  let at = Math.min(Math.max(newIndex, 0), newParent.children.length);
  if (oldParent.id === newParent.id && oldIndex < at) at -= 1;
  if (oldParent.id === newParent.id && oldIndex === at) return doc;
  newParent.children.splice(at, 0, moved);
  return next;
};

export const duplicateNode = (doc: BuilderDocument, id: string) => {
  if (id === doc.root.id) return { doc, insertedId: null as string | null };
  const next = clone(doc);
  const found = findWithParent(next.root, id);
  if (!found || !found.parent) return { doc, insertedId: null as string | null };

  const remap = new Map<string, string>();
  const cloneNode = (node: BuilderNode): BuilderNode => {
    const newId = makeId();
    remap.set(node.id, newId);
    return {
      id: newId,
      type: node.type,
      props: clone(node.props ?? {}),
      style: clone(node.style ?? {}),
      children: node.children.map(cloneNode),
    };
  };

  const copied = cloneNode(found.node);
  found.parent.children.splice(found.index + 1, 0, copied);
  return { doc: next, insertedId: copied.id };
};

