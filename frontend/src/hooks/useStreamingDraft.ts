import { useState, useCallback, useRef } from 'react';
import { getBackendHttpOrigin } from '../utils/backendOrigin';

export interface UseStreamingDraftOptions {
  onChunk?: (chunk: string, accumulated: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export function useStreamingDraft(options?: UseStreamingDraftOptions) {
  const [draft, setDraft] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (params: { contractType: string; parties: string; details?: string }) => {
      // Cancel any ongoing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsStreaming(true);
      setError(null);
      setDraft('');

      let accumulated = '';
      const origin = getBackendHttpOrigin();
      const url = new URL(`${origin}/api/ai/stream-draft`);
      url.searchParams.set('contractType', params.contractType);
      url.searchParams.set('parties', params.parties);
      if (params.details) {
        url.searchParams.set('details', params.details);
      }

      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: 'text/event-stream',
          },
        });

        if (!response.ok) {
          throw new Error(`Streaming failed: HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('ReadableStream not supported');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
            if (!dataLine) continue;

            try {
              const payload = JSON.parse(dataLine.slice(6));
              if (payload.token) {
                accumulated += payload.token;
                setDraft(accumulated);
                options?.onChunk?.(payload.token, accumulated);
              }
              if (payload.done) {
                options?.onDone?.(accumulated);
              }
              if (payload.error) {
                throw new Error(payload.error);
              }
            } catch {
              // Ignore partial JSON parse errors
            }
          }
        }

        options?.onDone?.(accumulated);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          const errObj = err instanceof Error ? err : new Error(String(err));
          setError(errObj);
          options?.onError?.(errObj);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [options]
  );

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  return {
    draft,
    isStreaming,
    error,
    startStream,
    stopStream,
  };
}
