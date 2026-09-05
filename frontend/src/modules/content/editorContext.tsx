import React, { createContext, useContext } from 'react';

export type EditorSelection =
  | { scope: 'hero'; field: 'title' | 'tagline' | 'kicker' | 'accent' | 'imageMain' | 'imageSide' }
  | { scope: 'item'; index: number; field: string };

export type PageContent = {
  hero?: Record<string, any>;
  items?: Array<Record<string, any>>;
};

export type ContentEditorApi = {
  enabled: boolean;
  content: PageContent;
  setContent: React.Dispatch<React.SetStateAction<PageContent>>;
  selected: EditorSelection | null;
  setSelected: (sel: EditorSelection | null) => void;
  patchHero: (patch: Record<string, any>) => void;
  patchItem: (index: number, patch: Record<string, any>) => void;
  addItem: () => void;
  duplicateItem: (index: number) => void;
  deleteItem: (index: number) => void;
  moveItem: (from: number, to: number) => void;
  requestUpload: (target: { scope: 'heroMain' | 'heroSide' | 'item'; index?: number; key?: string }) => void;
};

const Ctx = createContext<ContentEditorApi | null>(null);

export function ContentEditorProvider({ value, children }: { value: ContentEditorApi; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContentEditorOptional() {
  return useContext(Ctx);
}

export function useContentEditor() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useContentEditor must be used within ContentEditorProvider');
  return v;
}

