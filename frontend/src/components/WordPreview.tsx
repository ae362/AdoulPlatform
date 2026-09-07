import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
// @ts-ignore
import PizZip from 'pizzip';
import { injectPlainTextIntoDocxZip, injectHtmlIntoDocxZip } from '../utils/docxTemplate';
import { logViewerEvent } from '../utils/documentTelemetry';
import { FileDown, FileText, AlertTriangle, Loader2 } from 'lucide-react';

export type WordPreviewHandle = {
  getPlainText: () => string;
};

interface WordPreviewProps {
  url?: string;
  isDarkMode?: boolean;
  textContent?: string;
  htmlContent?: string;
  editable?: boolean;
  onContentChange?: (text: string) => void;
  onReady?: () => void;
  sourceTag?: 'base' | 'edited';
  msWordRtlJustify?: boolean;
  submissionId?: string;
  fallbackText?: string;
}

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
        .rasm-document-body p,
        .rasm-sandbox-page p,
        .docx-wrapper p,
        .docx-preview-content-wrapper p,
        .docx-wrapper .docx p,
        .docx-preview-content p {
          font-family: 'Amiri', 'Traditional Arabic', serif !important;
          font-size: 14pt !important;
          line-height: 1.8 !important;
          margin-bottom: 1rem !important;
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
  const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`;

  const resp = await fetch(cacheBustedUrl, {
    cache: 'no-store',
    mode: 'cors',
    credentials: 'omit',
    signal,
  });
  if (!resp.ok) throw new Error(`Failed to load document (${resp.status})`);
  return await resp.arrayBuffer();
}

async function arrayBufferFromContent(content: string, signal: AbortSignal) {
  const templateResp = await fetch('/templates/headers/DECOR ADOUL 33.docx', {
    signal,
    cache: 'no-store',
    mode: 'cors',
    credentials: 'omit',
  });
  if (!templateResp.ok) throw new Error('Failed to fetch template');
  const templateBuffer = await templateResp.arrayBuffer();

  const zip = new PizZip(templateBuffer);
  const isHtml = /<[a-z][\s\S]*>/i.test(content) || content.includes('</p>') || content.includes('</div>');
  if (isHtml) {
    injectHtmlIntoDocxZip(zip, content);
  } else {
    injectPlainTextIntoDocxZip(zip, content);
  }
  const output = zip.generate({ type: 'uint8array' }) as Uint8Array;
  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
}

export const WordPreview = React.forwardRef<WordPreviewHandle, WordPreviewProps>(
  ({ url, isDarkMode, textContent, htmlContent, editable, onContentChange, onReady, sourceTag, msWordRtlJustify = true, submissionId, fallbackText }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const renderIdRef = useRef(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLegacyDoc, setIsLegacyDoc] = useState(false);

    React.useImperativeHandle(ref, () => ({
      getPlainText: () => {
        const el = containerRef.current;
        if (!el) return textContent || htmlContent || fallbackText || '';

        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('style,script,noscript,link,meta,svg').forEach((n) => n.remove());

        let raw = (clone.innerText || clone.textContent || '').replace(/\u00a0/g, ' ');
        raw = raw.replace(/\s+$/g, '').trim();
        if (raw) return raw;

        const wrapper = clone.querySelector('.docx-wrapper') as HTMLElement | null;
        return (wrapper?.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+$/g, '').trim() || textContent || htmlContent || fallbackText || '';
      },
    }));

    useEffect(() => {
      if (editable) {
        setLoading(false);
        return;
      }

      const renderId = ++renderIdRef.current;
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      const run = async () => {
        const container = containerRef.current;
        if (!container) return;

        setLoading(true);
        setError(null);
        setIsLegacyDoc(false);
        logViewerEvent('RENDER_START', { type: 'WORD_PREVIEW', url, submissionId });

        try {
          try {
            container.replaceChildren();
          } catch {
            container.innerHTML = '';
          }
          forceNoTransform(container);
          container.style.position = 'static';

          let buffer: ArrayBuffer;
          const rawContent = htmlContent || textContent;
          if (url) {
            if (url.startsWith('data:') || url.startsWith('blob:')) {
              const resp = await fetch(url, { signal: abort.signal });
              if (!resp.ok) throw new Error(`Failed to read URL (${resp.status})`);
              buffer = await resp.arrayBuffer();
            } else {
              buffer = await arrayBufferFromUrl(url, abort.signal);
            }
          } else if (rawContent) {
            buffer = await arrayBufferFromContent(rawContent, abort.signal);
          } else {
            setLoading(false);
            return;
          }

          if (abort.signal.aborted) return;
          if (renderId !== renderIdRef.current) return;

          // Check if buffer is valid ZIP (starts with PK)
          const bytes = new Uint8Array(buffer);
          const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B;

          if (!isZip) {
            // Check if it's readable UTF-8 text or HTML
            try {
              const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
              if (text && (text.includes('<html') || text.includes('<p') || text.includes('<div') || text.includes('قال تعالى') || text.trim().length > 20)) {
                const host = document.createElement('div');
                host.className = 'p-8 sm:p-12 bg-white min-h-[1050px] shadow-lg rounded text-right font-amiri leading-relaxed';
                host.dir = 'rtl';
                if (text.includes('<') && text.includes('>')) {
                  host.innerHTML = text;
                } else {
                  host.innerHTML = text.split(/\n\s*\n/).map(p => `<p class="my-3 text-justify">${p.replace(/\n/g, '<br/>')}</p>`).join('');
                }
                container.replaceChildren(host);
                setLoading(false);
                onReady?.();
                logViewerEvent('RENDER_COMPLETE', { type: 'WORD_TEXT_PREVIEW', submissionId });
                return;
              }
            } catch {
              // Not plain text
            }

            // Legacy .doc format detected
            setIsLegacyDoc(true);
            setLoading(false);
            return;
          }

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
            experimental: true,
            trimXmlDeclaration: true,
            debug: false,
          } as any;

          const host = document.createElement('div');
          forceNoTransform(host);
          await renderAsync(buffer, host, null as any, options);
          if (msWordRtlJustify) {
            enforceMsWordRtlLastLineRight(host);
            requestAnimationFrame(() => enforceMsWordRtlLastLineRight(host));
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
            logViewerEvent('RENDER_COMPLETE', { type: 'WORD_PREVIEW', submissionId });
            onReady?.();
          }
        } catch (e: any) {
          if (abort.signal.aborted) return;
          if (renderId !== renderIdRef.current) return;
          setLoading(false);
          logViewerEvent('VIEWER_ERROR', { error: e?.message || 'Failed to render DOCX', submissionId });

          // If the error looks like zip corruption or legacy format, show judicial fallback
          if (String(e?.message || '').includes('central directory') || String(e?.message || '').includes('zip')) {
            setIsLegacyDoc(true);
          } else {
            setError(e?.message || 'فشل في معالجة وعرض وثيقة Word');
          }
        }
      };

      run();
      return () => abort.abort();
    }, [editable, url, textContent, htmlContent, sourceTag, onReady, msWordRtlJustify, submissionId]);

    useEffect(() => {
      return () => {
        abortRef.current?.abort();
      };
    }, []);

    // Structured A4 editor container when in editable mode
    if (editable) {
      const displayText = textContent || htmlContent || fallbackText || '';
      return (
        <div className="w-full h-full overflow-y-auto bg-slate-200/50 p-8 flex justify-center custom-scrollbar">
          <div 
            ref={containerRef}
            contentEditable={true}
            suppressContentEditableWarning
            onInput={(e) => onContentChange?.((e.currentTarget.innerText || e.currentTarget.textContent || '').replace(/\u00a0/g, ' ').trim())}
            className="w-[794px] min-h-[1123px] bg-white shadow-xl p-12 text-right dir-rtl outline-none font-amiri text-lg leading-relaxed rounded-sm whitespace-pre-wrap"
            style={{ fontFamily: "'Amiri', serif", fontSize: "14pt", lineHeight: "2.0", direction: "rtl", textAlign: "justify" }}
          >
            {displayText || "جاري تحميل محتوى الرسم..."}
          </div>
        </div>
      );
    }

    // Graceful fallback for legacy .doc or non-zip documents
    if (isLegacyDoc) {
      return (
        <div className="w-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-200" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4 shadow-sm">
            <FileText size={32} />
          </div>
          <h4 className="text-lg font-black font-amiri text-slate-800 mb-2">
            مستند Word مرفق (صيغة ثنائية)
          </h4>
          <p className="text-xs font-bold text-slate-500 max-w-md font-amiri mb-6 leading-relaxed">
            تم إرفاق الوثيقة بصيغة Word الثنائية. يمكنك تحميل الملف مباشرة لفتحه عبر برنامج Microsoft Word، أو مراجعة المسودة الرسمية المعتمدة عبر المنظومة.
          </p>

          <div className="flex items-center gap-3">
            {url && (
              <button
                type="button"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'rasm_attachment.doc';
                  a.click();
                }}
                className="px-5 py-2.5 bg-[#023120] text-[#E6BE8A] hover:brightness-110 rounded-xl text-xs font-black font-amiri flex items-center gap-2 shadow-md transition-all"
              >
                <FileDown size={16} />
                تحميل المستند الأصلي
              </button>
            )}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-200" dir="rtl">
          <AlertTriangle size={36} className="text-rose-500 mb-3" />
          <h4 className="text-base font-black font-amiri text-slate-800 mb-1">تعذر معالجة مستند Word</h4>
          <p className="text-xs font-bold text-slate-500 max-w-sm mb-4">{error}</p>
          {url && (
            <button
              type="button"
              onClick={() => {
                const a = document.createElement('a');
                a.href = url;
                a.download = 'document.doc';
                a.click();
              }}
              className="px-4 py-2 bg-[#023120] text-[#E6BE8A] rounded-lg text-xs font-black font-amiri flex items-center gap-2 shadow"
            >
              <FileDown size={14} />
              تنزيل الملف
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="w-full h-full relative min-h-[600px]">
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xs rounded-2xl">
            <Loader2 className="w-10 h-10 text-[#023120] animate-spin mb-3" />
            <div className={`text-sm font-black font-amiri ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
              جاري فك بنية ومعالجة مستند Word...
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-1">تطبيق معايير المحاذاة والترتيب العدلي</p>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" dir="ltr" />
      </div>
    );
  }
);

WordPreview.displayName = 'WordPreview';
