import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FileDown, Printer, Scale, Loader2, Maximize2 } from 'lucide-react';
import { wrapInFullHtml, getHeaderHtml } from '../../utils/rasmTemplates';

interface Props {
  htmlContent: string;
  isDarkMode?: boolean;
}

export const RasmHtmlPreview = ({ htmlContent, isDarkMode }: Props) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!htmlContent) return;
    setIsGenerating(true);
    
    // Auto-wrap if it looks like raw content (doesn't have our internal wrapper ID)
    let processedHtml = htmlContent;
    if (!htmlContent || !htmlContent.includes('id="rasm-document-wrapper"')) {
      // Check if it's already a full HTML or just text
      const cleanContent = htmlContent || '<p style="text-align:center;">(محتوى فارغ)</p>';
      processedHtml = wrapInFullHtml(cleanContent, getHeaderHtml('DECOR ADOUL 33'));
    }

    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = '#ffffff';
    container.dir = 'rtl';
    container.innerHTML = processedHtml;
    document.body.appendChild(container);

    const generatePdf = async () => {
      try {
        // Wait for images to load (critical for headers)
        const images = container.getElementsByTagName('img');
        const loadPromises = Array.from(images).map(img => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if image fails
          });
        });
        await Promise.all(loadPromises);
        
        // Give an extra 300ms for stable layout
        await new Promise(r => setTimeout(r, 300));

        // High fidelity capture
        const canvas = await html2canvas(container, {
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 800,
          allowTaint: true,
          imageTimeout: 5000
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'pt',
          format: 'a4'
        });

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

        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        document.body.removeChild(container);
        setIsGenerating(false);
      } catch (err) {
        console.error('PDF Generation Error:', err);
        // Fallback: Just show HTML in iframe if PDF fails
        const blob = new Blob([`<html><body dir="rtl" style="background:#fff; padding:40px;">${processedHtml}</body></html>`], { type: 'text/html' });
        setPdfUrl(URL.createObjectURL(blob));
        if (document.body.contains(container)) document.body.removeChild(container);
        setIsGenerating(false);
      }
    };

    // Small delay for style application
    const timer = setTimeout(generatePdf, 500);
    return () => {
      clearTimeout(timer);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [htmlContent]);

  if (isGenerating || !pdfUrl) {
    return (
      <div className={`w-full h-[600px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} font-black text-lg`}>جاري معالجة المحرر العدلي الرقمي...</p>
        <p className="text-[11px] text-gray-400 mt-2 italic">يتم الآن توليد معاينة مطابقة تماماً للمحرر الرسمي</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full min-h-[900px] border rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-sm mb-2 p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg text-white shadow-md">
             <Scale size={20} />
          </div>
          <div>
            <h5 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-black text-sm`}>معاينة المسودة العدلية الحكومية</h5>
            <p className="text-[10px] text-gray-400 font-bold">هذه النسخة مطابقة تماماً لما سيراه القاضي ومصلحة التضمين</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={() => window.open(pdfUrl, '_blank')}
             className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg transition-all"
           >
             <FileDown size={14} />
             تحميل المسودة
           </button>
        </div>
      </div>
      
      <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-inner">
        <iframe 
          src={pdfUrl} 
          className="w-full h-full min-h-[800px] border-0" 
          title="Final Rasm Preview"
        />
      </div>
    </div>
  );
};
