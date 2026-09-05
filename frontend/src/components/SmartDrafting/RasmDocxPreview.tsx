import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Loader2, Scale, FileDown } from 'lucide-react';
import { renderAsync } from 'docx-preview';
// @ts-ignore
import PizZip from 'pizzip';
import { injectPlainTextIntoDocxZip } from '../../utils/docxTemplate';

interface Props {
  textContent: string;
  isDarkMode?: boolean;
  templatePath?: string;
}

const DEFAULT_TEMPLATE = '/templates/headers/DECOR ADOUL 33.docx';

export const RasmDocxPreview = ({ textContent, isDarkMode, templatePath }: Props) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!textContent) return;

    setIsGenerating(true);
    setPdfUrl(null);

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
        const tpl = templatePath || DEFAULT_TEMPLATE;
        const templateResponse = await fetch(tpl, { cache: 'no-store' });
        if (!templateResponse.ok) {
          throw new Error(`Failed to fetch template: ${tpl}`);
        }

        const arrayBuffer = await templateResponse.arrayBuffer();
        const zip = new PizZip(arrayBuffer);
        injectPlainTextIntoDocxZip(zip, textContent);

        // Standardize output to ensure it works across all build targets
        const output = zip.generate({ type: 'uint8array' });
        const blob = new Blob([output], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

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
          console.error("docx-preview failed:", e);
          // Fallback rendering attempt
          container.innerHTML = `<div style="padding: 50px; text-align: right; direction: rtl; font-family: 'Traditional Arabic', serif; font-size: 24px;">${textContent}</div>`;
        }

        // Increase timeout to wait for image resources and layout settling.
        await new Promise((r) => setTimeout(r, 1200));

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

        setPdfUrl(url);
      } catch (err) {
        console.error('DOCX Preview Generation Error:', err);
        // Best-effort fallback: show nothing (keeps UX consistent).
        setPdfUrl(null);
      } finally {
        if (!cancelled) setIsGenerating(false);
        if (document.body.contains(container)) document.body.removeChild(container);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      if (containerRef.current && document.body.contains(containerRef.current)) {
        document.body.removeChild(containerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textContent, templatePath]);

  if (isGenerating || !pdfUrl) {
    return (
      <div
        className={`w-full h-[600px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
        }`}
      >
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} font-black text-lg`}>
          جاري توليد النسخة الرسمية...
        </p>
        <p className="text-[11px] text-gray-400 mt-2 italic">يتم تطبيق قالب DOCX الرسمي ثم تحويله إلى PDF</p>
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
          <div className="bg-emerald-500 p-2 rounded-lg text-white shadow-md">
            <Scale size={20} />
          </div>
          <div>
            <h5 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-black text-sm`}>معاينة رسم رسمية (قالب Word)</h5>
            <p className="text-[10px] text-gray-400 font-bold">مطابقة لترويسة القالب الرسمي</p>
          </div>
        </div>

        <button
          onClick={() => window.open(pdfUrl, '_blank')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg transition-all"
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
