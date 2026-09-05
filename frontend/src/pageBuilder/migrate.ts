import type { BuilderDocument, BuilderNode, LegacyBuilderDocumentV1, LegacyBuilderNodeV1, NodeType } from './schema';
import { canAcceptChild, isContainerLike } from './schema';
import { DEFAULT_DOCUMENT } from './defaultLayout';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const makeId = () =>
  typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Date.now());

const isLegacyV1 = (doc: any): doc is LegacyBuilderDocumentV1 => {
  if (!doc || typeof doc !== 'object') return false;
  if (doc.version !== 1) return false;
  if (typeof doc.rootId !== 'string' || !doc.rootId) return false;
  if (!doc.nodes || typeof doc.nodes !== 'object') return false;
  const root = doc.nodes[doc.rootId];
  if (!root || typeof root !== 'object') return false;
  if (!Array.isArray(root.children)) return false;
  return true;
};

const isV2 = (doc: any): doc is BuilderDocument => {
  if (!doc || typeof doc !== 'object') return false;
  if (doc.version !== 2) return false;
  if (!doc.root || typeof doc.root !== 'object') return false;
  if (typeof doc.root.id !== 'string' || !doc.root.id) return false;
  if (typeof doc.root.type !== 'string') return false;
  if (!Array.isArray(doc.root.children)) return false;
  return true;
};

const upgradeLegacyV1Normalized = (doc: LegacyBuilderDocumentV1): LegacyBuilderDocumentV1 => {
  const next = clone(doc);

  const ensureNode = (node: LegacyBuilderNodeV1) => {
    if (next.nodes[node.id]) return;
    next.nodes[node.id] = clone(node);
  };

  const ensureChild = (parentId: string, childId: string) => {
    const parent = next.nodes[parentId];
    if (!parent) return;
    parent.children = Array.isArray(parent.children) ? parent.children : [];
    if (!parent.children.includes(childId)) parent.children.push(childId);
    const child = next.nodes[childId];
    if (child) child.parentId = parentId;
  };

  // Ensure core nodes exist
  if (!next.nodes[next.rootId]) {
    ensureNode({
      id: next.rootId,
      type: 'container',
      name: 'Page',
      parentId: null,
      children: [],
      props: {},
      style: {},
    });
  }

  ensureNode({
    id: 'hero',
    type: 'section',
    name: 'Hero',
    parentId: next.rootId,
    children: [],
    props: {},
    style: {},
  });
  ensureNode({
    id: 'features',
    type: 'section',
    name: 'Features',
    parentId: next.rootId,
    children: [],
    props: {},
    style: {},
  });

  ensureChild(next.rootId, 'hero');
  ensureChild(next.rootId, 'features');

  ensureNode({
    id: 'hero_title',
    type: 'text',
    name: 'Hero Title',
    parentId: 'hero',
    children: [],
    props: { text: 'الهيئة الوطنية للعدول بالمغرب', variant: 'h1', align: 'right', bold: true },
    style: {},
  });
  ensureNode({
    id: 'hero_sub',
    type: 'text',
    name: 'Hero Subtitle',
    parentId: 'hero',
    children: [],
    props: { text: 'منصة التوثيق العدلي الإلكتروني', variant: 'p', align: 'right', bold: false },
    style: {},
  });
  ensureNode({
    id: 'hero_btn_primary',
    type: 'button',
    name: 'Hero Primary Button',
    parentId: 'hero',
    children: [],
    props: { text: 'ابدأ الآن - مجاناً', href: '/register' },
    style: {},
  });
  ensureNode({
    id: 'hero_btn_secondary',
    type: 'button',
    name: 'Hero Secondary Button',
    parentId: 'hero',
    children: [],
    props: { text: 'اكتشف المميزات', href: '#features' },
    style: {},
  });
  for (const id of ['hero_title', 'hero_sub', 'hero_btn_primary', 'hero_btn_secondary']) ensureChild('hero', id);

  ensureNode({
    id: 'features_heading',
    type: 'text',
    name: 'Features Heading',
    parentId: 'features',
    children: [],
    props: { text: 'منصة متكاملة للإدارة العدلية', variant: 'h2', align: 'center', bold: true },
    style: {},
  });
  ensureNode({
    id: 'features_subtitle',
    type: 'text',
    name: 'Features Subtitle',
    parentId: 'features',
    children: [],
    props: { text: 'اكتشف كيف يمكن لنظامنا الرقمي تحسين كفاءة عملك وتوفير الوقت', variant: 'p', align: 'center', bold: false },
    style: {},
  });
  for (const id of ['features_heading', 'features_subtitle']) ensureChild('features', id);

  for (const node of Object.values(next.nodes)) {
    if (node.type === 'card' && (node.props?.icon == null || node.props?.icon === '')) {
      node.props = { ...(node.props ?? {}), icon: '✨' };
    }
  }

  return next;
};

const convertLegacyV1ToV2 = (legacy: LegacyBuilderDocumentV1): BuilderDocument => {
  const nodesById = legacy.nodes;
  const visited = new Set<string>();

  const build = (id: string): BuilderNode | null => {
    if (visited.has(id)) return null;
    visited.add(id);
    const n = nodesById[id];
    if (!n) return null;
    const type: NodeType = id === legacy.rootId ? 'page' : (n.type as any);
    return {
      id,
      type,
      props: clone(n.props ?? {}),
      style: clone(n.style ?? {}),
      children: (n.children ?? [])
        .map((cid) => build(cid))
        .filter(Boolean) as BuilderNode[],
    };
  };

  const root = build(legacy.rootId) ?? clone(DEFAULT_DOCUMENT.root);

  // Enforce `page -> section` by wrapping any non-section children.
  const bad = root.children.filter((c) => c.type !== 'section');
  if (bad.length) {
    root.children = root.children.filter((c) => c.type === 'section');
    root.children.push({
      id: makeId(),
      type: 'section',
      props: { label: 'Content' },
      style: { padding: '18px', borderRadius: '18px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', marginTop: '18px' },
      children: bad.filter((c) => canAcceptChild('section', c.type)),
    });
  }

  return { version: 2, root };
};

const canKeepChild = (parentType: NodeType, childType: NodeType) =>
  isContainerLike(parentType) && canAcceptChild(parentType, childType);

const ensureDefaults = (doc: BuilderDocument): BuilderDocument => {
  const next = clone(doc);
  const countNodes = (root: BuilderNode) => {
    let count = 0;
    const stack: BuilderNode[] = [root];
    while (stack.length) {
      const n = stack.pop()!;
      count += 1;
      for (const c of n.children ?? []) stack.push(c);
    }
    return count;
  };
  const beforeCount = countNodes(next.root);

  const cloneNode = (n: BuilderNode): BuilderNode => clone(n);

  const ensureSubtree = (target: BuilderNode, defaults: BuilderNode) => {
    for (const defChild of defaults.children ?? []) {
      const existing = target.children.find((c) => c.id === defChild.id);
      if (!existing) {
        target.children.push(cloneNode(defChild));
      } else {
        ensureSubtree(existing, defChild);
      }
    }
  };

  // Ensure all default top-level sections exist on page
  const defaultPage = DEFAULT_DOCUMENT.root;
  ensureSubtree(next.root, defaultPage);

  // Repair any invalid children (defensive)
  const walk = (node: BuilderNode) => {
    node.children = (node.children ?? []).filter((c) => canKeepChild(node.type, c.type));
    for (const c of node.children) walk(c);
  };
  walk(next.root);

  // If we injected new nodes, return next; else return doc
  const changed = beforeCount !== countNodes(next.root);
  return changed ? next : doc;
};

export const upgradeToV2 = (doc: unknown): BuilderDocument => {
  if (isV2(doc)) return ensureDefaults(clone(doc));
  if (isLegacyV1(doc)) return ensureDefaults(convertLegacyV1ToV2(upgradeLegacyV1Normalized(doc)));
  return clone(DEFAULT_DOCUMENT);
};

export const parseBuilderDocument = (raw: string | null | undefined): BuilderDocument | null => {
  if (!raw) return null;
  try {
    return upgradeToV2(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const buildIndex = (root: BuilderNode) => {
  const byId = new Map<string, { node: BuilderNode; parentId: string | null; index: number }>();
  const walk = (node: BuilderNode, parentId: string | null) => {
    node.children = Array.isArray(node.children) ? node.children : [];
    byId.set(node.id, { node, parentId, index: 0 });
    node.children.forEach((child, idx) => {
      byId.set(child.id, { node: child, parentId: node.id, index: idx });
      walk(child, node.id);
    });
  };
  walk(root, null);
  return byId;
};

export const isValidDropParent = canKeepChild;
