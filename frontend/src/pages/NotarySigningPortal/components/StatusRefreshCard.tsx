import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface DeedStatusInfo {
  id: string;
  saved_rasm_id?: string;
  fileNumber?: string;
  file_number?: string;
  status?: string;
  documentType?: string;
  [key: string]: any;
}

export interface StatusRefreshCardProps {
  deed: DeedStatusInfo;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const StatusRefreshCard: React.FC<StatusRefreshCardProps> = ({
  deed,
  onRefresh,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  const pdfUrl =
    deed.signed_pdf_url ||
    deed.signedPdfUrl ||
    deed.pdf_preview_url ||
    deed.pdfPreviewUrl ||
    deed.canonical_approved_pdf ||
    deed.canonicalApprovedPdf ||
    deed.previewUrl ||
    deed.finalPdfUrl ||
    deed.payload?.signed_pdf_url ||
    deed.payload?.signedPdfUrl ||
    deed.payload?.pdf_preview_url ||
    deed.payload?.pdfPreviewUrl ||
    deed.payload?.canonical_approved_pdf ||
    deed.payload?.canonicalApprovedPdf ||
    deed.payload?.previewUrl ||
    deed.payload?.finalPdfUrl;

  const isPdfReady = Boolean(pdfUrl);

  const handleNavigateToAuditHub = () => {
    if (!isPdfReady) return;
    const targetId = deed.saved_rasm_id || deed.id;
    const fileNo = encodeURIComponent(deed.fileNumber || deed.file_number || '');

    // Append cache-buster & refetch flags
    navigate(`/dashboard?module=auditHub&id=${targetId}&fileNumber=${fileNo}&refetch=true&cb=${Date.now()}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 mb-1 border border-blue-100">
            <span>⚖️</span>
            <span>اعتماد قاضي التوثيق</span>
          </div>
          <h4 className="font-black text-base text-slate-800">
            {deed.documentType ? `${deed.documentType} - ` : ''}رقم الملف: {deed.fileNumber || deed.file_number || deed.id}
          </h4>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            {deed.status ? `الحالة: ${deed.status}` : 'تم اعتماد الرسم وجاهز للتضمين الرسمي في سجلات المحكمة.'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onRefresh && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onRefresh}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition disabled:opacity-50"
            >
              {isLoading ? 'جاري التحديث...' : 'تحديث الحالة'}
            </button>
          )}
          <button
            type="button"
            disabled={!isPdfReady || isLoading}
            onClick={handleNavigateToAuditHub}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>📘</span>
            <span>{isPdfReady ? 'الانتقال إلى التضمين' : 'جاري تجهيز الوثيقة...'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusRefreshCard;

