import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Loader2, Scale, FileDown, AlertTriangle } from 'lucide-react';
import { renderAsync } from 'docx-preview';
// @ts-ignore
import PizZip from 'pizzip';
import { injectPlainTextIntoDocxZip } from '../../utils/docxTemplate';
import { logViewerEvent } from '../../utils/documentTelemetry';

interface Props {
  textContent?: string;
  blobUrl?: string | null;
  isDarkMode?: boolean;
  templatePath?: string;
  submissionId?: string;
}

const DEFAULT_TEMPLATE = '/templates/headers/DECOR ADOUL 33.docx';

// Non-blocking async execution wrapper
const scheduleNonBlocking = (fn: () => void | Promise<void>) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as any).requestIdleCallback(() => {
      fn();
    }, { timeout: 1000 });
  }
  return setTimeout(fn, 16);
};

export const RasmDocxPreview = ({ textContent, blobUrl, isDarkMode, templatePath, submissionId }: Props) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!textContent && !blobUrl) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setPdfUrl(null);

    // Clean any previously generated object URL
    if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }

    logViewerEvent('RENDER_START', { type: 'DOCX_PREVIEW', submissionId, hasText: !!textContent, hasBlob: !!blobUrl });

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '1000px';
    container.style.background = '#ffffff';
    container.style.padding = '0';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-99999';
    container.dir = 'rtl';
    document.body.appendChild(container);
    containerRef.current = container;

    let cancelled = false;

    const run = async () => {
      try {
        let blob: Blob;

        if (blobUrl) {
          const resp = await fetch(blobUrl);
          if (!resp.ok) throw new Error(`Failed to fetch docx blob: ${resp.status}`);
          blob = await resp.blob();
        } else {
          const tpl = templatePath || DEFAULT_TEMPLATE;
          const templateResponse = await fetch(tpl, { cache: 'no-store' });
          if (!templateResponse.ok) {
            throw new Error(`Failed to fetch template: ${tpl}`);
          }

          const arrayBuffer = await templateResponse.arrayBuffer();
          const zip = new PizZip(arrayBuffer);
          injectPlainTextIntoDocxZip(zip, textContent || '');

          const output = zip.generate({ type: 'uint8array' }) as Uint8Array;
          blob = new Blob([output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          });
        }

        if (cancelled) return;
        container.innerHTML = '';

        try {
          await renderAsync(blob, container, undefined, {
            className: 'docx-preview-content',
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
          });
        } catch (e) {
          console.error('docx-preview parsing error:', e);
          container.innerHTML = `<div style="padding: 50px; text-align: right; direction: rtl; font-family: 'Traditional Arabic', serif; font-size: 24px;">${textContent || ''}</div>`;
        }

        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 600));

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 1000,
          windowWidth: 1000,
          allowTaint: true,
          imageTimeout: 15000,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
        });

        if (cancelled) return;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        const pageHeight = pdf.internal.pageSize.getHeight();
        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        const outBlob = pdf.output('blob');
        const url = URL.createObjectURL(outBlob);

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        activeBlobUrlRef.current = url;
        setPdfUrl(url);
        setIsGenerating(false);
        logViewerEvent('RENDER_COMPLETE', { type: 'DOCX_PREVIEW', submissionId });
      } catch (err: any) {
        if (cancelled) return;
        console.error('DOCX Preview Generation Error:', err);
        logViewerEvent('VIEWER_ERROR', { error: err?.message || 'DOCX rendering failure', submissionId });
        setErrorMessage(err?.message || 'تعذر توليد المعاينة الرسمية لملف Word');
        setIsGenerating(false);
      } finally {
        if (containerRef.current && document.body.contains(containerRef.current)) {
          document.body.removeChild(containerRef.current);
          containerRef.current = null;
        }
      }
    };

    const handle = scheduleNonBlocking(run);

    return () => {
      cancelled = true;
      if (typeof handle === 'number') clearTimeout(handle);
      if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
      if (containerRef.current && document.body.contains(containerRef.current)) {
        document.body.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, [textContent, blobUrl, templatePath, submissionId]);

  if (isGenerating) {
    return (
      <div
        className={`w-full h-[600px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <Loader2 className="w-12 h-12 text-[#023120] animate-spin mb-4" />
        <p className={`${isDarkMode ? 'text-slate-300' : 'text-slate-800'} font-black text-lg font-amiri`}>
          جاري توليد النسخة الرسمية للرسم...
        </p>
        <p className="text-xs text-slate-400 mt-2 font-bold font-amiri">يتم تطبيق قالب DOCX الرسمي ومعالجة الرسوم البيانية بدقة عالية</p>
      </div>
    );
  }

  if (errorMessage || !pdfUrl) {
    return (
      <div className="w-full h-[500px] flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center">
        <AlertTriangle size={36} className="text-amber-600 mb-3" />
        <h5 className="text-lg font-black font-amiri text-slate-800 mb-2">تعذر معالجة معاينة Word</h5>
        <p className="text-xs font-bold text-slate-500 max-w-md font-amiri">{errorMessage || 'حدث خطأ أثناء معالجة القالب والمستند'}</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full min-h-[900px] border rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'
      }`}
    >
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-sm mb-2 p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="bg-[#023120] p-2 rounded-lg text-[#E6BE8A] shadow-md">
            <Scale size={20} />
          </div>
          <div>
            <h5 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-black text-sm font-amiri`}>معاينة رسم رسمية (قالب Word)</h5>
            <p className="text-[10px] text-gray-400 font-bold font-amiri">مطابقة لترويسة القالب الرسمي</p>
          </div>
        </div>

        <button
          onClick={() => window.open(pdfUrl, '_blank')}
          className="px-4 py-2 bg-[#023120] text-[#E6BE8A] rounded-lg text-xs font-black font-amiri hover:brightness-110 flex items-center gap-2 shadow-lg transition-all"
        >
          <FileDown size={14} />
          تحميل PDF
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-inner">
        <iframe src={pdfUrl} className="w-full h-full min-h-[800px] border-0" title="Official Rasm Preview" />
      </div>
    </div>
  );
};
