export type NodeType =
  | 'page'
  | 'section'
  | 'container'
  | 'panel'
  | 'card'
  | 'text'
  | 'button'
  | 'image'
  | 'spacer'
  | 'divider';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'p' | 'span';
export type Align = 'right' | 'center' | 'left';

export type BuilderNode = {
  id: string;
  type: NodeType;
  props: Record<string, any>;
  style: Record<string, any>;
  children: BuilderNode[];
};

export type BuilderDocument = {
  version: 2;
  root: BuilderNode;
};

// Legacy (v1) normalized format (kept only for migration).
export type LegacyBuilderNodeV1 = {
  id: string;
  type: Exclude<NodeType, 'page'>;
  name: string;
  parentId: string | null;
  children: string[];
  props: Record<string, any>;
  style: Record<string, any>;
};

export type LegacyBuilderDocumentV1 = {
  version: 1;
  rootId: string;
  nodes: Record<string, LegacyBuilderNodeV1>;
};

export type Selected = {
  id: string;
};

export const isContainerLike = (type: NodeType) =>
  type === 'page' || type === 'section' || type === 'container' || type === 'panel' || type === 'card';

export const ALLOWED_CHILDREN: Record<NodeType, NodeType[]> = {
  page: ['section'],
  section: ['container', 'panel', 'card', 'text', 'image', 'button', 'spacer', 'divider'],
  container: ['container', 'card', 'text', 'image', 'button', 'spacer', 'divider'],
  panel: ['container', 'card', 'text', 'image', 'button', 'spacer', 'divider'],
  card: ['container', 'card', 'text', 'image', 'button', 'spacer', 'divider'],
  text: [],
  button: [],
  image: [],
  spacer: [],
  divider: [],
};

export const canAcceptChild = (parentType: NodeType, childType: NodeType) => {
  const allowed = ALLOWED_CHILDREN[parentType] ?? [];
  return allowed.includes(childType);
};
