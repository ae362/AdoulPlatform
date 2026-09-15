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
function parseDataUrlOrBase64ToBlob(input: string, fallbackMime = 'application/pdf'): Blob {
  let mime = fallbackMime;
  let b64 = input;
  if (input.startsWith('data:')) {
    const commaIdx = input.indexOf(',');
    if (commaIdx !== -1) {
      const meta = input.slice(0, commaIdx);
      b64 = input.slice(commaIdx + 1);
      const mimeMatch = meta.match(/:(.*?);/);
      if (mimeMatch) mime = mimeMatch[1];
    }
  }
  const binaryString = atob(b64.trim());
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export function useJudicialDocumentStream(
  attachmentUrl?: string | null,
  fileType?: string,
  submissionId?: string,
  initialRawContent?: string | null
): UseJudicialDocumentStreamResult {
  const { sessionToken } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [loadedType, setLoadedType] = useState<string | null>(null);
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

    // Helper to decode data URLs or raw base64 strings directly in memory
    const isBase64Payload =
      rawInput.startsWith('data:') ||
      rawInput.startsWith('JVBERi') ||
      rawInput.startsWith('UEsDB');

    // 1. Direct Raw HTML / Text Content bypasses binary conversions
    const isBinaryAsset =
      isBase64Payload ||
      normalizedType === 'docx' ||
      normalizedType === 'pdf' ||
      normalizedType === 'image' ||
      rawInput.endsWith('.docx') ||
      rawInput.endsWith('.pdf') ||
      /\.(png|jpe?g|webp|gif)$/i.test(rawInput) ||
      rawInput.startsWith('http://') ||
      rawInput.startsWith('https://') ||
      rawInput.startsWith('blob:');

    const isInlineHtml =
      !isBinaryAsset &&
      ((initialRawContent && initialRawContent.trim().length > 0) ||
        rawInput.startsWith('<') ||
        rawInput.startsWith('html://') ||
        rawInput.startsWith('draft://') ||
        (normalizedType.includes('html') && !rawInput.startsWith('http://') && !rawInput.startsWith('https://') && !rawInput.startsWith('/')));

    if (isInlineHtml) {
      cleanupActiveBlobUrl();
      const resolvedContent =
        (initialRawContent && initialRawContent.trim().length > 0)
          ? initialRawContent.trim()
          : (rawInput.startsWith('html://') || rawInput.startsWith('draft://'))
          ? (rawInput.replace(/^html:\/\/[^/]*\/?/, '').replace(/^draft:\/\/[^/]*\/?/, '').trim() || null)
          : (rawInput.length > 0 ? rawInput : null);

      setBlobUrl(null);
      setLoadedUrl(rawInput);
      setLoadedType(normalizedType);
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
      setLoadedUrl(null);
      setLoadedType(null);
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
      setLoadedUrl(null);
      setLoadedType(null);
      setIsLoading(true);
      setError(null);

      logViewerEvent('DOC_FETCH_START', {
        attachmentUrl: rawInput,
        fileType,
        submissionId,
      });

      try {
        // Direct in-memory conversion for data URLs or raw base64 strings (bypasses browser fetch limitations)
        if (rawInput.startsWith('data:') || rawInput.startsWith('JVBERi') || rawInput.startsWith('UEsDB')) {
          const mime = normalizedType === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
          const blob = parseDataUrlOrBase64ToBlob(rawInput, mime);
          const newBlobUrl = URL.createObjectURL(blob);
          activeBlobUrlRef.current = newBlobUrl;
          setBlobUrl(newBlobUrl);
          setLoadedUrl(rawInput);
          setLoadedType(normalizedType);
          setRawContent(null);
          setIsLoading(false);
          logViewerEvent('DOC_FETCH_SUCCESS', { fileType, submissionId, inMemoryBlob: true });
          return;
        }

        const headers: HeadersInit = {};
        const isExternalStorageUrl =
          rawInput.includes('/storage/v1/object/public/') ||
          rawInput.includes('/storage/v1/object/sign/') ||
          rawInput.startsWith('blob:') ||
          rawInput.startsWith('data:');

        if (sessionToken && !isExternalStorageUrl) {
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
            setLoadedUrl(rawInput);
            setLoadedType(normalizedType);
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
        setLoadedUrl(rawInput);
        setLoadedType(normalizedType);
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
          setLoadedUrl(null);
          setLoadedType(null);
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

  const rawInput = (attachmentUrl || '').trim();
  const normalizedType = (fileType || '').toLowerCase();
  const isInlineHtml =
    (initialRawContent && initialRawContent.trim().length > 0) ||
    rawInput.startsWith('<') ||
    rawInput.startsWith('html://') ||
    rawInput.startsWith('draft://') ||
    (normalizedType.includes('html') && !rawInput.startsWith('http://') && !rawInput.startsWith('https://') && !rawInput.startsWith('/'));

  const isMatch = loadedUrl === rawInput && loadedType === normalizedType;
  const isCurrentlyLoading = isLoading || (Boolean(rawInput) && !isInlineHtml && !isMatch);

  return {
    blobUrl: isMatch ? blobUrl : null,
    rawContent: (isMatch || isInlineHtml) ? rawContent : null,
    isLoading: isCurrentlyLoading,
    error,
    refetch,
  };
}
