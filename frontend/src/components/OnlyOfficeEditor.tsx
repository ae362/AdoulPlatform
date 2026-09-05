import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    DocsAPI?: any;
  }
}

type OnlyOfficeEditorProps = {
  dsUrl: string;
  config: Record<string, unknown>;
  onClose?: () => void | Promise<void>;
  onSaved?: () => void | Promise<void>;
  onReady?: () => void;
  onError?: (message: string) => void;
  mode?: 'overlay' | 'embedded';
  className?: string;
};

function waitForDocsApi(timeoutMs = 15000): Promise<void> {
  if (window.DocsAPI?.DocEditor) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.DocsAPI?.DocEditor) {
        window.clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        reject(new Error('OnlyOffice DocsAPI is not available'));
      }
    }, 100);
  });
}

function ensureApiScript(dsUrl: string): Promise<void> {
  const baseUrl = dsUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/web-apps/apps/api/documents/api.js`;
  const existing = Array.from(document.getElementsByTagName('script')).find((s) => s.src === url);

  if (existing) {
    const status = existing.getAttribute('data-onlyoffice-status');
    if (window.DocsAPI?.DocEditor) return Promise.resolve();
    if (status === 'loading') return waitForDocsApi();
    try {
      existing.remove();
    } catch {}
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${url}?v=${Date.now()}`;
    s.async = true;
    s.setAttribute('data-onlyoffice-status', 'loading');
    s.onload = async () => {
      s.setAttribute('data-onlyoffice-status', 'loaded');
      try {
        await waitForDocsApi();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    s.onerror = () => {
      s.setAttribute('data-onlyoffice-status', 'error');
      reject(new Error(`Failed to load OnlyOffice api.js from ${url}`));
    };
    document.head.appendChild(s);
  });
}

export function OnlyOfficeEditor({
  dsUrl,
  config,
  onClose,
  onReady,
  onError,
  mode = 'overlay',
  className = '',
}: OnlyOfficeEditorProps) {
  const holderId = useRef(`onlyoffice-${Math.random().toString(16).slice(2)}`);
  const editorRef = useRef<any>(null);
  const readyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;

    const failWithMessage = (message: string) => {
      if (cancelled || readyRef.current) return;
      readyRef.current = true;
      setError(message);
      onError?.(message);
    };

    const hardTimeout = window.setTimeout(() => {
      failWithMessage('OnlyOffice timed out while loading the document');
    }, 12000);

    const run = async () => {
      setError(null);
      try {
        await ensureApiScript(dsUrl);
        if (cancelled) return;

        if (!window.DocsAPI?.DocEditor) throw new Error('OnlyOffice DocsAPI is not available');
        const customization = {
          ...((((config as any)?.editorConfig || {}) as any)?.customization || {}),
          ...(mode === 'embedded'
            ? {
                compactToolbar: true,
                integrationMode: 'embed',
                zoom: -2,
              }
            : {}),
        };
        const layout = {
          ...((((config as any)?.editorConfig || {}) as any)?.layout || {}),
          ...(mode === 'embedded'
            ? {
                toolbar: true,
                statusBar: true,
              }
            : {}),
        };
        const editorConfig = {
          ...(((config as any)?.editorConfig || {}) as Record<string, unknown>),
          customization,
          layout,
        };
        const nextEvents = {
          ...(((config as any)?.events || {}) as Record<string, unknown>),
          onAppReady: (...args: unknown[]) => {
            try {
              const original = (config as any)?.events?.onAppReady;
              if (typeof original === 'function') {
                original(...args);
              }
            } finally {
            }
          },
          onDocumentReady: (...args: unknown[]) => {
            try {
              const original = (config as any)?.events?.onDocumentReady;
              if (typeof original === 'function') {
                original(...args);
              }
            } finally {
              if (!cancelled) {
                readyRef.current = true;
                window.clearTimeout(hardTimeout);
                onReady?.();
              }
            }
          },
          onError: (...args: unknown[]) => {
            try {
              const original = (config as any)?.events?.onError;
              if (typeof original === 'function') {
                original(...args);
              }
            } finally {
              if (cancelled) return;
              const eventPayload = args[0] as any;
              const message =
                eventPayload?.data?.message ||
                eventPayload?.message ||
                'OnlyOffice failed to load the document';
              failWithMessage(String(message));
            }
          },
        };
        const cfg = {
          ...(config || {}),
          type: mode === 'embedded' ? 'desktop' : ((config as any)?.type || 'desktop'),
          editorConfig,
          events: nextEvents,
        };
        editorRef.current = new window.DocsAPI.DocEditor(holderId.current, cfg);
      } catch (e: any) {
        if (cancelled) return;
        const message = e?.message || String(e);
        failWithMessage(message);
      }
    };

    run();
    return () => {
      cancelled = true;
      window.clearTimeout(hardTimeout);
      try {
        editorRef.current?.destroyEditor?.();
      } catch {}
      editorRef.current = null;
    };
  }, [dsUrl, config]);

  const body = error ? (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white border border-red-200 rounded-2xl p-5">
        <div className="font-black text-red-700 text-sm mb-2">تعذر فتح محرر Word</div>
        <div className="text-xs font-bold text-slate-700">{error}</div>
      </div>
    </div>
  ) : (
    <div id={holderId.current} className="w-full h-full" />
  );

  if (mode === 'embedded') {
    return (
      <div className={`w-full h-full bg-white ${className}`.trim()}>
        {body}
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[140] bg-black/40 flex flex-col ${className}`.trim()}>
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
        <div className="font-black text-slate-900 text-sm">تحرير الوثيقة (Word)</div>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded-xl font-black text-sm bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition"
        >
          إغلاق
        </button>
      </div>

      <div className="flex-1 bg-slate-50">
        {body}
      </div>
    </div>
  );
}
