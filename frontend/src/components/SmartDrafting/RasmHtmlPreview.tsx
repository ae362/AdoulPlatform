import React, { useMemo, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { AlertTriangle } from 'lucide-react';
import { wrapInFullHtml, getHeaderHtml } from '../../utils/rasmTemplates';
import { logViewerEvent } from '../../utils/documentTelemetry';

interface Props {
  htmlContent: string;
  isDarkMode?: boolean;
  submissionId?: string;
}

export const RasmHtmlPreview: React.FC<Props> = ({ htmlContent, submissionId }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const content = (htmlContent || '').trim();

  const formattedHtml = useMemo(() => {
    if (!content) return '';
    logViewerEvent('RENDER_START', { type: 'HTML_PREVIEW', submissionId });

    let raw = content;

    // If input is plain text (no HTML tags), format paragraphs cleanly
    if (!raw.includes('<div') && !raw.includes('<p') && !raw.includes('<table') && !raw.includes('<html')) {
      const paragraphs = raw.split(/\n\s*\n/).map(p => `<p style="margin: 12px 0; text-align: justify; line-height: 2;">${p.replace(/\n/g, '<br/>')}</p>`).join('');
      raw = wrapInFullHtml(paragraphs, getHeaderHtml('DECOR ADOUL 33'));
    } else if (!raw.includes('id="rasm-document-wrapper"') && !raw.includes('rasm-document-body')) {
      if (!raw.includes('<html') && !raw.includes('<body')) {
        raw = wrapInFullHtml(raw, getHeaderHtml('DECOR ADOUL 33'));
      }
    }

    const sanitized = DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
      ADD_TAGS: [
        'style', 'link', 'div', 'p', 'span', 'table', 'tr', 'td', 'th',
        'tbody', 'thead', 'tfoot', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'b', 'strong', 'i', 'em', 'u', 'br', 'hr', 'img', 'svg', 'path'
      ],
      ADD_ATTR: [
        'style', 'class', 'dir', 'id', 'src', 'alt', 'width', 'height',
        'align', 'cellpadding', 'cellspacing', 'border', 'colspan', 'rowspan',
        'viewBox', 'fill', 'stroke'
      ],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });

    logViewerEvent('RENDER_COMPLETE', { type: 'HTML_PREVIEW', submissionId });
    return sanitized;
  }, [content, submissionId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!shadowRootRef.current) {
      shadowRootRef.current = host.attachShadow({ mode: 'open' });
    }

    const shadow = shadowRootRef.current;
    if (!shadow) return;

    if (!formattedHtml) {
      shadow.innerHTML = '';
      return;
    }

    shadow.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        
        :host {
          display: block;
          width: 100%;
          background: transparent;
        }

        * {
          box-sizing: border-box;
        }

        .rasm-sandbox-page {
          width: 100%;
          max-width: 820px;
          min-height: 1050px;
          margin: 0 auto;
          background: #ffffff;
          color: #0f172a;
          font-family: 'Amiri', 'Traditional Arabic', serif, Tahoma, Arial;
          direction: rtl;
          text-align: right;
          padding: 40px 48px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          line-height: 1.85;
          font-size: 15px;
          -webkit-font-smoothing: antialiased;
        }

        .rasm-sandbox-page table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          direction: rtl;
        }

        .rasm-sandbox-page td, 
        .rasm-sandbox-page th {
          padding: 8px 12px;
          text-align: right;
          vertical-align: middle;
        }

        .rasm-sandbox-page img {
          max-width: 100%;
          height: auto;
          display: inline-block;
        }

        .rasm-sandbox-page p {
          margin: 10px 0;
          text-align: justify;
          text-justify: inter-word;
        }

        .rasm-sandbox-page hr {
          border: 0;
          border-top: 1px dashed #94a3b8;
          margin: 18px 0;
        }

        @media print {
          .rasm-sandbox-page {
            box-shadow: none;
            padding: 0;
            max-width: 100%;
            min-height: auto;
          }
        }
      </style>
      <div class="rasm-sandbox-page" dir="rtl">
        ${formattedHtml}
      </div>
    `;
  }, [formattedHtml]);

  if (!content) {
    return (
      <div className="w-full h-[600px] flex flex-col items-center justify-center p-8 bg-amber-50/50 rounded-2xl border border-amber-200 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-600 mb-3" />
        <div className="p-4 text-center text-amber-600 font-amiri font-bold text-xl">لا يوجد محتوى نصي للرسم</div>
        <p className="text-xs font-bold text-amber-700/80 max-w-md font-amiri mt-1">
          لم يتم العثور على صياغة رقمية محفوظة لهذا الرسم. يمكنك العودة للمرحلة السابقة لتوليد الصياغة أو اختيار النموذج المعتمد.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-2">
      <div ref={hostRef} className="w-full flex justify-center" />
    </div>
  );
};
