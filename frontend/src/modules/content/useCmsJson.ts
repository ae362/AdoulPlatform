import { useMemo } from 'react';
import { trpc } from '../../trpc';

const safeJsonParse = <T,>(raw: string | undefined | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export function useCmsJson<T>(key: string, fallback: T) {
  const q = trpc.cms.getContent.useQuery({}); // cached across pages
  const raw = q.data?.[key]?.value as string | undefined;
  const value = useMemo(() => safeJsonParse<T>(raw, fallback), [raw, fallback]);
  return { value, raw, isLoading: q.isLoading, isFromCms: Boolean(raw) };
}

