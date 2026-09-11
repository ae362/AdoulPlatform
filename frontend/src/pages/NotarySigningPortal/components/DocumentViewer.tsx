import React, { useState } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '../../../components/common/ToastNotification';

interface DocumentViewerProps {
  documentId: string;
  documentName: string;
  fileNumber: string;
  documentType: string;
  createdAt: string;
  onClose: () => void;
  onSign: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  documentName,
  fileNumber,
  documentType,
  createdAt,
  onClose,
  onSign,
}) => {
  const [zoom, setZoom] = useState(120); // Default zoom is now 120%
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 5; // Mock value - replace with actual

  const handleZoomIn = () => setZoom(Math.min(zoom + 10, 200));
  const handleZoomOut = () => setZoom(Math.max(zoom - 10, 50));
  const handleDownload = () => {
    toast.info(`جاري تحضير وتنزيل الوثيقة الرسمية (${documentName || 'وثيقة'})...`);
    // Implement actual download logic
  };
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center h-full w-full">
      {/* Modal Container */}
      <div className="bg-white rounded-lg shadow-2xl flex flex-col w-full max-w-4xl h-[90vh] justify-center items-center">
        {/* Header */}
        <div className="border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">عرض الوثيقة</h2>
            <p className="text-sm text-slate-600 mt-1">
              {documentName} • {fileNumber} • {documentType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Document Display Area */}
        <div className="flex-1 w-full flex justify-center items-center overflow-auto bg-slate-100">
          <div
            className="bg-white rounded-lg shadow-lg transition-transform flex items-center justify-center"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center', minHeight: '80vh', minWidth: '60vw' }}
          >
            {/* Document Content */}
            <div className="max-w-3xl mx-auto">
              {/* Header */}
              <div className="text-center mb-8 pb-8 border-b-2 border-slate-300">
                <h1 className="text-3xl font-black text-slate-900 mb-2">وثيقة {documentType}</h1>
                <p className="text-slate-600">رقم الملف: {fileNumber}</p>
                <p className="text-slate-600">التاريخ: {new Date(createdAt).toLocaleDateString('ar-SA')}</p>
              </div>

              {/* Document Body */}
              <div className="space-y-6 text-right text-lg leading-relaxed">
                <p className="text-slate-700">
                  بناءً على الصلاحيات المخولة لي بموجب القانون، أقوم توثيق هذه الوثيقة والتصديق عليها.
                </p>

                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-4">الطرف الأول:</h3>
                  <p className="text-slate-700 mb-2">الاسم: ___________________________</p>
                  <p className="text-slate-700 mb-2">رقم الهوية: ___________________________</p>
                  <p className="text-slate-700">المهنة: ___________________________</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-4">الطرف الثاني:</h3>
                  <p className="text-slate-700 mb-2">الاسم: ___________________________</p>
                  <p className="text-slate-700 mb-2">رقم الهوية: ___________________________</p>
                  <p className="text-slate-700">المهنة: ___________________________</p>
                </div>

                <p className="text-slate-700 mt-8 pt-8 border-t border-slate-300">
                  وحررت هذه الوثيقة بتاريخ {new Date(createdAt).toLocaleDateString('ar-SA')} وأوقعت عليها برقم الختم الحكومي.
                </p>

                <div className="mt-12 pt-8 border-t border-slate-300">
                  <p className="text-slate-600 mb-4">التوقيع: ___________________________</p>
                  <p className="text-slate-600">الموثق الأساسي</p>
                </div>
              </div>

              {/* Page Number */}
              <div className="text-center mt-8 pt-8 border-t border-slate-300 text-slate-600">
                الصفحة {currentPage} من {totalPages}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
          {/* Left side - Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-slate-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Center - Zoom */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-slate-600 w-12 text-center">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-bold">تنزيل</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span className="text-sm font-bold">طباعة</span>
            </button>
            <button
              onClick={onSign}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <span>👇</span>
              <span>التوقيع</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
