import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Eye, Loader } from 'lucide-react';
import { DocumentViewer } from './DocumentViewer';
import { SignaturePad } from './SignaturePad';
import { QRCodeGenerator } from './QRCodeGenerator';

interface AuditHubDocument {
  id: string;
  name: string;
  fileNumber: string;
  documentType: string;
  createdAt: string;
  fileUrl: string;
  payload?: any;
  status?: string;
}

interface AuditHubDocumentViewerProps {
  documentId?: string;
  onClose?: () => void;
  autoFetch?: boolean;
  isDarkMode?: boolean;
}

export const AuditHubDocumentViewer: React.FC<AuditHubDocumentViewerProps> = ({
  documentId,
  onClose,
  autoFetch = true,
  isDarkMode = false,
}) => {
  const [document, setDocument] = useState<AuditHubDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Document workflow states
  const [showViewer, setShowViewer] = useState(true);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Fetch latest document from AuditHub on mount or when documentId changes
  useEffect(() => {
    if (!autoFetch) return;

    const fetchLatestDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch from AuditHub API - get the latest document
        // This would be the actual API endpoint that returns the edited document
        const auditHubUrl = `/api/audithub/documents${documentId ? `/${documentId}` : '/latest'}`;

        // For now, create a mock document structure
        // In production, this would fetch from the actual AuditHub API
        const mockDocument: AuditHubDocument = {
          id: documentId || 'doc-' + Date.now(),
          name: 'وثيقة معتمدة من مركز التدقيق',
          fileNumber: `2026/3862`,
          documentType: 'زواج',
          createdAt: new Date().toISOString(),
          fileUrl: '/sample-document.docx',
          payload: {
            parties: 'أحمد محمد - فاطمة علي',
            date: new Date().toLocaleDateString('ar-SA'),
          },
          status: 'READY_FOR_SIGNATURE',
        };

        setDocument(mockDocument);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'فشل في جلب المستند من AuditHub'
        );
        console.error('Failed to fetch document from AuditHub:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestDocument();
  }, [documentId, autoFetch]);

  const handleViewDocument = () => {
    setShowViewer(true);
    setShowSignaturePad(false);
    setShowQRCode(false);
  };

  const handleStartSigning = () => {
    setShowViewer(false);
    setShowSignaturePad(true);
  };

  const handleSignatureCapture = (sigData: string) => {
    setSignatureData(sigData);
    setShowSignaturePad(false);
    setShowQRCode(true);
  };

  const handleCloseWorkflow = () => {
    setShowViewer(true);
    setShowSignaturePad(false);
    setShowQRCode(false);
    setSignatureData(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          <p className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            جاري جلب أحدث المستند من AuditHub...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-4xl">⚠️</div>
          <p className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // No document state
  if (!document) {
    return (
      <div className={`flex items-center justify-center p-8 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <Eye className={`w-8 h-8 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
          <p className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            لم يتم العثور على مستند
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Viewer Container */}
      {showViewer && !showSignaturePad && !showQRCode && (
        <div className={`space-y-4 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white'} rounded-lg p-6`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black">عرض المستند من AuditHub</h2>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {document.name} • {document.fileNumber}
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Document Preview Area */}
          <div className={`border-2 border-dashed rounded-lg p-12 text-center ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-50'}`}>
            <div className="space-y-4">
              <Eye className={`w-16 h-16 mx-auto ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <div>
                <h3 className="font-bold text-lg">معاينة المستند</h3>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {document.fileNumber} - {document.documentType}
                </p>
              </div>
              {document.payload?.date && (
                <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  التاريخ: {document.payload.date}
                </p>
              )}
              {document.payload?.parties && (
                <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  الأطراف: {document.payload.parties}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            {onClose && (
              <button
                onClick={onClose}
                className={`px-6 py-2 rounded-lg font-bold transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
              >
                إغلاق
              </button>
            )}
            <button
              onClick={handleStartSigning}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <span>👇</span>
              <span>التوقيع على المستند</span>
            </button>
          </div>

          {/* Status Badge */}
          <div className={`text-xs text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
            ✓ يتم جلب أحدث نسخة من AuditHub
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {showViewer && !showSignaturePad && !showQRCode && !isDarkMode && (
        <DocumentViewer
          documentId={document.id}
          documentName={document.name}
          fileNumber={document.fileNumber}
          documentType={document.documentType}
          createdAt={document.createdAt}
          onClose={handleCloseWorkflow}
          onSign={handleStartSigning}
        />
      )}

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePad
          documentId={document.id}
          documentName={document.name}
          onSignatureCaptured={handleSignatureCapture}
          onClose={handleCloseWorkflow}
        />
      )}

      {/* QR Code Generator Modal */}
      {showQRCode && signatureData && (
        <QRCodeGenerator
          documentId={document.id}
          documentName={document.name}
          signatureData={signatureData}
          onClose={handleCloseWorkflow}
        />
      )}
    </>
  );
};
