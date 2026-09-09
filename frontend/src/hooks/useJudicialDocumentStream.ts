import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logViewerEvent } from '../utils/documentTelemetry';

export interface UseJudicialDocumentStreamResult {
  blobUrl: string | null;
  rawContent: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Secure document stream hook for Judicial Document Viewer.
 * Preserves raw string HTML payloads directly in state and maintains
 * byte-exact binary streams for PDF/DOCX assets with explicit cleanup.
 */
export function useJudicialDocumentStream(
  attachmentUrl?: string | null,
  fileType?: string,
  submissionId?: string,
  initialRawContent?: string | null
): UseJudicialDocumentStreamResult {
  const { sessionToken } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(initialRawContent || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  const activeBlobUrlRef = useRef<string | null>(null);

  const refetch = useCallback(() => {
    setFetchTrigger((prev) => prev + 1);
  }, []);

  const cleanupActiveBlobUrl = useCallback(() => {
    if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch {
        // Safe cleanup
      }
      activeBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    const rawInput = (attachmentUrl || '').trim();
    const normalizedType = (fileType || '').toLowerCase();

    // 1. Direct Raw HTML / Text Content bypasses binary conversions
    const isInlineHtml =
      (initialRawContent && initialRawContent.trim().length > 0) ||
      rawInput.startsWith('<') ||
      rawInput.startsWith('html://') ||
      rawInput.startsWith('draft://') ||
      (normalizedType.includes('html') && !rawInput.startsWith('http://') && !rawInput.startsWith('https://') && !rawInput.startsWith('/'));

    if (isInlineHtml) {
      cleanupActiveBlobUrl();
      const resolvedContent =
        (initialRawContent && initialRawContent.trim().length > 0)
          ? initialRawContent.trim()
          : (rawInput.startsWith('html://') || rawInput.startsWith('draft://'))
          ? (rawInput.replace(/^html:\/\/[^/]*\/?/, '').replace(/^draft:\/\/[^/]*\/?/, '').trim() || null)
          : (rawInput.length > 0 ? rawInput : null);

      setBlobUrl(null);
      setRawContent(resolvedContent);
      setIsLoading(false);
      setError(null);
      logViewerEvent('DOC_FETCH_SUCCESS', { fileType: 'HTML', submissionId, inline: true });
      return;
    }

    // 2. No URL provided
    if (!rawInput) {
      cleanupActiveBlobUrl();
      setBlobUrl(null);
      setRawContent(initialRawContent || null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    let isCancelled = false;

    const executeDocumentStream = async () => {
      cleanupActiveBlobUrl();
      setBlobUrl(null);
      setIsLoading(true);
      setError(null);

      logViewerEvent('DOC_FETCH_START', {
        attachmentUrl: rawInput,
        fileType,
        submissionId,
      });

      try {
        const headers: HeadersInit = {};
        if (sessionToken && !rawInput.startsWith('data:')) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
          headers['x-session-token'] = sessionToken;
        }

        const cacheBustedUrl = rawInput.startsWith('data:') || rawInput.startsWith('blob:') || rawInput.includes('cb=')
          ? rawInput
          : `${rawInput}${rawInput.includes('?') ? '&' : '?'}cb=${Date.now()}`;

        const response = await fetch(cacheBustedUrl, {
          signal: abortController.signal,
          cache: 'no-store',
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        });

        if (!response.ok) {
          throw new Error(`Failed to load judicial document (HTTP ${response.status}: ${response.statusText})`);
        }

        const contentType = response.headers.get('content-type')?.toLowerCase() || '';

        // Handle text/html responses
        if (contentType.includes('text/html') || contentType.includes('text/plain') || normalizedType.includes('html')) {
          const text = await response.text();
          if (!isCancelled) {
            cleanupActiveBlobUrl();
            setBlobUrl(null);
            setRawContent(text);
            setIsLoading(false);
            logViewerEvent('DOC_FETCH_SUCCESS', { fileType, submissionId });
          }
          return;
        }

        // Byte-exact binary stream for PDF/DOCX
        const blob = await response.blob();
        if (isCancelled) return;

        cleanupActiveBlobUrl();

        const newBlobUrl = URL.createObjectURL(blob);
        activeBlobUrlRef.current = newBlobUrl;

        setBlobUrl(newBlobUrl);
        setRawContent(null);
        setIsLoading(false);
        logViewerEvent('DOC_FETCH_SUCCESS', { fileType, submissionId });
      } catch (err: any) {
        if (isCancelled || err?.name === 'AbortError') {
          return;
        }

        const normalizedError = err instanceof Error ? err : new Error(String(err?.message || 'Unknown stream error'));
        logViewerEvent('VIEWER_ERROR', {
          error: normalizedError.message,
          submissionId,
          attachmentUrl: rawInput,
        });

        if (!isCancelled) {
          cleanupActiveBlobUrl();
          setBlobUrl(null);
          setRawContent(null);
          setError(normalizedError);
          setIsLoading(false);
        }
      }
    };

    executeDocumentStream();

    return () => {
      isCancelled = true;
      abortController.abort();
      cleanupActiveBlobUrl();
    };
  }, [attachmentUrl, fileType, submissionId, sessionToken, fetchTrigger, initialRawContent, cleanupActiveBlobUrl]);

  return {
    blobUrl,
    rawContent,
    isLoading,
    error,
    refetch,
  };
}
