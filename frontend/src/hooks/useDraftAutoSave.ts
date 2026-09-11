import { useEffect, useState, useCallback, useRef } from 'react';

export interface UseDraftAutoSaveOptions<T> {
  /** Unique key for the draft in storage, e.g. 'notary_intake_form' */
  key: string;
  /** Initial fallback value if no saved draft exists */
  initialValue: T;
  /** Debounce delay in milliseconds before persisting to localStorage (default: 800ms) */
  debounceMs?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
}

export interface UseDraftAutoSaveReturn<T> {
  draft: T;
  setDraft: React.Dispatch<React.SetStateAction<T>>;
  hasSavedDraft: boolean;
  clearDraft: () => void;
  lastSavedAt: Date | null;
}

/**
 * Enterprise Draft Auto-Save Hook
 * Automatically persists and recovers multi-step forms / legal wizard drafts
 * in localStorage to prevent loss of notary data on tab switch, refresh, or network interruption.
 */
export function useDraftAutoSave<T>({
  key,
  initialValue,
  debounceMs = 800,
  enabled = true,
}: UseDraftAutoSaveOptions<T>): UseDraftAutoSaveReturn<T> {
  const storageKey = `adoul_draft_${key}`;
  const isInitialMount = useRef(true);

  // Initialize draft from localStorage if available
  const [draft, setDraft] = useState<T>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object' && 'data' in parsed) {
            return parsed.data as T;
          }
          return parsed as T;
        }
      }
    } catch (err) {
      console.warn(`[useDraftAutoSave] Error reading draft for "${key}":`, err);
    }
    return initialValue;
  });

  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && Boolean(localStorage.getItem(storageKey));
    } catch {
      return false;
    }
  });

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.savedAt) return new Date(parsed.savedAt);
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && draft !== undefined && draft !== null) {
          const payload = {
            data: draft,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(storageKey, JSON.stringify(payload));
          setHasSavedDraft(true);
          setLastSavedAt(new Date());
        }
      } catch (err) {
        console.warn(`[useDraftAutoSave] Error saving draft for "${key}":`, err);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [draft, key, storageKey, debounceMs, enabled]);

  // Clean clear callback
  const clearDraft = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
      setHasSavedDraft(false);
      setLastSavedAt(null);
      setDraft(initialValue);
    } catch (err) {
      console.warn(`[useDraftAutoSave] Error clearing draft for "${key}":`, err);
    }
  }, [storageKey, initialValue, key]);

  return {
    draft,
    setDraft,
    hasSavedDraft,
    clearDraft,
    lastSavedAt,
  };
}

