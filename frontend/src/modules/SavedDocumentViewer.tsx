import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Download,
  Edit,
  FileText,
  Loader,
  Printer,
  Share2,
  Trash2,
  User,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { WordPreview } from '../components/WordPreview';

export const SavedDocumentViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const preferredAttachmentId = (location.state as any)?.preferredAttachmentId as string | null | undefined;
  const preferredAttachmentUrl = (location.state as any)?.preferredAttachmentUrl as string | null | undefined;
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(preferredAttachmentId || null);
  const [selectedAttachmentUrl, setSelectedAttachmentUrl] = useState<string | null>(preferredAttachmentUrl || null);
  const [userSelected, setUserSelected] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Fetch document details
  const documentQuery = trpc.feesAgent.documents.getSavedRasm.useQuery(
    { sessionToken: sessionToken || '', id: id || '' },
    {
      enabled: !!sessionToken && !!id,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    }
  );

  const isLoading = documentQuery.isLoading;
  const error = documentQuery.error;
  const document = documentQuery.data as {
    id: string;
    fileNumber: string | null;
    documentType: string | null;
    createdAt: string;
    draft: string | null;
    payload: Record<string, unknown>;
    latestDraftVersionId?: string | null;
    latestDraftDocxUrl?: string | null;
    latestDraftSha256?: string | null;
    latestDraftUpdatedAt?: string | null;
    attachments: Array<{
      id: string;
      category: string;
      fileName: string;
      fileUrl: string;
      mimeType: string | null;
      fileSize: number | null;
      metadata: Record<string, unknown> | null;
    }>;
  } | undefined;
  const payload = document?.payload || {};

  React.useEffect(() => {
    const list = document?.attachments || [];
    if (!list.length) return;

    const preferredById = preferredAttachmentId
      ? list.find((attachment: any) => attachment.id === preferredAttachmentId)
      : null;
    const preferredByUrl = !preferredById && preferredAttachmentUrl
      ? list.find((attachment: any) => String(attachment.fileUrl || '') === String(preferredAttachmentUrl))
      : null;
    const preferred = preferredById || preferredByUrl;

    if (!preferred) return;
    if (selectedAttachmentId === preferred.id && selectedAttachmentUrl === preferred.fileUrl) return;

    setSelectedAttachmentId(preferred.id);
    setSelectedAttachmentUrl(preferred.fileUrl || null);
    setUserSelected(true);
  }, [document?.attachments, preferredAttachmentId, preferredAttachmentUrl, selectedAttachmentId, selectedAttachmentUrl]);

  const getJudgeLikePdfViewerUrl = (url: string) => {
    const u = String(url || '').trim();
    if (!u) return '';
    // Match Judge Portal technique exactly (PDF Open Parameters).
    // IMPORTANT: Always override any existing hash to keep behavior consistent.
    const viewerHash = 'view=FitH&toolbar=0&navpanes=0&scrollbar=0';
    const base = u.split('#')[0];
    return `${base}#${viewerHash}`;
  };

  // Auto-select: PDF-first approach.
  // Always prefer any real PDF over any DOCX. Only fall back to DOCX if no PDF exists.
  // PDF priority: audit_final_pdf > audit_draft_pdf > document PDF > any PDF.
  React.useEffect(() => {
    const list = document?.attachments || [];
    if (!document?.id || list.length === 0) return;

    // If the user explicitly clicked something, don't override their choice.
    if (userSelected && selectedAttachmentId && list.find((a: any) => a.id === selectedAttachmentId)) return;

    const isPdf = (a: any) => {
      const mime = String(a?.mimeType || '').toLowerCase();
      const url = String(a?.fileUrl || '').toLowerCase();
      return mime.includes('pdf') || url.endsWith('.pdf');
    };

    const catWeight = (cat: string) => {
      const c = String(cat || '').toLowerCase();
      if (c === 'audit_final_pdf') return 0;
      if (c === 'audit_draft_pdf') return 1;
      if (c === 'document') return 2;
      return 10;
    };

    // Collect all PDF attachments, sorted by priority.
    const pdfs = list
      .filter((a: any) => isPdf(a))
      .sort((a: any, b: any) => catWeight(a.category) - catWeight(b.category));

    let best: any = null;
    let reason = '';

    if (pdfs.length > 0) {
      best = pdfs[0];
      reason = `pdf_first:${best.category}`;
    } else {
      // No PDF at all — fall back to any DOCX (prefer edited over base).
      const docxWeight = (cat: string) => {
        const c = String(cat || '').toLowerCase();
        if (c === 'audit_final_docx') return 0;
        if (c === 'audit_draft_docx') return 1;
        if (c === 'judge_attachment') return 10;
        return 5;
      };
      const docx = list
        .filter((a: any) => {
          const mime = String(a?.mimeType || '').toLowerCase();
          const url = String(a?.fileUrl || '').toLowerCase();
          return mime.includes('wordprocessingml') || mime.includes('msword') || url.endsWith('.docx');
        })
        .sort((a: any, b: any) => docxWeight(a.category) - docxWeight(b.category));
      if (docx.length > 0) {
        best = docx[0];
        reason = `docx_fallback:${best.category}`;
      } else {
        best = list[0] || null;
        reason = 'first_fallback';
      }
    }

    if (!best?.id) return;
    if (selectedAttachmentId === best.id) return;

    // eslint-disable-next-line no-console
    console.log('[SAVED_DOCS] selected', {
      rasmId: document.id,
      attachmentId: best.id,
      category: best.category,
      url: best.fileUrl,
      reason,
    });
    setSelectedAttachmentId(best.id);
    setSelectedAttachmentUrl(best.fileUrl);
  }, [document?.id, document?.attachments, selectedAttachmentId, userSelected]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-600 font-bold">جاري تحميل الوثيقة...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">خطأ في تحميل الوثيقة</h2>
          <p className="text-slate-600 font-bold mb-6">
            {error ? (error as any).message : 'لم يتم العثور على الوثيقة'}
          </p>
          <button
            onClick={() => navigate('/saved-documents')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            العودة إلى المكتبة
          </button>
        </div>
      </div>
    );
  }

  // Extract document info
  const firstParty =
    (payload.sellers as any)?.[0]?.name ||
    (payload.applicants as any)?.[0]?.name ||
    (payload.husband_name as string) ||
    (payload.parties_names as string)?.split('-')?.[0] ||
    (payload.deceased_name as string) ||
    (payload.applicants_names as string)?.split(',')?.[0] ||
    '---';

  const secondParty =
    (payload.buyers as any)?.[0]?.name ||
    (payload.wife_name as string) ||
    (payload.parties_names as string)?.split('-')?.[1] ||
    '---';

  const attachments = document.attachments || [];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="w-full px-4 md:px-8 py-6">
          <button
            onClick={() => navigate('/saved-documents')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-bold transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
            العودة إلى المكتبة
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">عرض الوثيقة</h1>
              <p className="text-slate-600 font-bold text-sm mt-1">رقم الوثيقة: {document.fileNumber || 'قيد الانتظار'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                title="طباعة"
                className="p-3 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                title="تحميل"
                className="p-3 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                title="مشاركة"
                className="p-3 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 md:px-8 py-8">
          <div className="grid grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="col-span-2 space-y-6">
              {/* Document Metadata */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-2xl font-black text-slate-900 mb-6">بيانات الوثيقة</h2>

                <div className="grid grid-cols-2 gap-6">
                  {/* First Party */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">الطرف الأول</label>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <User className="w-5 h-5 text-slate-400" />
                      <p className="font-bold text-slate-900">{firstParty}</p>
                    </div>
                  </div>

                  {/* Second Party */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">الطرف الثاني</label>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <User className="w-5 h-5 text-slate-400" />
                      <p className="font-bold text-slate-900">{secondParty}</p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">تاريخ الإنشاء</label>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <p className="font-bold text-slate-900">
                        {new Date(document.createdAt || new Date()).toLocaleDateString('ar-MA')}
                      </p>
                    </div>
                  </div>

                  {/* Document Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">نوع الوثيقة</label>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <p className="font-bold text-slate-900">{document.documentType || 'غير محدد'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Viewer */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                  <h2 className="text-2xl font-black text-slate-900">عرض الوثيقة</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                        className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-600"
                        title="تصغير (Zoom out)"
                      >
                        <ZoomOut className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-bold text-slate-900 min-w-[50px] text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        onClick={() => setZoom(Math.min(4, zoom + 0.1))}
                        className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-600"
                        title="تكبير (Zoom in)"
                      >
                        <ZoomIn className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      onClick={() => setZoom(1)}
                      className="px-3 py-1 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                    >
                      إعادة تعيين
                    </button>
                  </div>
                </div>
                <div className="overflow-auto bg-slate-100 p-6 w-full">
                  <div style={{ display: 'block', width: '100%', transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }}>
                    {(() => {
                      // First try to display selected attachment if available
                      if (document?.attachments && document.attachments.length > 0) {
                      const selectedAttachment = document.attachments.find((a: any) => a.id === selectedAttachmentId);
                      
                      if (selectedAttachment?.fileUrl) {
                        const fileName = (selectedAttachment.fileName || '').toLowerCase();
                        const mimeType = (selectedAttachment.mimeType || '').toLowerCase();
                        
                        // Check if it's a DOCX file
                        const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc') || 
                                      mimeType.includes('wordprocessingml') || mimeType.includes('msword');
                        
                        // Check if it's a PDF
                        const isPdf = fileName.endsWith('.pdf') || mimeType.includes('pdf');
                        
                        // Check if it's an image
                        const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName) || mimeType.startsWith('image/');
                        
                        // Render based on file type
                        if (isDocx) {
                          const inferredSourceTag: 'base' | 'edited' = String(selectedAttachment?.category || '')
                            .toLowerCase()
                            .includes('audit')
                            ? 'edited'
                            : 'base';
                          return (
                            <div className="w-full bg-white rounded-lg overflow-auto">
                              <WordPreview
                                url={selectedAttachment.fileUrl}
                                isDarkMode={false}
                                sourceTag={inferredSourceTag}
                                msWordRtlJustify
                              />
                            </div>
                          );
                        }
                        
                        if (isImage) {
                          return (
                            <div className="w-full flex items-center justify-center p-4">
                              <img 
                                src={selectedAttachment.fileUrl} 
                                alt="Document" 
                                className="max-w-full object-contain"
                              />
                            </div>
                          );
                        }
                        
                        // Default to iframe for PDF and other document types
                        if (isPdf) {
                          return (
                            <div className="w-full h-[1600px] bg-white overflow-hidden flex flex-col relative rounded-lg">
                              <iframe
                                src={getJudgeLikePdfViewerUrl(selectedAttachment.fileUrl)}
                                className="flex-1 w-full h-full border-0 select-none pointer-events-none"
                                title="عرض الوثيقة"
                                allow="fullscreen"
                              />
                              <div className="absolute inset-0 z-10 bg-transparent" />
                            </div>
                          );
                        }

                        return (
                          <iframe
                            src={selectedAttachment.fileUrl}
                            className="w-full border-none rounded-lg"
                            style={{ height: '800px' }}
                            title="عرض الوثيقة"
                            allow="fullscreen"
                          />
                        );
                      }
                    }

                    // Fallback to draft content if no attachments exist
                    if (document?.draft) {
                      return (
                        <div className="w-full bg-white flex flex-col rounded-lg overflow-hidden">
                          <div className="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                            <h3 className="font-black text-slate-900 text-sm">محتوى الوثيقة (نسخة نصية)</h3>
                            <p className="text-xs text-slate-600 mt-1">هذه وثيقة قديمة. يمكنك توليد نسخة PDF منها</p>
                          </div>
                          <div className="flex-1 overflow-auto p-8">
                            <div className="bg-white rounded-lg p-6 border border-slate-200 text-sm font-mono whitespace-pre-wrap text-slate-700 leading-relaxed">
                              {document.draft}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="w-full h-[600px] bg-white rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
                        <FileText className="w-16 h-16 text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold">لا توجد محتويات للعرض</p>
                        <p className="text-xs text-slate-400 mt-2">يرجى اختيار مرفق من القائمة أدناه</p>
                      </div>
                    );
                    })()}
                  </div>
                </div>
              </div>

              {/* Legacy Document Notice */}
              {!document?.attachments || document.attachments.length === 0 ? (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mt-8">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-black text-blue-900 mb-2">وثيقة قديمة</h3>
                      <p className="text-blue-800 text-sm font-bold mb-4">
                        هذه وثيقة تم حفظها قبل تفعيل ميزة حفظ PDF. يمكنك عرض محتوى الوثيقة أعلاه بصيغة نصية.
                      </p>
                      <p className="text-blue-700 text-xs">
                        ملاحظة: عند حفظ وثيقة جديدة، سيتم تحويلها تلقائياً إلى ملف PDF للحصول على الأفضل جودة.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Attachments List */}
              {document?.attachments && document.attachments.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-slate-900">المرفقات ({document.attachments.length})</h2>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                      اختر وثيقة للعرض
                    </span>
                  </div>
                  <div className="space-y-3">
                    {document.attachments.map((attachment: any) => {
                      const isSelected = attachment.id === selectedAttachmentId;
                      return (
                        <div
                          key={attachment.id}
                          onClick={() => {
                            setUserSelected(true);
                            // eslint-disable-next-line no-console
                            console.log('[SAVED_DOCS] selected', {
                              rasmId: document.id,
                              attachmentId: attachment?.id,
                              category: attachment?.category,
                              url: attachment?.fileUrl || null,
                              reason: 'user_click',
                            });
                            setSelectedAttachmentId(attachment.id);
                            setSelectedAttachmentUrl(attachment?.fileUrl || null);
                          }}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300 shadow-md'
                              : 'bg-slate-50 border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {/* Selection Radio */}
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-slate-300 group-hover:border-blue-400'
                            }`}>
                              {isSelected && (
                                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                              )}
                            </div>
                            
                            {/* File Info */}
                            <div className="flex-1">
                              <p className={`font-bold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                {attachment.fileName || `مرفق`}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs">
                                <span className={`px-2 py-1 rounded ${
                                  isSelected
                                    ? 'bg-blue-200 text-blue-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {attachment.category || 'ملف عام'}
                                </span>
                                {attachment.fileSize && (
                                  <span className="text-slate-500">
                                    {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Download Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (attachment.fileUrl) {
                                window.open(attachment.fileUrl, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className={`ml-4 p-2 rounded-lg transition-colors ${
                              isSelected
                                ? 'hover:bg-blue-100 text-blue-600'
                                : 'hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Dark Theme */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col h-full sticky top-24">
              {/* Header Section */}
              <div className="border-b border-slate-800 p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-black text-white mb-2">
                    {(payload.fileNumber as string) || 'رقم الملف'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {new Date(document?.createdAt || new Date()).toLocaleDateString('ar-MA')}
                  </p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm font-bold text-emerald-400">محفوظة</span>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Document Info */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">معلومات الملف</h3>
                  <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 border border-slate-700/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">عدد المرفقات</span>
                      <span className="text-white font-bold">{attachments.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-slate-700/30 pt-2">
                      <span className="text-slate-400">نوع الوثيقة</span>
                      <span className="text-white font-bold text-xs">{(payload.documentType as string) || 'عام'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Action Buttons */}
              <div className="border-t border-slate-800 p-6 space-y-3 bg-gradient-to-t from-slate-950 to-slate-900">
                <button
                  onClick={() => {
                    if (!id) return;
                    const navState: any = {};
                    if (selectedAttachmentId) navState.preferredAttachmentId = selectedAttachmentId;
                    if (selectedAttachmentUrl) navState.preferredAttachmentUrl = selectedAttachmentUrl;
                    navigate(`/notary-signing-portal/sign/${id}`, { state: navState });
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20"
                >
                  <FileText className="w-4 h-4" />
                  رواق التوقيع العدلي
                </button>

                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm">
                  <Edit className="w-4 h-4" />
                  تعديل الوثيقة
                </button>

                <button className="w-full px-6 py-3 bg-slate-700/50 text-slate-100 rounded-lg font-bold hover:bg-slate-600/50 transition-colors flex items-center justify-center gap-2 text-sm border border-slate-600/50">
                  <Share2 className="w-4 h-4" />
                  مشاركة
                </button>

                <button className="w-full px-6 py-3 bg-slate-700/50 text-slate-100 rounded-lg font-bold hover:bg-slate-600/50 transition-colors flex items-center justify-center gap-2 text-sm border border-slate-600/50">
                  <Printer className="w-4 h-4" />
                  طباعة
                </button>

                <button className="w-full px-6 py-3 bg-red-900/30 text-red-400 rounded-lg font-bold hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2 text-sm border border-red-900/50">
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedDocumentViewer;
