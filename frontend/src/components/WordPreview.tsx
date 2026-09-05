import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
// @ts-ignore
import PizZip from 'pizzip';
import { injectPlainTextIntoDocxZip } from '../utils/docxTemplate';

export type WordPreviewHandle = {
  getPlainText: () => string;
};

interface WordPreviewProps {
  url?: string;
  isDarkMode?: boolean;
  textContent?: string;
  editable?: boolean;
  onReady?: () => void;
  sourceTag?: 'base' | 'edited';
  msWordRtlJustify?: boolean;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function forceNoTransform(el: HTMLElement) {
  try {
    el.style.setProperty('transform', 'none', 'important');
    el.style.setProperty('transform-origin', '0 0', 'important');
    el.style.setProperty('filter', 'none', 'important');
    el.style.setProperty('will-change', 'auto', 'important');
  } catch {
    // ignore
  }
}

function enforceJustification(root: HTMLElement | null) {
  try {
    if (!root) return;
    const wrapper = (root.querySelector('.docx-wrapper, .docx-preview-content-wrapper, [class*="wrapper"]') || root) as HTMLElement | null;
    if (!wrapper) return;

    wrapper.style.setProperty('direction', 'ltr', 'important');
    wrapper.style.setProperty('display', 'flex', 'important');
    wrapper.style.setProperty('flex-direction', 'column', 'important');
    wrapper.style.setProperty('align-items', 'center', 'important');
    wrapper.querySelectorAll('p').forEach((p) => {
      const el = p as HTMLElement;
      el.style.setProperty('direction', 'rtl', 'important');
      el.style.setProperty('text-align', 'justify', 'important');
      el.style.setProperty('text-justify', 'inter-word', 'important');
      el.style.setProperty('text-align-last', 'right', 'important');
      el.style.setProperty('unicode-bidi', 'embed', 'important');
    });
  } catch {
    // ignore
  }
}

function enforceMsWordRtlLastLineRight(root: HTMLElement | null) {
  try {
    if (!root) return;
    const wrapper = (root.querySelector('.docx-wrapper, .docx-preview-content-wrapper, [class*="wrapper"]') || root) as HTMLElement | null;
    if (!wrapper) return;

    // Inject a scoped style override to mimic MS Word for Arabic RTL justification.
    // Critical detail: wrapper is centered with LTR layout, but all paragraphs and tables are RTL.
    // This completely prevents right-margin clipping caused by RTL coordinate inversion on docx page boxes.
    const styleId = 'msword-rtl-justify-style';
    if (!root.querySelector(`style[data-wordpreview-style="${styleId}"]`)) {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-wordpreview-style', styleId);
      styleEl.textContent = `
        .docx-wrapper,
        .docx-preview-content-wrapper {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          padding: 24px 20px !important;
          background: transparent !important;
          box-sizing: border-box !important;
          direction: ltr !important;
        }
        .docx-wrapper > section.docx,
        .docx-wrapper > article.docx,
        .docx-wrapper .docx,
        .docx-preview-content-wrapper > section,
        .docx-preview-content-wrapper > article,
        .docx-preview-content-wrapper .docx-preview-content {
          margin: 10px auto !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          position: relative !important;
        }
        .docx-wrapper p,
        .docx-preview-content-wrapper p {
          text-align: justify !important;
          text-justify: inter-word !important;
          text-align-last: right !important;
          direction: rtl !important;
          unicode-bidi: embed !important;
        }
        .docx-wrapper table,
        .docx-preview-content-wrapper table {
          direction: rtl !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        .docx-wrapper td,
        .docx-wrapper th,
        .docx-preview-content-wrapper td,
        .docx-preview-content-wrapper th {
          direction: rtl !important;
          unicode-bidi: embed !important;
        }
      `;
      root.prepend(styleEl);
    }

    wrapper.style.setProperty('direction', 'ltr', 'important');
    wrapper.style.setProperty('display', 'flex', 'important');
    wrapper.style.setProperty('flex-direction', 'column', 'important');
    wrapper.style.setProperty('align-items', 'center', 'important');

    const pages = wrapper.querySelectorAll('.docx, .docx-preview-content, section, article');
    pages.forEach((p) => {
      const el = p as HTMLElement;
      el.style.setProperty('margin-left', 'auto', 'important');
      el.style.setProperty('margin-right', 'auto', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
    });

    const paragraphs = wrapper.querySelectorAll('p');
    paragraphs.forEach((p) => {
      const el = p as HTMLElement;
      el.style.textAlign = 'justify';
      (el.style as any).textAlignLast = 'right';
      el.style.direction = 'rtl';
      (el.style as any).unicodeBidi = 'embed';
    });

    const tables = wrapper.querySelectorAll('table');
    tables.forEach((t) => {
      const el = t as HTMLElement;
      el.style.direction = 'rtl';
      (el.style as any).unicodeBidi = 'embed';
      el.style.maxWidth = '100%';
    });
  } catch {
    // ignore
  }
}

async function arrayBufferFromUrl(url: string, signal: AbortSignal) {
  const isSupabasePublic = url.includes('supabase.co/storage/v1/object/public/');
  const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`;

  const resp = await fetch(cacheBustedUrl, {
    cache: 'no-store',
    mode: 'cors',
    credentials: isSupabasePublic ? 'omit' : 'include',
    signal,
  });
  if (!resp.ok) throw new Error(`Failed to load document (${resp.status})`);
  return await resp.arrayBuffer();
}

async function arrayBufferFromTextContent(textContent: string, signal: AbortSignal) {
  const templateResp = await fetch('/templates/headers/DECOR ADOUL 33.docx', { signal });
  if (!templateResp.ok) throw new Error('Failed to fetch template');
  const templateBuffer = await templateResp.arrayBuffer();

  const zip = new PizZip(templateBuffer);
  injectPlainTextIntoDocxZip(zip, textContent);
  const output = zip.generate({ type: 'uint8array' }) as Uint8Array;
  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
}

export const WordPreview = React.forwardRef<WordPreviewHandle, WordPreviewProps>(
  ({ url, isDarkMode, textContent, editable, onReady, sourceTag, msWordRtlJustify = true }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const renderIdRef = useRef(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    React.useImperativeHandle(ref, () => ({
      getPlainText: () => {
        const el = containerRef.current;
        if (!el) return '';

        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('style,script,noscript,link,meta,svg').forEach((n) => n.remove());

        let raw = (clone.innerText || clone.textContent || '').replace(/\u00a0/g, ' ');
        raw = raw.replace(/\s+$/g, '').trim();
        if (raw) return raw;

        const wrapper = clone.querySelector('.docx-wrapper') as HTMLElement | null;
        return (wrapper?.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+$/g, '').trim();
      },
    }));

    // Toggle inline editing without re-render.
    useEffect(() => {
      try {
        const el = containerRef.current;
        if (!el) return;
        el.setAttribute('contenteditable', editable ? 'true' : 'false');
        el.setAttribute('spellcheck', 'false');
        (el as any).contentEditable = editable ? 'true' : 'false';
        el.style.outline = editable ? '2px solid rgba(37, 99, 235, 0.35)' : 'none';
        el.style.outlineOffset = editable ? '6px' : '0px';
      } catch {
        // ignore
      }
    }, [editable]);

    useEffect(() => {
      const renderId = ++renderIdRef.current;
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      const run = async () => {
        const container = containerRef.current;
        if (!container) return;

        setLoading(true);
        setError(null);

        try {
          try {
            container.replaceChildren();
          } catch {
            container.innerHTML = '';
          }
          forceNoTransform(container);
          container.style.position = 'static';

          let buffer: ArrayBuffer;
          // Prefer rendering the real document URL when available.
          // `textContent` is a fallback for legacy/plain-text documents (no DOCX URL).
          if (url) {
            if (url.startsWith('data:') || url.startsWith('blob:')) {
              const resp = await fetch(url, { signal: abort.signal });
              if (!resp.ok) throw new Error(`Failed to read URL (${resp.status})`);
              buffer = await resp.arrayBuffer();
            } else {
              buffer = await arrayBufferFromUrl(url, abort.signal);
            }
          } else if (textContent) {
            buffer = await arrayBufferFromTextContent(textContent, abort.signal);
          } else {
            setLoading(false);
            return;
          }

          if (abort.signal.aborted) return;
          if (renderId !== renderIdRef.current) return;

          const options = {
            className: 'docx',
            inWrapper: true,
            ignoreHeight: false,
            ignoreWidth: false,
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
            useBase64URL: true,
            // Matches Judge Portal / RasmDocxPreview settings; improves layout stability for complex RTL docs.
            experimental: true,
            trimXmlDeclaration: true,
            debug: false,
          } as any;

          // Render into an off-DOM host to avoid stale async renders stacking/overlaying.
          const host = document.createElement('div');
          forceNoTransform(host);
          await renderAsync(buffer, host, null as any, options);
          if (msWordRtlJustify) {
            enforceMsWordRtlLastLineRight(host);
            requestAnimationFrame(() => enforceMsWordRtlLastLineRight(host));
            setTimeout(() => enforceMsWordRtlLastLineRight(host), 0);
          } else {
            enforceJustification(host);
            requestAnimationFrame(() => enforceJustification(host));
          }

          if (abort.signal.aborted) return;
          if (renderId !== renderIdRef.current) return;

          try {
            container.replaceChildren(host);
          } catch {
            container.innerHTML = '';
            container.appendChild(host);
          }

          if (renderId === renderIdRef.current) {
            setLoading(false);
            onReady?.();
          }
        } catch (e: any) {
          if (abort.signal.aborted) return;
          if (renderId !== renderIdRef.current) return;
          setLoading(false);
          setError(e?.message || 'Failed to render DOCX');
        }
      };

      run();
      return () => abort.abort();
    }, [url, textContent, sourceTag, onReady]);

    useEffect(() => {
      return () => {
        abortRef.current?.abort();
      };
    }, []);

    if (error) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className={`text-sm font-bold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</div>
        </div>
      );
    }

    return (
      <div className="w-full h-full relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Loading…</div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" dir="ltr" />
      </div>
    );
  }
);

WordPreview.displayName = 'WordPreview';

export default WordPreview;
