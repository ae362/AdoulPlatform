import React, { useState, useEffect, useMemo, useRef } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { releaseStuViaBeacon } from '../utils/stuReleaseBeacon';
import {
    DEFAULT_ARABIC_STAMP_CONFIG,
    StampPlacementLayer,
    clampPlacement,
    renderStampSvgString,
    type PageViewportBox,
    type StampPlacement as SvgStampPlacement,
} from './stamp-system';
import { 
    Scale, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Stamp, 
    ShieldCheck, 
    Fingerprint, 
    QrCode, 
    History,
    Search,
    Info,
    CheckSquare,
    Clock,
    UserCheck,
    MessageSquare,
    Paperclip,
    Lock,
    Printer,
    Download,
    Eye,
    Monitor,
    Cpu,
    RefreshCcw,
    Pen,
    ChevronLeft,
    ChevronRight,
    MapPin,
    AlertTriangle,
    X
} from 'lucide-react';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// --- Types ---
type DeedStatus = 'READY' | 'INCOMPLETE' | 'INVALID' | 'STAMPED' | 'SENT_TO_JUDGE' | 'APPROVED_JUDGE' | 'ARCHIVED_FINAL';

interface TimelineEvent {
    id: string;
    type: 'SIGN' | 'SEND' | 'RECEIVE' | 'SPEECH' | 'ARCHIVE';
    label: string;
    timestamp: string;
    actor: string;
}

interface DeedForSpeech {
    id: string;
    serialNumber: string;
    category: string;
    notaries: { name: string; position: 'FIRST' | 'SECOND' }[];
    city: string;
    timestamp: string;
    status: DeedStatus;
    text: string;
    hasFirstNotarySign: boolean;
    hasSecondNotarySign: boolean;
    registrationCorrect: boolean;
    matchingTadmine: boolean;
    registrySpaceLeft: number;
    notaryHash?: string;
    judgeHash?: string;
    judgeQR?: string;
    judgeId?: string;
    judgeFileNo?: string;
    courtName?: string;
    judgeNotes?: string | null;
    previewUrl?: string | null;
    previewMimeType?: string | null;
    previewName?: string | null;
    supportAttachments?: Array<{
        name: string;
        url: string;
        mimeType?: string | null;
        category?: string | null;
    }>;
    timeline: TimelineEvent[];
}

type StampPlacementModalProps = {
    open: boolean;
    pdfUrl: string;
    initialPlacement: SvgStampPlacement | null;
    stampSvgMarkup: string;
    onClose: () => void;
    onConfirm: (placement: SvgStampPlacement) => void;
};

const DEFAULT_STAMP_WIDTH_PCT = 0.24;

const PlacementPage: React.FC<{
    pdfDoc: any;
    pageNumber: number;
    placement: SvgStampPlacement | null;
    stampSvgMarkup: string;
    onPlacementChange: (placement: SvgStampPlacement) => void;
}> = ({ pdfDoc, pageNumber, placement, stampSvgMarkup, onPlacementChange }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [pageBox, setPageBox] = useState<PageViewportBox>({ width: 1, height: 1 });

    useEffect(() => {
        let cancelled = false;

        const renderPage = async () => {
            const canvas = canvasRef.current;
            const wrapper = wrapperRef.current;
            if (!canvas || !wrapper || !pdfDoc) return;

            const page = await pdfDoc.getPage(pageNumber);
            if (cancelled) return;

            const baseViewport = page.getViewport({ scale: 1 });
            const availableWidth = Math.max(320, Math.min(960, wrapper.parentElement?.clientWidth || 920));
            const scale = availableWidth / Math.max(1, baseViewport.width);
            const viewport = page.getViewport({ scale });
            const ratio = Math.max(1, window.devicePixelRatio || 1);
            const context = canvas.getContext('2d');
            if (!context) return;

            canvas.width = Math.round(viewport.width * ratio);
            canvas.height = Math.round(viewport.height * ratio);
            canvas.style.width = `${Math.round(viewport.width)}px`;
            canvas.style.height = `${Math.round(viewport.height)}px`;

            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, viewport.width, viewport.height);
            await page.render({ canvasContext: context, viewport }).promise;

            if (!cancelled) {
                setPageBox({
                    width: Math.round(viewport.width),
                    height: Math.round(viewport.height),
                });
            }
        };

        void renderPage();
        const handleResize = () => void renderPage();
        window.addEventListener('resize', handleResize);
        return () => {
            cancelled = true;
            window.removeEventListener('resize', handleResize);
        };
    }, [pdfDoc, pageNumber]);

    const commitPlacement = (clientX: number, clientY: number) => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const widthPct = DEFAULT_STAMP_WIDTH_PCT;
        const heightPct = (DEFAULT_STAMP_WIDTH_PCT * rect.width) / Math.max(1, rect.height);
        const rawX = (clientX - rect.left) / rect.width;
        const rawY = (clientY - rect.top) / rect.height;

        onPlacementChange(
            clampPlacement(
                {
                    page: pageNumber,
                    xPct: rawX,
                    yPct: rawY,
                    widthPct,
                    heightPct,
                    rotation: 0,
                },
                { width: 1, height: 1 }
            )
        );
    };

    return (
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-black text-slate-500">صفحة {pageNumber}</span>
                <span className="text-[11px] font-bold text-slate-400">انقر لتحديد الموضع ثم اسحب المستطيل إن لزم</span>
            </div>
            <div ref={wrapperRef} className="relative mx-auto w-fit overflow-hidden rounded-sm border border-slate-300 bg-white shadow-lg">
                <canvas ref={canvasRef} className="block max-w-full bg-white" />
                <div
                    className="absolute inset-0 z-10 cursor-crosshair bg-transparent"
                    onClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest('[data-stamp-selection-box="true"]')) return;
                        commitPlacement(event.clientX, event.clientY);
                    }}
                >
                    {placement?.page === pageNumber ? (
                        <StampPlacementLayer
                            page={pageNumber}
                            pageBox={pageBox}
                            placement={placement}
                            svgMarkup={stampSvgMarkup}
                            onChange={onPlacementChange}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
};

const StampPlacementModal: React.FC<StampPlacementModalProps> = ({
    open,
    pdfUrl,
    initialPlacement,
    stampSvgMarkup,
    onClose,
    onConfirm,
}) => {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageCount, setPageCount] = useState(0);
    const [placement, setPlacement] = useState<SvgStampPlacement | null>(initialPlacement);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setPlacement(initialPlacement);
    }, [open, initialPlacement]);

    useEffect(() => {
        if (!open || !pdfUrl) {
            setPdfDoc(null);
            setPageCount(0);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        const load = async () => {
            try {
                const response = await fetch(pdfUrl, {
                    cache: 'no-store',
                    credentials: 'same-origin',
                });
                if (!response.ok) {
                    throw new Error(`تعذر تحميل نسخة الرسم (${response.status})`);
                }
                const bytes = await response.arrayBuffer();
                const nextPdfDoc = await pdfjsLib.getDocument({ data: bytes } as any).promise;
                if (cancelled) return;
                setPdfDoc(nextPdfDoc);
                setPageCount(Math.max(1, nextPdfDoc.numPages || 1));
            } catch (nextError: any) {
                if (cancelled) return;
                setPdfDoc(null);
                setPageCount(0);
                setError(nextError?.message || 'تعذر فتح وضع اختيار موضع الطابع.');
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [open, pdfUrl]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-sm">
            <div className="flex h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl" dir="rtl">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div>
                        <h3 className="text-lg font-black text-slate-900">وضع اختيار موضع طابع المحكمة</h3>
                        <p className="text-sm font-bold text-slate-500">هذه المعاينة مخصصة فقط لتحديد الموضع بدقة. سيعاد تحميل النسخة المختومة في العارض الرئيسي بعد التوليد.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition-colors hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center text-sm font-black text-slate-500">جاري تحميل نسخة الرسم الحالية لوضع الموضع...</div>
                    ) : error ? (
                        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-right text-sm font-black text-red-700">{error}</div>
                    ) : pdfDoc && pageCount > 0 ? (
                        <div className="space-y-6">
                            {Array.from({ length: pageCount }, (_, index) => (
                                <PlacementPage
                                    key={index + 1}
                                    pdfDoc={pdfDoc}
                                    pageNumber={index + 1}
                                    placement={placement}
                                    stampSvgMarkup={stampSvgMarkup}
                                    onPlacementChange={setPlacement}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-right text-sm font-black text-amber-700">
                            لا توجد نسخة PDF صالحة لفتح وضع اختيار الموضع.
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4">
                    <div className="text-sm font-bold text-slate-500">
                        {placement ? `تم تحديد الموضع على الصفحة ${placement.page}. يمكنك تحريك المستطيل أو تغيير حجمه قبل التأكيد.` : 'اختر موضع الطابع بالنقر داخل الصفحة المطلوبة.'}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            disabled={!placement}
                            onClick={() => placement && onConfirm(placement)}
                            className={`rounded-2xl px-5 py-3 text-sm font-black text-white ${
                                placement ? 'bg-amber-600 hover:bg-amber-500' : 'cursor-not-allowed bg-slate-400'
                            }`}
                        >
                            تأكيد موضع الطابع
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const JudicialSpeechModule: React.FC = () => {
    const { sessionToken, user } = useAuth();
    const [selectedDeedId, setSelectedDeedId] = useState<string | null>(null);
    const [optionalNotes, setOptionalNotes] = useState('');
    const [isStamping, setIsStamping] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isInclusionModalOpen, setIsInclusionModalOpen] = useState(false);
    const [registryType, setRegistryType] = useState<'property' | 'marriage' | 'divorce' | 'inheritance' | 'other' | null>(null);
    const [registryLetter, setRegistryLetter] = useState('أ');
    const [generatedInclusion, setGeneratedInclusion] = useState<null | {
        descriptor: string;
        inclusionNumber: number;
        registerNumber: number;
        hijriDate: string;
        gregorianDate: string;
    }>(null);
    const [inclusionError, setInclusionError] = useState<string | null>(null);
    const [inclusionSuccess, setInclusionSuccess] = useState<string | null>(null);
    const [previewOverrideUrl, setPreviewOverrideUrl] = useState<string | null>(null);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [isGeneratingCourtStamp, setIsGeneratingCourtStamp] = useState(false);
    const [courtStampNotice, setCourtStampNotice] = useState<string | null>(null);
    const [judgeCourtId, setJudgeCourtId] = useState<string | null>(null);
    const [courtCity, setCourtCity] = useState('الرباط');
    const [judgeSignature, setJudgeSignature] = useState<string | null>(null);
    const [isSignaturePendingPlacement, setIsSignaturePendingPlacement] = useState(false);
    const [isStampPlacementPending, setIsStampPlacementPending] = useState(false);
    const [isPlacementModeOpen, setIsPlacementModeOpen] = useState(false);
    const [stampPlacement, setStampPlacement] = useState<{
        xPct: number;
        yPct: number;
        widthPct: number;
        heightPct: number;
        page: number;
    } | null>(null);
    const [judgePreviewPageMetrics, setJudgePreviewPageMetrics] = useState<{
        page: number;
        cssWidth: number;
        cssHeight: number;
        pdfWidth: number;
        pdfHeight: number;
    } | null>(null);
    const [judgeSignatureNotice, setJudgeSignatureNotice] = useState<string | null>(null);
    const [judgeEditedPdfBytes, setJudgeEditedPdfBytes] = useState<Uint8Array | null>(null);
    const [isWacomConnected, setIsWacomConnected] = useState(false);
    const [stuStatus, setStuStatus] = useState<'SEARCHING' | 'CONNECTING' | 'CONNECTED' | 'CAPTURING' | 'SAVED' | 'ERROR'>('SEARCHING');
    const [hardwareError, setHardwareError] = useState<string | null>(null);
    const [isSendingPreviewToTablet, setIsSendingPreviewToTablet] = useState(false);
    const [tabletSigningViewMode, setTabletSigningViewMode] = useState<'full' | 'signing-zone'>('full');
    const [tabletPreviewZoom, setTabletPreviewZoom] = useState(1.32);
    const [tabletPreviewScrollOffset, setTabletPreviewScrollOffset] = useState(0.5);
    const [pdfPageCount, setPdfPageCount] = useState(1);
    const [judgePreviewPage, setJudgePreviewPage] = useState(1);
    const [docZoom, setDocZoom] = useState<number>(1);
    const [isJudgePreviewRendering, setIsJudgePreviewRendering] = useState(false);
    const [judgePreviewError, setJudgePreviewError] = useState<string | null>(null);
    const [tabletDeviceInfo, setTabletDeviceInfo] = useState({
        serial: 'STU-540-AUTODETECT',
        firmware: '1.0',
        resolution: '800x480',
        pressureLevels: '1024',
    });
    const judgeSigCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const judgeDeviceSigCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const judgePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const judgePreviewRef = useRef<HTMLDivElement | null>(null);
    const judgePageWrapperRef = useRef<HTMLDivElement | null>(null);
    const stampDragOffsetRef = useRef<{ x: number; y: number } | null>(null);
    const stampDragCleanupRef = useRef<(() => void) | null>(null);
    const isJudgeDrawingRef = useRef(false);
    const lastJudgePointRef = useRef<{ x: number; y: number } | null>(null);
    const tabletRef = useRef<any>(null);
    const capabilityRef = useRef<any>(null);
    const reportHandlerRef = useRef<any>(null);
    const inkThresholdRef = useRef<any>(null);
    const penDataRef = useRef<any[]>([]);
    const tabletPreviewZoomRef = useRef(1.32);
    const tabletPreviewScrollOffsetRef = useRef(0.5);
    const tabletSigningViewModeRef = useRef<'full' | 'signing-zone'>('full');
    const pageRef = useRef(1);
    const pdfPageCountRef = useRef(1);
    const isCapturingRef = useRef(false);
    const tabletButtonRegionsRef = useRef<Array<{ id: string; x: number; y: number; width: number; height: number }>>([]);
    const tabletPreviewTransformRef = useRef<{
        mode: 'full' | 'signing-zone';
        page: number;
        screenWidth: number;
        screenHeight: number;
        renderWidth: number;
        renderHeight: number;
        pdfWidth: number;
        pdfHeight: number;
        cropX: number;
        cropY: number;
        cropWidth: number;
        cropHeight: number;
        drawX: number;
        drawY: number;
        drawWidth: number;
        drawHeight: number;
    } | null>(null);
    const usbInterfaceRef = useRef<any>(null);
    const closingSessionRef = useRef<Promise<void> | null>(null);
    
    // Fetch submissions list
    const { data: submissions, isLoading: isListLoading, error: listError, refetch: refetchList } = trpc.judge.listJudicialSpeechQueue.useQuery(
        { sessionToken: sessionToken || '' },
        { enabled: !!sessionToken, staleTime: 20_000, refetchOnMount: false, refetchOnWindowFocus: false }
    );

    // Selected submission details
    const { data: fullDeedData, isLoading: isDeedLoading, refetch: refetchSubmission } = trpc.judge.getSubmission.useQuery(
        { sessionToken: sessionToken || '', id: selectedDeedId || '' },
        { enabled: !!sessionToken && !!selectedDeedId, staleTime: 20_000, refetchOnMount: false, refetchOnWindowFocus: false }
    );

    const decideMutation = trpc.judge.decideSubmission.useMutation({
        onSuccess: () => {
            setIsStamping(false);
            setShowSuccessModal(true);
            refetchList();
        },
        onError: (err) => {
            setIsStamping(false);
            alert('حدث خطأ أثناء حفظ الختم: ' + err.message);
        }
    });
    const generateInclusionMutation = trpc.judge.generateInclusionReference.useMutation();
    const saveInclusionMutation = trpc.judge.saveInclusionReference.useMutation();
    const embedFooterMutation = trpc.feesAgent.documents.embedInclusionFooterStrip.useMutation();
    const generateCourtStampMutation = trpc.judge.generateJudgeCourtStamp.useMutation();
    const generateCourtIdMutation = trpc.judge.generateJudgeCourtIdentifier.useMutation();
    const revertCourtStampMutation = trpc.judge.revertJudgeCourtStamp.useMutation();

    const extractPrimaryPreview = (payload: any): { url: string | null; mimeType: string | null; name: string | null } => {
        const explicitJudgeStamped = payload?.judgeCourtStampedDoc && typeof payload.judgeCourtStampedDoc === 'object'
            ? [payload.judgeCourtStampedDoc]
            : [];
        const explicitJudgeSigned = payload?.judgeSignedDoc && typeof payload.judgeSignedDoc === 'object'
            ? [payload.judgeSignedDoc]
            : [];
        const explicitSignedAttachment = payload?.signedAttachment && typeof payload.signedAttachment === 'object'
            ? [payload.signedAttachment]
            : [];
        const candidateAttachments = [
            ...explicitJudgeStamped,
            ...explicitJudgeSigned,
            ...explicitSignedAttachment,
            ...(Array.isArray(payload?.attachments) ? payload.attachments : []),
            payload?.attachment,
        ].filter(Boolean);

        // First pass: prioritize PDF files
        for (const raw of candidateAttachments) {
            const att: any = raw && typeof raw === 'object' ? raw : null;
            if (!att) continue;
            let url = String(att.url || att.fileUrl || att.file_url || att.fileURL || '').trim();
            if (!url && att.base64) {
                const mime = String(att.mimeType || att.mime_type || att.type || 'application/pdf').trim();
                url = String(att.base64).startsWith('data:') ? String(att.base64) : `data:${mime};base64,${att.base64}`;
            }
            if (!url) continue;
            const mimeType = String(att.mimeType || att.mime_type || att.type || '').trim().toLowerCase();
            const name = String(att.name || att.fileName || att.filename || '').trim().toLowerCase();
            const urlLower = url.toLowerCase();
            if (mimeType.includes('pdf') || name.endsWith('.pdf') || urlLower.includes('.pdf') || url.startsWith('data:application/pdf')) {
                return {
                    url,
                    mimeType: mimeType || 'application/pdf',
                    name: String(att.name || att.fileName || att.filename || 'deed.pdf').trim() || 'deed.pdf',
                };
            }
        }

        // Second pass: any valid attachment
        for (const raw of candidateAttachments) {
            const att: any = raw && typeof raw === 'object' ? raw : null;
            if (!att) continue;
            let url = String(att.url || att.fileUrl || att.file_url || att.fileURL || '').trim();
            if (!url && att.base64) {
                const mime = String(att.mimeType || att.mime_type || att.type || 'application/octet-stream').trim();
                url = String(att.base64).startsWith('data:') ? String(att.base64) : `data:${mime};base64,${att.base64}`;
            }
            if (!url) continue;
            const mimeType = String(att.mimeType || att.mime_type || att.type || '').trim() || null;
            const name = String(att.name || att.fileName || att.filename || '').trim() || null;
            return { url, mimeType, name };
        }

        return { url: null, mimeType: null, name: null };
    };

    const extractSupportAttachments = (payload: any) => {
        const preview = extractPrimaryPreview(payload);
        const primaryUrl = String(preview.url || '').trim();
        const candidates = [
            ...(Array.isArray(payload?.attachments) ? payload.attachments : []),
            payload?.attachment,
        ].filter(Boolean);
        const seen = new Set<string>();

        return candidates
            .map((raw: any) => {
                const url = String(raw?.url || raw?.fileUrl || raw?.file_url || raw?.fileURL || '').trim();
                if (!url) return null;
                const category = String(raw?.category || '').trim();
                if (url === primaryUrl) return null;
                if (category === 'judge_attachment' || category === 'judge_attachment_docx') return null;
                const key = `${url}::${category}`;
                if (seen.has(key)) return null;
                seen.add(key);
                return {
                    name: String(raw?.name || raw?.fileName || raw?.filename || 'مرفق').trim() || 'مرفق',
                    url,
                    mimeType: String(raw?.mimeType || raw?.mime_type || raw?.type || '').trim() || null,
                    category: category || null,
                };
            })
            .filter(Boolean) as Array<{
                name: string;
                url: string;
                mimeType?: string | null;
                category?: string | null;
            }>;
    };

    const deeds = useMemo(() => {
        return (submissions ?? [])
            .filter((sub) => sub.status === 'pending' || sub.status === 'in_review')
            .map((sub): DeedForSpeech => ({
            id: sub.id,
            serialNumber: sub.fileNumber || '... ',
            category: sub.documentType || 'رسم غير مصنف',
            notaries: [
                { name: sub.notaryName || 'العدل الأول', position: 'FIRST' },
                { name: 'ذ. أحمد بناني', position: 'SECOND' }
            ],
            city: 'الرباط',
            timestamp: new Date(sub.createdAt).toLocaleString('ar-MA'),
            status: (sub.status === 'pending' || sub.status === 'in_review' || sub.status === 'READY') ? 'READY' : 'APPROVED_JUDGE',
            hasFirstNotarySign: true,
            hasSecondNotarySign: true,
            registrationCorrect: true,
            matchingTadmine: true,
            registrySpaceLeft: 342,
            notaryHash: 'SHA256-ADL-' + sub.id.substring(0, 8).toUpperCase(),
            timeline: [
                { id: '1', type: 'SIGN', label: 'توقيع العدل الأول', timestamp: new Date(sub.createdAt).toLocaleString('ar-MA'), actor: sub.notaryName || 'ذ. محمد العلمي' },
                { id: '2', type: 'SEND', label: 'إرسال إلى قاضي التوثيق', timestamp: new Date(sub.createdAt).toLocaleString('ar-MA'), actor: 'النظام الآلي' }
            ]
        }));
    }, [submissions]);

    const selectedDeed = useMemo(() => {
        if (!selectedDeedId) return null;
        const base = deeds.find(d => d.id === selectedDeedId);

        // When the current deed leaves the pending list after approval,
        // keep the detail view alive from the fetched submission payload.
        if (!base && fullDeedData && fullDeedData.id === selectedDeedId) {
            const preview = extractPrimaryPreview((fullDeedData as any).payload || {});
            const supportAttachments = extractSupportAttachments((fullDeedData as any).payload || {});
            return {
                id: fullDeedData.id,
                serialNumber: fullDeedData.fileNumber || '... ',
                category: fullDeedData.documentType || 'رسم غير مصنف',
                notaries: [
                    { name: fullDeedData.notaryName || 'العدل الأول', position: 'FIRST' },
                    { name: 'ذ. أحمد بناني', position: 'SECOND' }
                ],
                city: 'الرباط',
                timestamp: new Date(fullDeedData.createdAt).toLocaleString('ar-MA'),
                status: (fullDeedData.status === 'pending' || fullDeedData.status === 'in_review' || fullDeedData.status === 'READY') ? 'READY' : 'APPROVED_JUDGE',
                text: fullDeedData.summary || 'نموذج نص الرسم العدلي المستخرج من قاعدة البيانات...',
                hasSecondNotarySign: true,
                registrationCorrect: true,
                matchingTadmine: true,
                registrySpaceLeft: 342,
                notaryHash: 'SHA256-ADL-' + fullDeedData.id.substring(0, 8).toUpperCase(),
                judgeNotes: fullDeedData.judgeNotes,
                previewUrl: previewOverrideUrl ?? (fullDeedData as any).previewUrl ?? preview.url,
                previewMimeType: (fullDeedData as any).previewMimeType ?? preview.mimeType,
                previewName: (fullDeedData as any).previewName ?? preview.name,
                supportAttachments,
                timeline: [
                    { id: '1', type: 'SIGN', label: 'توقيع العدل الأول', timestamp: new Date(fullDeedData.createdAt).toLocaleString('ar-MA'), actor: fullDeedData.notaryName || 'ذ. محمد العلمي' },
                    { id: '2', type: 'SEND', label: 'إرسال إلى قاضي التوثيق', timestamp: new Date(fullDeedData.createdAt).toLocaleString('ar-MA'), actor: 'النظام الآلي' }
                ]
            } as DeedForSpeech;
        }

        if (!base) return null;
        
        // If we have full data from the specific query, merge it
        if (fullDeedData && fullDeedData.id === selectedDeedId) {
            const preview = extractPrimaryPreview((fullDeedData as any).payload || {});
            const supportAttachments = extractSupportAttachments((fullDeedData as any).payload || {});
            return {
                ...base,
                text: fullDeedData.summary || base.text,
                judgeNotes: fullDeedData.judgeNotes ?? base.judgeNotes,
                previewUrl: previewOverrideUrl ?? (fullDeedData as any).previewUrl ?? preview.url,
                previewMimeType: (fullDeedData as any).previewMimeType ?? preview.mimeType,
                previewName: (fullDeedData as any).previewName ?? preview.name,
                supportAttachments,
            } as DeedForSpeech;
        }
        return base;
    }, [selectedDeedId, deeds, fullDeedData, previewOverrideUrl]);

    useEffect(() => {
        setPreviewOverrideUrl(null);
        setGeneratedInclusion(null);
        setInclusionError(null);
        setInclusionSuccess(null);
        setCourtStampNotice(null);
        setJudgeCourtId(null);
        setJudgePreviewPage(1);
        setJudgeSignature(null);
        setIsSignaturePendingPlacement(false);
        setIsStampPlacementPending(false);
        setIsPlacementModeOpen(false);
        setStampPlacement(null);
        setJudgeSignatureNotice(null);
        setJudgeEditedPdfBytes(null);
        setJudgePreviewPageMetrics(null);
    }, [selectedDeedId]);

    useEffect(() => {
        if (!selectedDeed) return;
        const payloadCity =
            typeof (fullDeedData as any)?.payload?.courtCity === 'string' && (fullDeedData as any).payload.courtCity.trim()
                ? (fullDeedData as any).payload.courtCity.trim()
                : typeof (fullDeedData as any)?.payload?.city === 'string' && (fullDeedData as any).payload.city.trim()
                    ? (fullDeedData as any).payload.city.trim()
                    : selectedDeed.city || 'الرباط';
        setCourtCity(payloadCity);
        setJudgeCourtId(
            typeof (fullDeedData as any)?.payload?.judgeCourtIdentifier?.id === 'string' &&
            (fullDeedData as any).payload.judgeCourtIdentifier.id.trim()
                ? (fullDeedData as any).payload.judgeCourtIdentifier.id.trim()
                : null
        );
        const category = String(selectedDeed.category || '');
        if (category.includes('أملاك')) setRegistryType('property');
        else if (category.includes('زواج')) setRegistryType('marriage');
        else if (category.includes('طلاق')) setRegistryType('divorce');
        else if (category.includes('تركات')) setRegistryType('inheritance');
        else setRegistryType('other');
    }, [selectedDeedId, selectedDeed, fullDeedData]);

    const judgePdfUrl = previewOverrideUrl || selectedDeed?.previewUrl || '';
    const stampSvgMarkup = useMemo(() => {
        return renderStampSvgString({
            ...DEFAULT_ARABIC_STAMP_CONFIG,
            topArc: {
                ...DEFAULT_ARABIC_STAMP_CONFIG.topArc,
                text: 'المملكة المغربية',
            },
            bottomArc: {
                ...DEFAULT_ARABIC_STAMP_CONFIG.bottomArc,
                text: `المحكمة الابتدائية ${courtCity || 'شفشاون'}`,
            },
            footerLine: {
                ...(DEFAULT_ARABIC_STAMP_CONFIG.footerLine || { fontSize: 54, offsetY: 900, text: '' }),
                text: 'المجلس الأعلى للسلطة القضائية',
            },
            serialLine: {
                ...(DEFAULT_ARABIC_STAMP_CONFIG.serialLine || { fontSize: 34, offsetY: 790, text: '' }),
                text: '',
            },
            centerText: {
                ...DEFAULT_ARABIC_STAMP_CONFIG.centerText,
                lines: [],
            },
        });
    }, [courtCity, judgeCourtId]);
    const judgePdfViewerSrc = useMemo(() => {
        if (!judgePdfUrl) return '';
        const separator = judgePdfUrl.includes('#') ? '&' : '#';
        return `${judgePdfUrl}${separator}page=${judgePreviewPage}&zoom=page-fit`;
    }, [judgePdfUrl, judgePreviewPage]);
    const currentPayload = ((fullDeedData as any)?.payload || {}) as Record<string, any>;
    const hasInclusionReferenceStep = !!currentPayload.inclusionReference;
    const hasCourtIdentifierStep = !!(currentPayload.judgeCourtIdentifier?.id || judgeCourtId);
    const hasStep1Completed = hasInclusionReferenceStep && hasCourtIdentifierStep;
    const hasStep2Completed = hasStep1Completed && !!(currentPayload.judgeCourtStamp || currentPayload.judgeCourtStampedDoc);
    const hasStep3Completed = hasStep2Completed && (!!judgeEditedPdfBytes || !!currentPayload.judgeSignedDoc);
    useEffect(() => {
        let cancelled = false;
        const renderJudgePreviewPage = async () => {
            const canvas = judgePreviewCanvasRef.current;
            if (!canvas) return;
            if (!judgePdfUrl) {
                setPdfPageCount(1);
                setJudgePreviewError(null);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                return;
            }
            setIsJudgePreviewRendering(true);
            setJudgePreviewError(null);
            try {
                let loadingTask: any;
                if (judgePdfUrl.startsWith('data:')) {
                    const base64Index = judgePdfUrl.indexOf('base64,');
                    if (base64Index !== -1) {
                        const base64 = judgePdfUrl.slice(base64Index + 7);
                        const binary = atob(base64);
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            bytes[i] = binary.charCodeAt(i);
                        }
                        loadingTask = (pdfjsLib as any).getDocument({ data: bytes });
                    } else {
                        loadingTask = (pdfjsLib as any).getDocument({ url: judgePdfUrl });
                    }
                } else {
                    try {
                        const response = await fetch(judgePdfUrl, { cache: 'no-store' });
                        if (response.ok) {
                            const pdfBytes = await response.arrayBuffer();
                            loadingTask = (pdfjsLib as any).getDocument({ data: pdfBytes });
                        } else {
                            loadingTask = (pdfjsLib as any).getDocument({ url: judgePdfUrl });
                        }
                    } catch {
                        loadingTask = (pdfjsLib as any).getDocument({ url: judgePdfUrl });
                    }
                }

                const pdf = await loadingTask.promise;
                if (cancelled) return;
                const totalPages = Math.max(1, pdf.numPages || 1);
                setPdfPageCount(totalPages);
                const safePage = Math.max(1, Math.min(judgePreviewPage, totalPages));
                if (safePage !== judgePreviewPage) {
                    setJudgePreviewPage(safePage);
                }
                const pdfPage = await pdf.getPage(safePage);
                if (cancelled) return;

                const baseViewport = pdfPage.getViewport({ scale: 1 });
                const containerWidth = Math.max(500, Math.min(960, Math.round((judgePreviewRef.current?.clientWidth || 860) - 32)));
                const fitScale = containerWidth / Math.max(1, baseViewport.width);
                const cssWidth = Math.round(baseViewport.width * fitScale);
                const cssHeight = Math.round(baseViewport.height * fitScale);
                const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);

                canvas.style.width = `${cssWidth}px`;
                canvas.style.height = `${cssHeight}px`;
                canvas.width = Math.round(cssWidth * devicePixelRatio);
                canvas.height = Math.round(cssHeight * devicePixelRatio);

                const context = canvas.getContext('2d');
                if (!context) return;

                setJudgePreviewPageMetrics({
                    page: safePage,
                    cssWidth,
                    cssHeight,
                    pdfWidth: baseViewport.width,
                    pdfHeight: baseViewport.height,
                });

                context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, cssWidth, cssHeight);
                (context as any).imageSmoothingEnabled = true;
                (context as any).imageSmoothingQuality = 'high';

                const viewport = pdfPage.getViewport({ scale: fitScale });
                await pdfPage.render({ canvasContext: context, viewport }).promise;
            } catch (error: any) {
                console.error('Judge preview render failed', error);
                if (!cancelled) {
                    setPdfPageCount(1);
                    setJudgePreviewError(error?.message || 'تعذر عرض صفحة الرسم الحالية.');
                    setJudgePreviewPageMetrics(null);
                }
            } finally {
                if (!cancelled) {
                    setIsJudgePreviewRendering(false);
                }
            }
        };
        void renderJudgePreviewPage();
        return () => {
            cancelled = true;
        };
    }, [judgePdfUrl, judgePreviewPage]);

    useEffect(() => {
        tabletPreviewZoomRef.current = tabletPreviewZoom;
    }, [tabletPreviewZoom]);

    useEffect(() => {
        tabletPreviewScrollOffsetRef.current = tabletPreviewScrollOffset;
    }, [tabletPreviewScrollOffset]);

    useEffect(() => {
        tabletSigningViewModeRef.current = tabletSigningViewMode;
        if (tabletSigningViewMode === 'signing-zone') {
            tabletPreviewScrollOffsetRef.current = 1;
            setTabletPreviewScrollOffset(1);
        }
    }, [tabletSigningViewMode]);

    useEffect(() => {
        pdfPageCountRef.current = pdfPageCount;
    }, [pdfPageCount]);

    useEffect(() => {
        isCapturingRef.current = stuStatus === 'CAPTURING';
    }, [stuStatus]);

    useEffect(() => {
        const loadPdfMeta = async () => {
            if (!judgePdfUrl) {
                setPdfPageCount(1);
                return;
            }
            try {
                const resp = await fetch(judgePdfUrl, { cache: 'no-store', credentials: 'same-origin' });
                if (!resp.ok) throw new Error();
                const bytes = await resp.arrayBuffer();
                const pdfDoc = await PDFDocument.load(bytes);
                setPdfPageCount(pdfDoc.getPageCount() || 1);
            } catch {
                setPdfPageCount(1);
            }
        };
        void loadPdfMeta();
    }, [judgePdfUrl]);

    const clearTabletScreen = async (tablet: any) => {
        if (!tablet) return;
        if (typeof tablet.clearScreen === 'function') {
            await tablet.clearScreen();
            return;
        }
        if (typeof tablet.setClearScreen === 'function') {
            await tablet.setClearScreen();
        }
    };

    const closeSignatureSession = async () => {
        if (closingSessionRef.current) return closingSessionRef.current;
        const task = (async () => {
            const wgss = (window as any).WacomGSS;
            const isStuReady = !!wgss?.STU?.isServiceReady?.();
            const p = (wgss && wgss.STU) ? new wgss.STU.Protocol() : null;
            const tablet = tabletRef.current;
            const reportHandler = reportHandlerRef.current;
            const usbInterface = usbInterfaceRef.current;
            try {
                try {
                    if (reportHandler?.stopReporting) await reportHandler.stopReporting();
                } catch {}
                reportHandlerRef.current = null;
                try {
                    if (isStuReady) await clearTabletScreen(tablet);
                } catch {}
                try {
                    if (isStuReady && tablet && p?.InkingMode) {
                        await tablet.setInkingMode(p.InkingMode.InkingMode_Off);
                    }
                } catch {}
                try {
                    if (isStuReady && tablet?.disconnect) await tablet.disconnect();
                } catch {}
                tabletRef.current = null;
                try {
                    if (isStuReady && usbInterface?.disconnect) await usbInterface.disconnect();
                } catch {}
                usbInterfaceRef.current = null;
                try {
                    if (wgss?.STU && typeof wgss.STU.close === 'function') wgss.STU.close();
                } catch {}
                try {
                    if (wgss) wgss.STU = null;
                } catch {}
            } finally {
                setIsWacomConnected(false);
                setStuStatus('SEARCHING');
                penDataRef.current = [];
            }
        })();
        closingSessionRef.current = task.finally(() => {
            closingSessionRef.current = null;
        });
        return closingSessionRef.current;
    };

    const forceReleaseSync = () => {
        try {
            const tablet = tabletRef.current;
            const usbInterface = usbInterfaceRef.current;
            const wgss = (window as any).WacomGSS;
            try { tablet?.endCapture?.(); } catch {}
            try { tablet?.setClearScreen?.(); } catch {}
            try { tablet?.disconnect?.(); } catch {}
            try { usbInterface?.disconnect?.(); } catch {}
            try { wgss?.STU?.close?.(); } catch {}
            try { if (wgss) wgss.STU = null; } catch {}
        } finally {
            tabletRef.current = null;
            usbInterfaceRef.current = null;
            reportHandlerRef.current = null;
        }
    };

    const waitForService = (wgss: any, retries: number): Promise<boolean> => {
        return new Promise((resolve) => {
            let count = 0;
            const check = () => {
                if (wgss && wgss.STU && wgss.STU.isServiceReady()) resolve(true);
                else if (count < retries) {
                    count++;
                    setTimeout(check, 1000);
                } else resolve(false);
            };
            check();
        });
    };

    const disconnectLayer = async () => {
        const wgss = (window as any).WacomGSS;
        const isStuReady = !!wgss?.STU?.isServiceReady?.();
        const p = (wgss && wgss.STU) ? new wgss.STU.Protocol() : null;
        try {
            if (tabletRef.current) {
                try {
                    if (isStuReady) {
                        tabletRef.current.endCapture?.();
                        tabletRef.current.setClearScreen?.();
                        if (p?.InkingMode) tabletRef.current.setInkingMode?.(p.InkingMode.InkingMode_Off);
                    }
                } catch {}
                await Promise.race([isStuReady ? tabletRef.current.disconnect().catch(() => {}) : Promise.resolve(), new Promise((r) => setTimeout(r, 300))]);
                tabletRef.current = null;
            }
            if (usbInterfaceRef.current) {
                try {
                    if (isStuReady) await usbInterfaceRef.current.disconnect();
                } catch {}
                usbInterfaceRef.current = null;
            }
            if (wgss?.STU && typeof wgss.STU.close === 'function') {
                try { wgss.STU.close(); } catch {}
            }
            try { if (wgss) wgss.STU = null; } catch {}
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 800));
    };

    const connectingRef = useRef(false);

    const connectToSTUDevice = async (retryCount = 0) => {
        if (connectingRef.current && retryCount === 0) return;
        connectingRef.current = true;
        const wgss = (window as any).WacomGSS;
        try {
            setStuStatus('CONNECTING');
            setHardwareError(null);
            if (!wgss || !wgss.STUConstructor) {
                setHardwareError('Wacom GSS SDK not loaded. Please wait.');
                connectingRef.current = false;
                return;
            }
            await closeSignatureSession();
            await disconnectLayer();
            const host = 'localhost';
            if (wgss.STU) {
                try { wgss.STU.close(); } catch {}
                wgss.STU = null;
            }
            wgss.STU = new wgss.STUConstructor(9000, host);
            const isReady = await waitForService(wgss, 5);
            if (!isReady) {
                setHardwareError(`SigCaptX Service not found on ${host}:9000.`);
                setStuStatus('ERROR');
                connectingRef.current = false;
                return;
            }
            const devices = await wgss.STU.getUsbDevices();
            if (!devices || devices.length === 0) {
                setHardwareError('STU-540 not detected. Ensure USB is plugged in.');
                setStuStatus('ERROR');
                connectingRef.current = false;
                return;
            }
            const candidate = devices.find((d: any) => String(d.model || d.name || '').includes('540')) || devices[0];
            const intf = new wgss.STU.UsbInterface();
            await intf.Constructor();
            usbInterfaceRef.current = intf;
            await intf.connect(candidate, true);
            const tablet = new wgss.STU.Tablet();
            await tablet.Constructor(intf, null, null);
            tabletRef.current = tablet;
            const info = await tablet.getInformation().catch(() => ({}));
            const caps = await tablet.getCapability().catch(() => ({}));
            capabilityRef.current = caps;
            inkThresholdRef.current = await tablet.getInkThreshold().catch(() => null);
            setTabletDeviceInfo({
                serial: info.serialNumber || 'STU-540-AUTODETECT',
                firmware: info.firmwareMajor ? `${info.firmwareMajor}.${info.firmwareMinor}` : '1.0',
                resolution: (caps.screenWidth && caps.screenHeight) ? `${caps.screenWidth}x${caps.screenHeight}` : '800x480',
                pressureLevels: String(caps.maxPressure || 1024),
            });
            const p = new wgss.STU.Protocol();
            await tablet.setPenDataOptionMode(p.PenDataOptionMode.PenDataOptionMode_TimeCountSequence).catch(() => {});
            await tablet.setInkingMode(p.InkingMode.InkingMode_On);
            setIsWacomConnected(true);
            setStuStatus('CONNECTED');
            connectingRef.current = false;
        } catch (err: any) {
            setHardwareError(String(err?.message || err || 'Hardware Error'));
            setStuStatus('ERROR');
            connectingRef.current = false;
        }
    };

    const clampTabletScrollOffset = (value: number) => Math.max(0, Math.min(1, value));

    const drawTabletControlButton = (
        ctx: CanvasRenderingContext2D,
        region: { id: string; x: number; y: number; width: number; height: number },
        label: string,
        fill = '#ffffff',
        border = '#cbd5e1',
        text = '#0f172a'
    ) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = border;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        (ctx as any).roundRect(region.x, region.y, region.width, region.height, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = text;
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, region.x + region.width / 2, region.y + region.height / 2);
    };

    const drawTabletControlsOverlay = (ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number) => {
        const topBarHeight = 68;
        const bottomBarHeight = 56;
        const margin = 12;
        const gap = 8;
        const buttonWidth = Math.floor((screenWidth - (margin * 2) - (gap * 6)) / 7);
        const buttonHeight = 40;
        const topY = 14;
        const bottomY = screenHeight - bottomBarHeight + 8;

        ctx.fillStyle = 'rgba(15,23,42,0.92)';
        ctx.fillRect(0, 0, screenWidth, topBarHeight);
        ctx.fillRect(0, screenHeight - bottomBarHeight, screenWidth, bottomBarHeight);

        const regions = [
            { id: 'prev', label: '◀' },
            { id: 'next', label: '▶' },
            { id: 'zoom-out', label: '−' },
            { id: 'zoom-in', label: '+' },
            { id: 'scroll-up', label: '↑' },
            { id: 'scroll-down', label: '↓' },
            { id: 'mode', label: tabletSigningViewModeRef.current === 'full' ? 'منطقة' : 'صفحة' },
        ].map((item, index) => ({
            ...item,
            x: margin + index * (buttonWidth + gap),
            y: topY,
            width: buttonWidth,
            height: buttonHeight,
        }));

        regions.forEach((region) => {
            const palette =
                region.id === 'prev' || region.id === 'next'
                    ? { fill: '#dbeafe', border: '#60a5fa', text: '#1d4ed8' }
                    : region.id === 'zoom-in' || region.id === 'zoom-out'
                        ? { fill: '#fef3c7', border: '#f59e0b', text: '#b45309' }
                        : region.id === 'scroll-up' || region.id === 'scroll-down'
                            ? { fill: '#dcfce7', border: '#4ade80', text: '#166534' }
                            : { fill: '#f3e8ff', border: '#a855f7', text: '#7c3aed' };
            drawTabletControlButton(ctx, region, region.label, palette.fill, palette.border, palette.text);
        });

        const signRegion = { id: 'sign', x: margin, y: bottomY, width: screenWidth - margin * 2, height: 40 };
        drawTabletControlButton(ctx, signRegion, 'توقيع القاضي', '#dcfce7', '#22c55e', '#065f46');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`صفحة ${pageRef.current}/${pdfPageCountRef.current} | ${Math.round(tabletPreviewZoomRef.current * 100)}%`, screenWidth - 16, screenHeight - 18);
        tabletButtonRegionsRef.current = [...regions, signRegion];
    };

    const renderTabletPreviewImage = async (mode: 'full' | 'signing-zone') => {
        if (!judgePdfUrl) throw new Error('لا توجد نسخة PDF جاهزة للعرض على شاشة STU.');
        const screenWidth = Number(capabilityRef.current?.screenWidth || 800);
        const screenHeight = Number(capabilityRef.current?.screenHeight || 480);
        const screenAspect = screenWidth / Math.max(1, screenHeight);
        let loadingTask: any;
        if (judgePdfUrl.startsWith('data:')) {
            const base64Index = judgePdfUrl.indexOf('base64,');
            if (base64Index !== -1) {
                const base64 = judgePdfUrl.slice(base64Index + 7);
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                loadingTask = (pdfjsLib as any).getDocument({ data: bytes });
            } else {
                loadingTask = (pdfjsLib as any).getDocument({ url: judgePdfUrl });
            }
        } else {
            try {
                const resp = await fetch(judgePdfUrl, { cache: 'no-store' });
                if (resp.ok) {
                    const pdfBytes = await resp.arrayBuffer();
                    loadingTask = (pdfjsLib as any).getDocument({ data: pdfBytes });
                } else {
                    loadingTask = (pdfjsLib as any).getDocument({ url: judgePdfUrl });
                }
            } catch {
                loadingTask = (pdfjsLib as any).getDocument({ url: judgePdfUrl });
            }
        }
        const pdf = await loadingTask.promise;
        const safePage = Math.max(1, Math.min(pageRef.current || 1, pdf.numPages || 1));
        const pdfPage = await pdf.getPage(safePage);
        const pdfViewport = pdfPage.getViewport({ scale: 1 });
        const baseViewport = pdfPage.getViewport({ scale: 2 });
        const renderCanvas = document.createElement('canvas');
        renderCanvas.width = Math.max(1, Math.round(baseViewport.width));
        renderCanvas.height = Math.max(1, Math.round(baseViewport.height));
        const renderCtx = renderCanvas.getContext('2d');
        if (!renderCtx) throw new Error('Canvas context unavailable');
        renderCtx.fillStyle = '#ffffff';
        renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
        await pdfPage.render({ canvasContext: renderCtx, viewport: baseViewport }).promise;
        const targetCanvas = document.createElement('canvas');
        targetCanvas.width = screenWidth;
        targetCanvas.height = screenHeight;
        const targetCtx = targetCanvas.getContext('2d');
        if (!targetCtx) throw new Error('Target canvas unavailable');
        targetCtx.fillStyle = '#ffffff';
        targetCtx.fillRect(0, 0, screenWidth, screenHeight);

        let cropX = 0, cropY = 0, cropWidth = renderCanvas.width, cropHeight = renderCanvas.height;
        let drawX = 0, drawY = 68, drawWidth = screenWidth, drawHeight = screenHeight - 124;

        if (mode === 'signing-zone') {
            const zoneCropWidth = renderCanvas.width;
            const zoneCropHeight = Math.min(renderCanvas.height, Math.round(zoneCropWidth / screenAspect));
            const bottomPadding = Math.round(renderCanvas.height * 0.02);
            cropY = Math.max(0, renderCanvas.height - zoneCropHeight - bottomPadding);
            cropWidth = zoneCropWidth;
            cropHeight = zoneCropHeight;
        } else {
            const baseCropWidth = renderCanvas.width;
            const baseCropHeight = Math.min(renderCanvas.height, Math.round(baseCropWidth / screenAspect));
            cropWidth = Math.max(1, Math.round(baseCropWidth / tabletPreviewZoomRef.current));
            cropHeight = Math.max(1, Math.round(baseCropHeight / tabletPreviewZoomRef.current));
            cropX = Math.max(0, Math.round((renderCanvas.width - cropWidth) / 2));
            const availableScroll = Math.max(0, renderCanvas.height - cropHeight);
            cropY = Math.max(0, Math.round(availableScroll * tabletPreviewScrollOffsetRef.current));
        }

        targetCtx.drawImage(renderCanvas, cropX, cropY, cropWidth, cropHeight, drawX, drawY, drawWidth, drawHeight);
        drawTabletControlsOverlay(targetCtx, screenWidth, screenHeight);
        tabletPreviewTransformRef.current = {
            mode,
            page: safePage,
            screenWidth,
            screenHeight,
            renderWidth: renderCanvas.width,
            renderHeight: renderCanvas.height,
            pdfWidth: pdfViewport.width,
            pdfHeight: pdfViewport.height,
            cropX, cropY, cropWidth, cropHeight, drawX, drawY, drawWidth, drawHeight,
        };
        return targetCanvas.toDataURL('image/png');
    };

    const pushPreviewToTablet = async (mode: 'full' | 'signing-zone') => {
        if (!tabletRef.current) {
            await connectToSTUDevice();
            if (!tabletRef.current) return;
        }
        const wgss = (window as any).WacomGSS;
        const tablet = tabletRef.current;
        const caps = capabilityRef.current;
        const screenWidth = Number(caps?.screenWidth || 800);
        const screenHeight = Number(caps?.screenHeight || 480);
        const protocol = new wgss.STU.Protocol();
        const b64Data = await renderTabletPreviewImage(mode);
        await clearTabletScreen(tablet);
        await tablet.setInkingMode(protocol.InkingMode.InkingMode_Off);
        const encodingCandidates = [
            protocol.EncodingMode.EncodingMode_24bit,
            protocol.EncodingMode.EncodingMode_16bit,
            protocol.EncodingMode.EncodingMode_1bit,
        ];
        let lastError: unknown = null;
        for (const encodingMode of encodingCandidates) {
            try {
                const flattened = await wgss.STU.ProtocolHelper.resizeAndFlatten(
                    b64Data, 0, 0, 0, 0, screenWidth, screenHeight, encodingMode, 1, false, 0, true
                );
                await tablet.writeImage(encodingMode, flattened);
                return;
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError instanceof Error ? lastError : new Error('تعذر إرسال صورة المعاينة إلى شاشة STU.');
    };

    const handleTabletVirtualButtonTap = async (buttonId: string) => {
        if (buttonId === 'sign') {
            clearJudgeSignatureCanvas();
            await handleJudgeCaptureStart();
            return;
        }
        if (buttonId === 'prev') {
            pageRef.current = Math.max(1, pageRef.current - 1);
        } else if (buttonId === 'next') {
            pageRef.current = Math.min(pdfPageCountRef.current, pageRef.current + 1);
        } else if (buttonId === 'zoom-out') {
            const nextZoom = Math.max(0.5, Math.min(2.2, Number((tabletPreviewZoomRef.current - 0.12).toFixed(2))));
            tabletPreviewZoomRef.current = nextZoom;
            setTabletPreviewZoom(nextZoom);
        } else if (buttonId === 'zoom-in') {
            const nextZoom = Math.max(0.5, Math.min(2.2, Number((tabletPreviewZoomRef.current + 0.12).toFixed(2))));
            tabletPreviewZoomRef.current = nextZoom;
            setTabletPreviewZoom(nextZoom);
        } else if (buttonId === 'scroll-up') {
            const nextOffset = clampTabletScrollOffset(tabletPreviewScrollOffsetRef.current - 0.12);
            tabletPreviewScrollOffsetRef.current = nextOffset;
            setTabletPreviewScrollOffset(nextOffset);
        } else if (buttonId === 'scroll-down') {
            const nextOffset = clampTabletScrollOffset(tabletPreviewScrollOffsetRef.current + 0.12);
            tabletPreviewScrollOffsetRef.current = nextOffset;
            setTabletPreviewScrollOffset(nextOffset);
        } else if (buttonId === 'mode') {
            const nextMode = tabletSigningViewModeRef.current === 'full' ? 'signing-zone' : 'full';
            tabletSigningViewModeRef.current = nextMode;
            setTabletSigningViewMode(nextMode);
            if (nextMode === 'signing-zone') {
                tabletPreviewScrollOffsetRef.current = 1;
                setTabletPreviewScrollOffset(1);
            } else {
                tabletPreviewScrollOffsetRef.current = 0.5;
                setTabletPreviewScrollOffset(0.5);
            }
        }
        try {
            setIsSendingPreviewToTablet(true);
            setHardwareError(null);
            await pushPreviewToTablet(tabletSigningViewModeRef.current);
            await startTabletNavigationMode();
            setStuStatus('CONNECTED');
        } catch (err: any) {
            setHardwareError(err?.message || 'تعذر تحديث واجهة STU-540.');
            setStuStatus('ERROR');
        } finally {
            setIsSendingPreviewToTablet(false);
        }
    };

    const startTabletNavigationMode = async () => {
        if (!tabletRef.current) return;
        const wgss = (window as any).WacomGSS;
        const tablet = tabletRef.current;
        const caps = capabilityRef.current;
        try {
            if (reportHandlerRef.current?.stopReporting) {
                await reportHandlerRef.current.stopReporting().catch(() => {});
            }
            const reportHandler = new wgss.STU.ProtocolHelper.ReportHandler();
            reportHandlerRef.current = reportHandler;
            let downPoint: { x: number; y: number } | null = null;
            let isDown = false;
            let tapLocked = false;
            const handleReport = async (report: any) => {
                if (isCapturingRef.current || tapLocked) return;
                const tabletMaxX = Number(caps?.tabletMaxX || 10800);
                const tabletMaxY = Number(caps?.tabletMaxY || 6480);
                const threshold = inkThresholdRef.current;
                const onMark = Number(threshold?.onPressureMark ?? (caps?.minPressure || 100));
                const offMark = Number(threshold?.offPressureMark ?? Math.max(0, onMark - 1));
                const pressure = Number(report?.pressure ?? 0);
                const nextIsDown = isDown ? !(pressure <= offMark) : pressure > onMark;
                const point = {
                    x: (Number(report?.x || 0) / Math.max(1, tabletMaxX)) * Number(caps?.screenWidth || 800),
                    y: (Number(report?.y || 0) / Math.max(1, tabletMaxY)) * Number(caps?.screenHeight || 480),
                };
                if (!isDown && nextIsDown) {
                    downPoint = point;
                } else if (isDown && !nextIsDown && downPoint) {
                    const moved = Math.hypot(point.x - downPoint.x, point.y - downPoint.y);
                    if (moved <= 18) {
                        const hit = tabletButtonRegionsRef.current.find((region) =>
                            point.x >= region.x && point.x <= region.x + region.width && point.y >= region.y && point.y <= region.y + region.height
                        );
                        if (hit) {
                            tapLocked = true;
                            try { await handleTabletVirtualButtonTap(hit.id); }
                            finally { setTimeout(() => { tapLocked = false; }, 180); }
                        }
                    }
                    downPoint = null;
                }
                isDown = nextIsDown;
            };
            reportHandler.onReportPenData = (report: any) => { void handleReport(report); };
            reportHandler.onReportPenDataOption = (report: any) => { void handleReport(report); };
            reportHandler.onReportPenDataTimeCountSequence = (report: any) => { void handleReport(report); };
            await reportHandler.startReporting(tablet, true);
        } catch {
            setHardwareError('تعذر تفعيل وضع التنقل على شاشة STU-540.');
            setStuStatus('ERROR');
        }
    };

    const handleShowDocumentOnTablet = async () => {
        try {
            setIsSendingPreviewToTablet(true);
            setHardwareError(null);
            await pushPreviewToTablet(tabletSigningViewModeRef.current);
            await startTabletNavigationMode();
            setStuStatus('CONNECTED');
        } catch (err: any) {
            setHardwareError(err?.message || 'تعذر إرسال معاينة الوثيقة إلى شاشة اللوحة.');
            setStuStatus('ERROR');
        } finally {
            setIsSendingPreviewToTablet(false);
        }
    };

    const adjustTabletPreviewZoom = async (delta: number) => {
        const nextZoom = Math.max(0.5, Math.min(2.2, Number((tabletPreviewZoom + delta).toFixed(2))));
        if (nextZoom === tabletPreviewZoom) return;
        tabletPreviewZoomRef.current = nextZoom;
        setTabletPreviewZoom(nextZoom);
        if (!isWacomConnected || stuStatus === 'CAPTURING') return;
        try {
            setIsSendingPreviewToTablet(true);
            await pushPreviewToTablet(tabletSigningViewMode);
            await startTabletNavigationMode();
            setStuStatus('CONNECTED');
        } catch (err: any) {
            setHardwareError(err?.message || 'تعذر تحديث تكبير المعاينة على شاشة اللوحة.');
            setStuStatus('ERROR');
        } finally {
            setIsSendingPreviewToTablet(false);
        }
    };

    useEffect(() => {
        const canvas = judgeSigCanvasRef.current;
        if (!canvas) return;
        const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(320, Math.floor(rect.width * ratio));
        canvas.height = Math.max(140, Math.floor(rect.height * ratio));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, [selectedDeedId]);

    const [currentDate] = useState(new Date());
    const [hijriDate] = useState('26 شعبان 1447');

    useEffect(() => {
        const handlePageHide = () => {
            releaseStuViaBeacon();
            forceReleaseSync();
            void closeSignatureSession();
        };
        const handleBeforeUnload = () => {
            void closeSignatureSession();
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                releaseStuViaBeacon();
                forceReleaseSync();
                void closeSignatureSession();
            }
        };
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            void closeSignatureSession();
        };
    }, []);

    const protocolPrefix = "الحمد لله";
    const protocolSub = "أُعلم بأدائها ومراقبتها";
    const protocolJudge = `قاضي التوثيق بالمحكمة الابتدائية بـ ${courtCity || '...'}`;
    const formattedDate = currentDate.toLocaleDateString('fr-CA').split('-').reverse().join('/');

    const clearJudgeSignatureCanvas = () => {
        const canvas = judgeSigCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(canvas.width / Math.max(1, rect.width), 0, 0, canvas.height / Math.max(1, rect.height), 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    const clearJudgeDeviceSignatureCanvas = () => {
        const canvas = judgeDeviceSigCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const trimCanvas = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;
        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        let top = height, left = width, right = 0, bottom = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = imageData.data[(y * width + x) * 4 + 3];
                const r = imageData.data[(y * width + x) * 4];
                const g = imageData.data[(y * width + x) * 4 + 1];
                const b = imageData.data[(y * width + x) * 4 + 2];
                if (alpha > 0 && !(r > 245 && g > 245 && b > 245)) {
                    top = Math.min(top, y);
                    left = Math.min(left, x);
                    right = Math.max(right, x);
                    bottom = Math.max(bottom, y);
                }
            }
        }

        if (right <= left || bottom <= top) return canvas;
        const padding = 8;
        const cropX = Math.max(0, left - padding);
        const cropY = Math.max(0, top - padding);
        const cropW = Math.min(width - cropX, right - left + padding * 2);
        const cropH = Math.min(height - cropY, bottom - top + padding * 2);
        const out = document.createElement('canvas');
        out.width = cropW;
        out.height = cropH;
        const outCtx = out.getContext('2d');
        if (!outCtx) return canvas;
        outCtx.fillStyle = '#ffffff';
        outCtx.fillRect(0, 0, cropW, cropH);
        outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        return out;
    };

    const getJudgeCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const handleJudgePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = judgeSigCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const point = getJudgeCanvasPoint(event);
        isJudgeDrawingRef.current = true;
        lastJudgePointRef.current = point;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
    };

    const handleJudgePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isJudgeDrawingRef.current) return;
        const canvas = judgeSigCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const point = getJudgeCanvasPoint(event);
        const lastPoint = lastJudgePointRef.current || point;
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        lastJudgePointRef.current = point;
    };

    const stopJudgeDrawing = () => {
        isJudgeDrawingRef.current = false;
        lastJudgePointRef.current = null;
    };

    const arrayBufferToBase64 = (ab: ArrayBuffer) => {
        const bytes = new Uint8Array(ab);
        const chunkSize = 0x8000;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    };

    const handleSaveJudgeSignature = () => {
        const canvas = judgeSigCanvasRef.current;
        if (!canvas) return;
        const trimmed = trimCanvas(canvas);
        setJudgeSignature(trimmed.toDataURL('image/png'));
        setIsSignaturePendingPlacement(true);
        setJudgeSignatureNotice('تم حفظ توقيع القاضي. انقر داخل معاينة الرسم لإدراجه.');
    };

    const handleClearJudgeSignature = () => {
        clearJudgeSignatureCanvas();
        setJudgeSignature(null);
        setIsSignaturePendingPlacement(false);
        setJudgeSignatureNotice(null);
        setJudgeEditedPdfBytes(null);
    };

    const handleClearSTU = async () => {
        clearJudgeDeviceSignatureCanvas();
        penDataRef.current = [];
        if (tabletRef.current) {
            try {
                const wgss = (window as any).WacomGSS;
                if (typeof tabletRef.current.setClearScreen === 'function') {
                    await tabletRef.current.setClearScreen();
                } else if (typeof tabletRef.current.clearScreen === 'function') {
                    await tabletRef.current.clearScreen();
                }
                const p = new wgss.STU.Protocol();
                await tabletRef.current.setInkingMode(p.InkingMode.InkingMode_On);
            } catch {}
        }
    };

    const handleJudgeCaptureStart = async () => {
        if (!tabletRef.current) {
            await connectToSTUDevice();
            if (!tabletRef.current) return;
        }
        try {
            const wgss = (window as any).WacomGSS;
            const tablet = tabletRef.current;
            const caps = capabilityRef.current;
            const p = new wgss.STU.Protocol();
            setStuStatus('CAPTURING');
            penDataRef.current = [];
            if (reportHandlerRef.current?.stopReporting) {
                await reportHandlerRef.current.stopReporting().catch(() => {});
            }
            try { await pushPreviewToTablet(tabletSigningViewMode); } catch {}
            await new Promise((resolve) => setTimeout(resolve, 120));
            try { await tablet.setInkingMode(p.InkingMode.InkingMode_On); } catch {}
            const reportHandler = new wgss.STU.ProtocolHelper.ReportHandler();
            reportHandlerRef.current = reportHandler;
            let isDown = false;
            let lastPoint = { x: 0, y: 0 };
            const penData = (report: any) => {
                const canvas = judgeDeviceSigCanvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (!canvas || !ctx) return;
                const tabletMaxX = caps?.tabletMaxX ?? 10800;
                const tabletMaxY = caps?.tabletMaxY ?? 6480;
                const nextPoint = {
                    x: Math.round((canvas.width * report.x) / tabletMaxX),
                    y: Math.round((canvas.height * report.y) / tabletMaxY),
                };
                const threshold = inkThresholdRef.current;
                const onMark = threshold?.onPressureMark ?? (caps?.minPressure || 100);
                const offMark = threshold?.offPressureMark ?? Math.max(0, onMark - 1);
                const pressure = report.pressure ?? 0;
                const isDownNow = isDown ? !(pressure <= offMark) : pressure > onMark;
                if (!isDown && isDownNow) lastPoint = nextPoint;
                if (isDownNow) {
                    ctx.beginPath();
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = '#000000';
                    ctx.moveTo(lastPoint.x, lastPoint.y);
                    ctx.lineTo(nextPoint.x, nextPoint.y);
                    ctx.stroke();
                    ctx.closePath();
                    lastPoint = nextPoint;
                }
                isDown = isDownNow;
                penDataRef.current.push(report);
            };
            reportHandler.onReportPenData = penData;
            reportHandler.onReportPenDataOption = penData;
            reportHandler.onReportPenDataTimeCountSequence = penData;
            await reportHandler.startReporting(tablet, true);
        } catch (err: any) {
            setHardwareError(err?.message || 'تعذر بدء التقاط توقيع القاضي من اللوحة.');
            setStuStatus('ERROR');
        }
    };

    const handleSaveJudgeDeviceSignature = async () => {
        const canvas = judgeDeviceSigCanvasRef.current;
        if (!canvas) return;
        const trimmed = trimCanvas(canvas);
        const realSig = trimmed.toDataURL('image/png');
        setJudgeSignature(realSig);
        setStuStatus('SAVED');
        if (reportHandlerRef.current?.stopReporting) {
            await reportHandlerRef.current.stopReporting().catch(() => {});
        }

        const canAutoPlaceOnPdf =
            tabletSigningViewMode === 'full' &&
            !!judgePdfUrl &&
            !!tabletPreviewTransformRef.current &&
            penDataRef.current.length > 0;

        const placeJudgeSignatureIntoPdf = async (opts?: {
            centerXPts?: number;
            centerYPts?: number;
            sigWidthHint?: number;
        }) => {
            const pdfDoc = await PDFDocument.load(
                judgeEditedPdfBytes && judgeEditedPdfBytes.byteLength > 0
                    ? judgeEditedPdfBytes
                    : new Uint8Array(await (await fetch(judgePdfUrl, { cache: 'no-store', credentials: 'same-origin' })).arrayBuffer())
            );
            const pages = pdfDoc.getPages();
            const activePage = pages[pages.length - 1];
            if (!activePage) throw new Error('لا توجد صفحة صالحة لإدراج توقيع القاضي.');
            const embeddedImage = await pdfDoc.embedPng(realSig);
            const { width: pdfW, height: pdfH } = activePage.getSize();
            const fallbackSigWidth = Math.min(120, pdfW * 0.18);
            const sigWidth = Math.max(54, Math.min(160, opts?.sigWidthHint || fallbackSigWidth));
            const sigHeight = (sigWidth * embeddedImage.height) / Math.max(1, embeddedImage.width);
            const centerXPts = opts?.centerXPts ?? Math.max(90, pdfW * 0.22);
            const centerYPts = opts?.centerYPts ?? Math.max(145, pdfH * 0.28);

            activePage.drawImage(embeddedImage, {
                x: centerXPts - sigWidth / 2,
                y: centerYPts - sigHeight / 2,
                width: sigWidth,
                height: sigHeight,
            });

            const modifiedBytes = await pdfDoc.save();
            const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
            setJudgeEditedPdfBytes(modifiedBytes);
            setPreviewOverrideUrl(URL.createObjectURL(blob));
            setJudgeSignatureNotice('تم إدراج توقيع القاضي داخل الرسم بنجاح.');
            setIsSignaturePendingPlacement(false);
        };

        if (canAutoPlaceOnPdf) {
            try {
                const transform = tabletPreviewTransformRef.current!;
                const caps = capabilityRef.current;
                const tabletMaxX = Number(caps?.tabletMaxX || 10800);
                const tabletMaxY = Number(caps?.tabletMaxY || 6480);
                const strokePoints = penDataRef.current
                    .map((report: any) => {
                        const pressure = Number(report?.pressure ?? 0);
                        const threshold = inkThresholdRef.current;
                        const onMark = Number(threshold?.onPressureMark ?? (caps?.minPressure || 100));
                        if (pressure <= onMark) return null;
                        return {
                            x: (Number(report?.x || 0) / Math.max(1, tabletMaxX)) * transform.screenWidth,
                            y: (Number(report?.y || 0) / Math.max(1, tabletMaxY)) * transform.screenHeight,
                        };
                    })
                    .filter(Boolean) as Array<{ x: number; y: number }>;

                if (strokePoints.length > 1) {
                    const minX = Math.min(...strokePoints.map((p) => p.x));
                    const maxX = Math.max(...strokePoints.map((p) => p.x));
                    const minY = Math.min(...strokePoints.map((p) => p.y));
                    const maxY = Math.max(...strokePoints.map((p) => p.y));
                    const clampedMinX = Math.max(transform.drawX, Math.min(minX, transform.drawX + transform.drawWidth));
                    const clampedMaxX = Math.max(transform.drawX, Math.min(maxX, transform.drawX + transform.drawWidth));
                    const clampedMinY = Math.max(transform.drawY, Math.min(minY, transform.drawY + transform.drawHeight));
                    const clampedMaxY = Math.max(transform.drawY, Math.min(maxY, transform.drawY + transform.drawHeight));
                    const normalizedMinX = (clampedMinX - transform.drawX) / Math.max(1, transform.drawWidth);
                    const normalizedMaxX = (clampedMaxX - transform.drawX) / Math.max(1, transform.drawWidth);
                    const normalizedMinY = (clampedMinY - transform.drawY) / Math.max(1, transform.drawHeight);
                    const normalizedMaxY = (clampedMaxY - transform.drawY) / Math.max(1, transform.drawHeight);
                    const sourceMinX = transform.cropX + normalizedMinX * transform.cropWidth;
                    const sourceMaxX = transform.cropX + normalizedMaxX * transform.cropWidth;
                    const sourceMinY = transform.cropY + normalizedMinY * transform.cropHeight;
                    const sourceMaxY = transform.cropY + normalizedMaxY * transform.cropHeight;
                    const pdfDoc = await PDFDocument.load(
                        judgeEditedPdfBytes && judgeEditedPdfBytes.byteLength > 0
                            ? judgeEditedPdfBytes
                            : new Uint8Array(await (await fetch(judgePdfUrl, { cache: 'no-store', credentials: 'same-origin' })).arrayBuffer())
                    );
                    const pages = pdfDoc.getPages();
                    const safePageIndex = Math.max(0, Math.min(transform.page - 1, pages.length - 1));
                    const activePage = pages[safePageIndex];
                    if (!activePage) throw new Error('Page not available for judge signature placement.');
                    const { width: pdfW, height: pdfH } = activePage.getSize();
                    const renderToPdfScaleX = pdfW / Math.max(1, transform.renderWidth);
                    const renderToPdfScaleY = pdfH / Math.max(1, transform.renderHeight);
                    const bboxWidthPts = Math.max(24, (sourceMaxX - sourceMinX) * renderToPdfScaleX);
                    const centerXPts = (sourceMinX + (sourceMaxX - sourceMinX) / 2) * renderToPdfScaleX;
                    const centerYFromTopPts = ((sourceMinY + sourceMaxY) / 2) * renderToPdfScaleY;
                    const centerYPts = pdfH - centerYFromTopPts;
                    await placeJudgeSignatureIntoPdf({
                        centerXPts,
                        centerYPts,
                        sigWidthHint: Math.max(42, bboxWidthPts * 1.08),
                    });
                    setJudgeSignatureNotice('تم إدراج توقيع القاضي تلقائياً داخل PDF انطلاقاً من شاشة اللوحة.');
                    return;
                }
            } catch (err: any) {
                setHardwareError(err?.message || 'تعذر تحديد موضع توقيع القاضي تلقائياً. سيتم استخدام موضع افتراضي واضح.');
            }
        }
        try {
            await placeJudgeSignatureIntoPdf();
        } catch (fallbackErr: any) {
            setHardwareError(fallbackErr?.message || 'تعذر إدراج توقيع القاضي داخل الرسم.');
            setStuStatus('ERROR');
        }
    };

    const buildJudgeSignedPdfBase64 = async () => {
        if (judgeEditedPdfBytes && judgeEditedPdfBytes.byteLength > 0) {
            const sliced = judgeEditedPdfBytes.buffer.slice(
                judgeEditedPdfBytes.byteOffset,
                judgeEditedPdfBytes.byteOffset + judgeEditedPdfBytes.byteLength
            );
            return arrayBufferToBase64(sliced);
        }
        const sourceUrl = previewOverrideUrl || selectedDeed?.previewUrl || null;
        if (!sourceUrl || !judgeSignature) return undefined;
        let pdfBytes: Uint8Array;
        if (sourceUrl.startsWith('data:')) {
            const base64Index = sourceUrl.indexOf('base64,');
            const base64 = base64Index !== -1 ? sourceUrl.slice(base64Index + 7) : sourceUrl;
            const binary = atob(base64);
            pdfBytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                pdfBytes[i] = binary.charCodeAt(i);
            }
        } else {
            const resp = await fetch(sourceUrl, { cache: 'no-store' });
            if (!resp.ok) {
                throw new Error(`تعذر تحميل نسخة الرسم للتوقيع (${resp.status})`);
            }
            pdfBytes = new Uint8Array(await resp.arrayBuffer());
        }
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const activePage = pages[Math.max(0, Math.min(judgePreviewPage - 1, pages.length - 1))];
        if (!activePage) throw new Error('لا توجد صفحة صالحة لإدراج توقيع القاضي.');
        const embeddedImage = await pdfDoc.embedPng(judgeSignature);
        const { width: pdfW, height: pdfH } = activePage.getSize();
        const sigW = Math.min(120, pdfW * 0.18);
        const sigH = (sigW * embeddedImage.height) / Math.max(1, embeddedImage.width);
        const x = 42;
        const y = Math.max(130, pdfH * 0.18);
        activePage.drawImage(embeddedImage, { x, y, width: sigW, height: sigH });
        const modifiedBytes = await pdfDoc.save();
        return arrayBufferToBase64(modifiedBytes.buffer);
    };

    const handleJudgePreviewClick = async (event: React.MouseEvent<HTMLElement>) => {
        if (!isSignaturePendingPlacement || !judgeSignature) return;
        try {
            const sourceUrl = previewOverrideUrl || selectedDeed?.previewUrl || null;
            if (!sourceUrl) throw new Error('لا توجد نسخة PDF صالحة لإدراج التوقيع.');
            let pdfBytes: Uint8Array;
            if (sourceUrl.startsWith('data:')) {
                const base64Index = sourceUrl.indexOf('base64,');
                const base64 = base64Index !== -1 ? sourceUrl.slice(base64Index + 7) : sourceUrl;
                const binary = atob(base64);
                pdfBytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    pdfBytes[i] = binary.charCodeAt(i);
                }
            } else {
                const resp = await fetch(sourceUrl, { cache: 'no-store' });
                if (!resp.ok) throw new Error(`تعذر تحميل نسخة الرسم (${resp.status})`);
                pdfBytes = new Uint8Array(await resp.arrayBuffer());
            }
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            const activePage = pages[Math.max(0, Math.min(judgePreviewPage - 1, pages.length - 1))];
            if (!activePage) throw new Error('لا توجد صفحة صالحة لإدراج توقيع القاضي.');
            const embeddedImage = await pdfDoc.embedPng(judgeSignature);
            const { width: pdfW, height: pdfH } = activePage.getSize();
            const sigW = Math.min(120, pdfW * 0.18);
            const sigH = (sigW * embeddedImage.height) / Math.max(1, embeddedImage.width);
            const x = 42;
            const y = Math.max(130, pdfH * 0.18);
            activePage.drawImage(embeddedImage, { x, y, width: sigW, height: sigH });
            const modifiedBytes = await pdfDoc.save();
            const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
            setJudgeEditedPdfBytes(modifiedBytes);
            setPreviewOverrideUrl(URL.createObjectURL(blob));
            setJudgeSignatureNotice('تم إدراج توقيع القاضي داخل الرسم. يمكنك الآن اعتماد الخطاب.');
            setIsSignaturePendingPlacement(false);
        } catch (error: any) {
            alert(error?.message || 'تعذر إدراج توقيع القاضي داخل الرسم.');
        }
    };

    const handleStampDeed = async () => {
        if (!selectedDeed || !selectedDeedId || selectedDeed.status !== 'READY' || !hasStep3Completed) return;
        
        setIsStamping(true);
        try {
            const signedPdfBase64 = judgeSignature ? await buildJudgeSignedPdfBase64() : undefined;
            const res = await decideMutation.mutateAsync({
                sessionToken: sessionToken || '',
                id: selectedDeedId,
                decision: 'accepted',
                notes: optionalNotes,
                signedPdfBase64,
            });
            if ((res as any)?.signedPdfUrl) {
                setPreviewOverrideUrl(`${(res as any).signedPdfUrl}${String((res as any).signedPdfUrl).includes('?') ? '&' : '?'}v=${Date.now()}`);
            }
            setJudgeSignatureNotice(null);
            setJudgeSignature(null);
            setJudgeEditedPdfBytes(null);
            clearJudgeSignatureCanvas();
            await refetchSubmission();
            await refetchList();
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams({
                    from: 'judicial-speech',
                    deedId: selectedDeedId,
                    serialNumber: selectedDeed.serialNumber || '',
                    category: selectedDeed.category || '',
                    city: courtCity.trim() || selectedDeed.city || '',
                });
                window.location.assign(`/judge/final-archiving?${params.toString()}`);
            }
        } catch (error: any) {
            setIsStamping(false);
            alert(error?.message || 'حدث خطأ أثناء اعتماد الخطاب.');
        }
    };

    const handleGenerateInclusion = async () => {
        if (!selectedDeedId || !registryType || !registryLetter.trim()) {
            setInclusionError('يرجى اختيار نوع السجل و حرف السجل أولاً.');
            return;
        }
        setInclusionError(null);
        setInclusionSuccess(null);
        const res = await generateInclusionMutation.mutateAsync({
            sessionToken: sessionToken || '',
            id: selectedDeedId,
            registryType,
            registryLetter: registryLetter.trim(),
        });
        setGeneratedInclusion(res);
    };

    const handleGenerateJudgeCourtStamp = async () => {
        if (!selectedDeedId) return;
        setCourtStampNotice(null);
        setIsGeneratingCourtStamp(true);
        setJudgeEditedPdfBytes(null);
        try {
            const res = await generateCourtStampMutation.mutateAsync({
                sessionToken: sessionToken || '',
                id: selectedDeedId,
                courtCity: courtCity.trim(),
            });
            setPreviewOverrideUrl(res.stampedPdfUrl ? `${res.stampedPdfUrl}${res.stampedPdfUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : null);
            setIsStampPlacementPending(false);
            setIsPlacementModeOpen(false);
            setStampPlacement(null);
            setCourtStampNotice('تم توليد طابع المحكمة الجديد وإدراجه داخل الرسم بنجاح.');
            void refetchSubmission();
            void refetchList();
        } catch (error: any) {
            alert(error?.message || 'تعذر توليد طابع المحكمة.');
        } finally {
            setIsGeneratingCourtStamp(false);
        }
    };

    const handleRevertJudgeCourtStamp = async () => {
        if (!selectedDeedId) return;
        if (typeof window !== 'undefined') {
            const confirmed = window.confirm('هل تؤكد التراجع عن طابع المحكمة والخطاب المولّد؟');
            if (!confirmed) return;
        }
        try {
            setJudgeEditedPdfBytes(null);
            await revertCourtStampMutation.mutateAsync({
                sessionToken: sessionToken || '',
                id: selectedDeedId,
            });
            setPreviewOverrideUrl(null);
            setCourtStampNotice('تم حذف طابع المحكمة والرجوع إلى نسخة الرسم السابقة.');
            await refetchSubmission();
            await refetchList();
        } catch (error: any) {
            alert(error?.message || 'تعذر التراجع عن طابع المحكمة.');
        }
    };

    const handleSaveInclusionReference = async () => {
        if (!selectedDeedId || !registryType || !registryLetter.trim()) {
            setInclusionError('يرجى اختيار نوع السجل و حرف السجل أولاً.');
            return;
        }
        if (!generatedInclusion) {
            setInclusionError('يرجى توليد رقم التضمين أولاً.');
            return;
        }
        if (typeof window !== 'undefined') {
            const confirmed = window.confirm('هل تؤكد إدراج مرجع التضمين في هذا الرسم؟');
            if (!confirmed) return;
        }
        setInclusionError(null);
        setInclusionSuccess(null);
        try {
            const saved = await saveInclusionMutation.mutateAsync({
                sessionToken: sessionToken || '',
                id: selectedDeedId,
                registryType,
                registryLetter: registryLetter.trim(),
            });
            const embedded = await embedFooterMutation.mutateAsync({
                sessionToken: sessionToken || '',
                signedDeedId: saved.signedDeedId,
                forceRegenerate: true,
                origin: typeof window !== 'undefined' ? window.location.origin : undefined,
            });
            const generated = await generateCourtIdMutation.mutateAsync({
                sessionToken: sessionToken || '',
                id: selectedDeedId,
                courtCity: courtCity.trim(),
            });
            setJudgeEditedPdfBytes(null);
            setJudgeCourtId(generated.generatedId || null);
            setPreviewOverrideUrl(
                (generated.stampedPdfUrl || embedded.signedPdfUrl)
                    ? `${generated.stampedPdfUrl || embedded.signedPdfUrl}${String(generated.stampedPdfUrl || embedded.signedPdfUrl).includes('?') ? '&' : '?'}v=${Date.now()}`
                    : null
            );
            setGeneratedInclusion({
                descriptor: saved.inclusionReference.descriptor,
                inclusionNumber: saved.inclusionReference.inclusionNumber,
                registerNumber: saved.inclusionReference.registerNumber,
                hijriDate: saved.inclusionReference.hijriDate,
                gregorianDate: saved.inclusionReference.gregorianDate,
            });
            await refetchSubmission();
            await refetchList();
            setInclusionSuccess(`تم إدراج مراجع التضمين وتوليد المعرف القضائي بنجاح: ${generated.generatedId}`);
            setIsInclusionModalOpen(false);
        } catch (error: any) {
            setInclusionError(error?.message || 'تعذر إدراج مرجع التضمين.');
        }
    };

    if (!selectedDeedId) {
        return (
            <div className="min-h-screen bg-slate-50 p-8 space-y-8 font-['Cairo',_sans-serif]" dir="rtl">
                {/* Header */}
                <header className="relative overflow-hidden bg-gradient-to-r from-[#002366] to-[#4B0082] rounded-[2.5rem] p-12 text-white shadow-2xl">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-white/15 rounded-3xl backdrop-blur-xl border border-white/20">
                                <Scale className="w-12 h-12 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight">رواق الخطاب القضائي</h1>
                                <p className="text-blue-100 text-lg mt-2 opacity-90 font-medium">المنصة السيادية لاعتماد المخطوبات والتوثيق الرقمي النهائي</p>
                            </div>
                        </div>
                        <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">حالة السجل الوطني</div>
                            <div className="text-2xl font-mono font-bold tracking-tighter">78% CAPACITY</div>
                        </div>
                    </div>
                </header>

                {isListLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2rem] shadow-xl border border-slate-200">
                        <div className="w-16 h-16 border-4 border-[#002366]/20 border-t-[#002366] rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-bold">جاري تحميل الرسوم الجاهزة للمخاطبة من الخادم السيادي...</p>
                    </div>
                ) : listError ? (
                    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-right shadow-xl">
                        <div className="text-lg font-black text-red-800">تعذر تحميل الرسوم الجاهزة للخطاب القضائي</div>
                        <p className="mt-2 text-sm font-bold text-red-700">{listError.message}</p>
                        <button
                            type="button"
                            onClick={() => refetchList()}
                            className="mt-4 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white hover:bg-red-800 transition-colors"
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Dashboard Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { label: 'جاهز للخطاب', value: deeds.length, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'في انتظار التصحيح', value: 3, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
                                { label: 'تم اعتمادها اليوم', value: 45, icon: Stamp, color: 'text-purple-600', bg: 'bg-purple-50' },
                                { label: 'مؤرشفة نهائياً', value: '1,284', icon: ShieldCheck, color: 'text-slate-600', bg: 'bg-slate-50' }
                            ].map((stat, i) => (
                                <div key={i} className={`${stat.bg} p-6 rounded-3xl border border-black/5 shadow-sm`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <stat.icon className={`w-8 h-8 ${stat.color}`} />
                                        <span className="text-3xl font-black tracking-tight">{stat.value}</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-500">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* List of Deeds Ready for Speech */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-2xl font-black text-[#002366]">الرسوم الجاهزة للخطاب القضائي</h2>
                                <div className="relative flex-1 max-w-md mx-8">
                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="بحث بالرقم الوطني أو الاسم..."
                                        className="w-full pr-12 pl-4 py-3 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#002366] outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-slate-100/50 text-slate-500 font-bold text-sm uppercase">
                                            <th className="px-8 py-5">الرقم الترتيبي</th>
                                            <th className="px-8 py-5">نوع الرسم</th>
                                            <th className="px-8 py-5">العدول المحررون</th>
                                            <th className="px-8 py-5">تاريخ التلقي</th>
                                            <th className="px-8 py-5">الحالة</th>
                                            <th className="px-8 py-5">الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {deeds.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold">
                                                    لا توجد رسوم بانتظار الخطاب حالياً.
                                                </td>
                                            </tr>
                                        ) : (
                                            deeds.map((deed) => (
                                                <tr key={deed.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-8 py-6 font-mono font-bold text-blue-600">{deed.serialNumber}</td>
                                                    <td className="px-8 py-6 font-bold">{deed.category}</td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col gap-1">
                                                            {deed.notaries.map((n, idx) => (
                                                                <span key={idx} className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-lg w-fit">
                                                                    {n.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-slate-500">{deed.timestamp}</td>
                                                    <td className="px-8 py-6">
                                                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                                                            deed.status === 'READY' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            {deed.status === 'READY' ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                            {deed.status === 'READY' ? 'جاهز للخطاب' : 'تم الاعتماد'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <button 
                                                            onClick={() => setSelectedDeedId(deed.id)}
                                                            className="bg-[#002366] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            فتح منصة الخطاب
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // --- Component: Attachments Section ---
    const ChronologyViewer = () => {
        if (!selectedDeed) return null;
        const attachments = selectedDeed.supportAttachments || [];
        return (
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 mt-8">
                <h4 className="flex items-center gap-3 text-slate-800 font-black text-sm mb-6 uppercase tracking-widest">
                    <Paperclip className="w-4 h-4 text-[#4B0082]" /> مرفقات الإحالة
                </h4>
                <div className="space-y-4">
                    {attachments.length ? (
                        attachments.map((attachment, idx) => (
                            <div
                                key={`${attachment.url}-${idx}`}
                                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <button
                                        type="button"
                                        onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
                                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black text-slate-700 transition-colors hover:bg-slate-100"
                                    >
                                        <Eye className="ml-1 inline h-3.5 w-3.5" />
                                        فتح المرفق
                                    </button>
                                    <div className="min-w-0 text-right">
                                        <div className="truncate text-sm font-black text-slate-900">{attachment.name}</div>
                                        <div className="mt-1 text-[11px] font-bold text-slate-400">
                                            {attachment.category || 'مرفق'}{attachment.mimeType ? ` • ${attachment.mimeType}` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center text-[11px] font-black text-slate-400">
                            لا توجد مرفقات جانبية محفوظة لهذه الإحالة.
                        </div>
                    )}
                </div>
                <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter">
                        هذه المرفقات للعرض فقط، ولا يمكن التوقيع عليها أو تعديلها من هذه المساحة
                    </p>
                </div>
            </div>
        );
    };

    if (!selectedDeed) return null;

    if (isDeedLoading) {
        return (
            <div className="h-screen bg-slate-50 flex flex-col items-center justify-center font-['Cairo',_sans-serif]" dir="rtl">
                 <div className="w-16 h-16 border-4 border-[#1f3c88]/20 border-t-[#1f3c88] rounded-full animate-spin mb-4"></div>
                 <p className="text-slate-500 font-black">جاري سحب المحفوظات والتحقق من التوقيعات الرقمية...</p>
                 <span className="text-xs text-slate-400 mt-2 font-mono uppercase tracking-widest">Accessing Sovereign Vault Case #{selectedDeedId.substring(0,8)}</span>
            </div>
        );
    }

    return (
        <>
        <div className="h-screen bg-[#F8FAFC] flex flex-col font-['Cairo',_sans-serif]" dir="rtl">
            {/* Sovereign 3-Panel Workspace Header */}
            <div className="h-20 bg-gradient-to-l from-[#1f3c88] to-[#4B0082] shadow-xl flex items-center justify-between px-8 text-white z-50">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => setSelectedDeedId(null)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <Scale className="w-5 h-5 text-blue-300" />
                            <h2 className="text-xl font-black">رواق الخطاب القضائي</h2>
                            <span className="bg-[#6A1B9A] border border-white/20 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">PHASE 2: JUDICIAL VALIDATION</span>
                        </div>
                        <p className="text-blue-100/60 text-xs font-bold leading-none mt-1 uppercase tracking-tighter">
                            National Registry ID: {selectedDeed.id} | Status: {selectedDeed.status}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <div className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Hash Status</div>
                        <div className="text-xs font-mono text-emerald-400">{selectedDeed.notaryHash || 'PENDING'}</div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
                        <Lock className="w-4 h-4 text-orange-400" />
                        <span className="text-[11px] font-bold uppercase tracking-tighter">Secure Link AES-256</span>
                    </div>
                    <div className="h-8 w-[1px] bg-white/20"></div>
                    <div className="flex flex-col items-end">
                        <div className="text-[9px] text-blue-200 font-bold uppercase tabular-nums">{hijriDate} | 15 FEB 2026</div>
                        <div className="text-sm font-black text-white">{user?.full_name || 'ذ. محمد المسير'} (قاضي التوثيق)</div>
                    </div>
                </div>
            </div>

            {/* Main 3-Panel Content */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* 1️⃣ LEFT PANEL: Interactive PDF Preview (45% width) */}
                <div className="w-[45%] border-l border-slate-200 bg-slate-100 flex flex-col shadow-inner relative overflow-hidden">
                    <div className="sticky top-0 z-20 p-4 bg-white/80 backdrop-blur-md border-b flex justify-between items-center px-8">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#1f3c88]" /> معاينة النسخة الرسمية المؤرشفة
                        </span>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
                                <button
                                    type="button"
                                    onClick={() => setJudgePreviewPage((prev) => Math.max(1, prev - 1))}
                                    disabled={judgePreviewPage <= 1}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors disabled:text-slate-300 disabled:hover:bg-transparent"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <span className="min-w-[72px] text-center text-[11px] font-black text-slate-600">
                                    صفحة {judgePreviewPage} / {pdfPageCount}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setJudgePreviewPage((prev) => Math.min(pdfPageCount, prev + 1))}
                                    disabled={judgePreviewPage >= pdfPageCount}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors disabled:text-slate-300 disabled:hover:bg-transparent"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1">
                                <button
                                    type="button"
                                    title="تصغير"
                                    onClick={() => setDocZoom((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-500 font-bold text-xs transition-colors"
                                >
                                    −
                                </button>
                                <span className="min-w-[44px] text-center text-[11px] font-black text-slate-600">
                                    {Math.round(docZoom * 100)}%
                                </span>
                                <button
                                    type="button"
                                    title="تكبير"
                                    onClick={() => setDocZoom((prev) => Math.min(2.0, Number((prev + 0.1).toFixed(2))))}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-500 font-bold text-xs transition-colors"
                                >
                                    +
                                </button>
                            </div>
                            <button
                                type="button"
                                title="طباعة الرسم"
                                onClick={() => {
                                    if (!judgePdfUrl) return;
                                    const w = window.open(judgePdfUrl, '_blank');
                                    if (w) w.focus();
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                            >
                                <Printer className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                title="تحميل النسخة الرسمية"
                                onClick={() => {
                                    if (!judgePdfUrl) return;
                                    const link = document.createElement('a');
                                    link.href = judgePdfUrl;
                                    link.download = selectedDeed?.previewName || `rasm-${selectedDeed?.serialNumber || selectedDeed?.id}.pdf`;
                                    link.target = '_blank';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-6 md:p-10 flex justify-center items-start overflow-auto select-none bg-slate-200/60">
                        {selectedDeed && (
                            (selectedDeed.previewMimeType || '').toLowerCase().includes('pdf') ||
                            (previewOverrideUrl || selectedDeed.previewUrl || '').toLowerCase().includes('.pdf') ||
                            (previewOverrideUrl || selectedDeed.previewUrl || '').startsWith('data:application/pdf') ||
                            (previewOverrideUrl || selectedDeed.previewUrl || '').startsWith('blob:')
                        ) ? (
                            <div
                                ref={judgePreviewRef}
                                style={{
                                    transform: `scale(${docZoom})`,
                                    transformOrigin: 'top center',
                                }}
                                className="w-full flex flex-col items-center justify-start transition-transform duration-150"
                            >
                                <div
                                    ref={judgePageWrapperRef}
                                    className="relative shadow-2xl bg-white rounded-sm border border-slate-200/80 overflow-hidden mx-auto"
                                >
                                    <canvas
                                        ref={judgePreviewCanvasRef}
                                        className="block max-w-full bg-white"
                                    />
                                    <div
                                        className={`absolute inset-0 z-20 ${
                                            isSignaturePendingPlacement ? 'pointer-events-auto' : 'pointer-events-none'
                                        }`}
                                    >
                                        {isSignaturePendingPlacement && (
                                            <button
                                                type="button"
                                                aria-label="تحديد موضع التوقيع"
                                                onClick={handleJudgePreviewClick}
                                                className="absolute inset-0 w-full h-full cursor-crosshair bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                                            />
                                        )}
                                    </div>

                                    {isJudgePreviewRendering && (
                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px]">
                                            <div className="w-10 h-10 border-3 border-[#1f3c88] border-t-transparent rounded-full animate-spin mb-3"></div>
                                            <p className="text-xs font-bold text-slate-500">جاري تحميل الرسم القضائي...</p>
                                        </div>
                                    )}

                                    {judgePreviewError && (
                                        <div className="absolute inset-x-6 bottom-6 z-30 flex flex-col items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50/95 p-4 text-center shadow-lg">
                                            <p className="text-sm font-black text-amber-800">{judgePreviewError}</p>
                                            {judgePdfUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(judgePdfUrl, '_blank')}
                                                    className="text-xs font-black text-[#1f3c88] underline hover:text-blue-700"
                                                >
                                                    فتح الرسم في نافذة مستقلة
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {isSignaturePendingPlacement && (
                                    <div className="mt-4 max-w-lg rounded-2xl border border-blue-300 bg-blue-50/95 px-5 py-3 text-center text-sm font-black text-blue-700 shadow-xl backdrop-blur">
                                        انقر داخل معاينة الرسم لإدراج توقيع القاضي باستعمال نفس أسلوب تضمين التوقيع داخل PDF.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                style={{
                                    transform: `scale(${docZoom})`,
                                    transformOrigin: 'top center',
                                }}
                                className="w-[794px] min-h-[1123px] bg-white shadow-2xl p-16 relative border border-slate-200 transition-transform duration-150"
                            >

                            {/* Document Header */}
                            <div className="text-center mb-12 space-y-4">
                                <p className="font-['Amiri',_serif] text-xl">المملكة المغربية</p>
                                <p className="font-['Amiri',_serif] text-lg leading-tight">المندوبية العامة لإدارة السجون وإعادة الإدماج<br/>المحكمة الابتدائية بـ {selectedDeed.city}</p>
                                <div className="h-px bg-slate-200 w-32 mx-auto my-6"></div>
                            </div>

                            {/* Deed Content */}
                            <div className="space-y-8 font-['Amiri',_serif] text-xl leading-relaxed text-slate-800 relative z-10">
                                <p className="text-center font-bold text-2xl mb-8 underline decoration-double underline-offset-8 decoration-slate-200">{selectedDeed.category}</p>
                                <p className="text-justify indent-12">{selectedDeed.text}</p>
                                <p className="text-justify indent-12">هذا ما نص عليه الطرفان بعد تأكدهما من منطوق الوثيقة، وبناء عليه تم تحرير هذا الرسم وفق الضوابط الشرعية والقانونية الجاري بها العمل، وتم توقيعه إلكترونياً من قبل العدول المحررين قبل رفه للقضاء قصد الخطاب.</p>
                            </div>

                            {/* Signatures Area */}
                            <div className="mt-20 grid grid-cols-2 gap-12 border-t border-slate-100 pt-12">
                                <div className="space-y-4 text-center">
                                    <p className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">العدل الأول</p>
                                    <div className="h-20 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden relative group">
                                        <div className="text-[#1f3c88] font-['Alex_Brush',_cursive] text-4xl opacity-70 -rotate-3 select-none">
                                            {selectedDeed.notaries[0].name}
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500/30"></div>
                                    </div>
                                    <p className="font-black text-slate-600 text-xs">{selectedDeed.notaries[0].name}</p>
                                </div>
                                <div className="space-y-4 text-center">
                                    <p className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">العدل العاطف</p>
                                    <div className="h-20 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden relative">
                                        {selectedDeed.hasSecondNotarySign ? (
                                            <div className="text-[#1f3c88] font-['Alex_Brush',_cursive] text-4xl opacity-70 rotate-2 select-none">
                                                {selectedDeed.notaries[1].name}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest animate-pulse">Awaiting Sign</span>
                                        )}
                                        <div className={`absolute inset-x-0 bottom-0 h-1 ${selectedDeed.hasSecondNotarySign ? 'bg-emerald-500/30' : 'bg-red-500/30'}`}></div>
                                    </div>
                                    <p className="font-black text-slate-600 text-xs">{selectedDeed.notaries[1].name}</p>
                                </div>
                            </div>

                            {/* JUDICIAL PHASE: Speech & Approval Area */}
                            <div className="mt-4 border-t border-slate-100 relative pt-4 transition-all duration-1000">
                                {selectedDeed.status === 'APPROVED_JUDGE' ? (
                                    <div className="flex flex-col items-start justify-start text-right space-y-3 animate-in zoom-in duration-700">
                                        <div className="flex flex-col items-start space-y-1">
                                            <p className="font-['Amiri',_serif] text-3xl font-black text-[#1f3c88] tracking-widest leading-none">{protocolPrefix}</p>
                                            <div className="w-10 h-px bg-[#1f3c88]/10"></div>
                                            <p className="font-['Amiri',_serif] text-2xl font-bold text-[#1f3c88] leading-tight">{protocolSub}</p>
                                            <p className="font-['Amiri',_serif] text-xl font-bold text-slate-700 leading-tight">{protocolJudge}</p>
                                        </div>

                                        <div className="flex gap-6 text-[9px] font-bold text-slate-400 border-y border-slate-50 py-1.5 w-full justify-start">
                                            <span>بتاريخ: {formattedDate} مـ</span>
                                            <span>الموافق لـ: {hijriDate} هـ</span>
                                        </div>
                                        
                                        <div className="mt-2 flex items-center justify-between w-full px-6">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="relative p-3 border border-[#4B0082]/10 rounded-full bg-purple-50 mx-auto">
                                                    <Fingerprint className="w-6 h-6 text-[#4B0082] opacity-70 rotate-12" />
                                                </div>
                                                <p className="font-['Amiri',_serif] text-base font-black text-[#4B0082] leading-none">{user?.full_name || 'ذ. محمـد المسير'}</p>
                                            </div>

                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-right space-y-1.5 w-48 shadow-inner">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Seal ID</span>
                                                    <span className="text-[8px] font-mono font-bold text-purple-600">{selectedDeed.judgeId?.substring(0,10)}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">File No</span>
                                                    <span className="text-[8px] font-mono font-bold text-slate-700">{selectedDeed.judgeFileNo || '2026/042'}</span>
                                                </div>
                                                <div className="h-px bg-slate-200"></div>
                                                <div className="text-[6px] font-mono text-slate-400 break-all leading-none">
                                                    {selectedDeed.judgeHash?.substring(0, 24)}...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border border-dashed border-blue-100 bg-blue-50/10 rounded-2xl p-4 transition-all hover:bg-blue-50/20 group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-[40px]"></div>
                                        <div className="flex flex-col items-center justify-center text-center space-y-2">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center border border-blue-50">
                                                <Stamp className="w-5 h-5 text-[#1f3c88] opacity-50" />
                                            </div>
                                            <div>
                                                <p className="text-[#1f3c88] font-black text-lg tracking-tight leading-none">منطقة المخاطبة الختامية</p>
                                                <p className="text-blue-700/40 text-[10px] font-bold italic mt-1 px-4 leading-normal">هذه المساحة مخصصة للخطاب القضائي ومراجعة الاعتماد النهائي.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- DOUBLE QR FOOTER (The Professional Standard) --- */}
                            <div className="absolute bottom-12 inset-x-12 flex justify-between items-end">
                                {/* PHASE 1 QR (Notary) - BOTTOM LEFT */}
                                <div className="flex flex-col items-start gap-2 group transition-all">
                                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                                        <QrCode className={`w-14 h-14 ${selectedDeed.notaryHash ? 'text-slate-800' : 'text-slate-200'}`} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Notary Phase QR</span>
                                        <span className="text-[7px] font-mono text-slate-500 tabular-nums">HASH: {selectedDeed.notaryHash?.substr(0,12)}...</span>
                                    </div>
                                </div>

                                {/* PHASE 2 QR (Judicial) - BOTTOM RIGHT */}
                                <div className={`flex flex-col items-end gap-2 group transition-all duration-1000 ${selectedDeed.status === 'APPROVED_JUDGE' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-10 blur-sm'}`}>
                                    <div className="p-2 bg-purple-50 border border-purple-100 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                                        <QrCode className="w-14 h-14 text-[#4B0082]" />
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Judicial Phase QR</span>
                                        <span className="text-[7px] font-mono text-purple-600 tabular-nums">HASH: {selectedDeed.judgeHash?.substr(0,12)}...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}
                    </div>
                </div>

                {/* 2️⃣ MIDDLE PANEL: Speech Editor & Timeline */}
                <div className="w-[30%] border-l border-slate-200 flex flex-col bg-white">
                    <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#6A1B9A]/10 rounded-xl">
                                <Fingerprint className="w-5 h-5 text-[#6A1B9A]" />
                            </div>
                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">محرر الخطاب القضائي</h3>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 uppercase tracking-widest">Live Link</span>
                    </div>

                    <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                        {/* Status Chain Visualizer */}
                        <div className="bg-[#1f3c88]/5 p-6 rounded-3xl border border-[#1f3c88]/10 space-y-4">
                            <h4 className="text-[11px] font-black text-[#1f3c88] uppercase tracking-widest text-right">نظام سلسلة الحالة (Status Chain)</h4>
                            <div className="flex items-center justify-between gap-1">
                                {[
                                    { label: 'Draft', active: true },
                                    { label: 'Signed', active: true },
                                    { label: 'Judge', active: true },
                                    { label: 'Approved', active: selectedDeed.status === 'APPROVED_JUDGE' },
                                    { label: 'Archived', active: false }
                                ].map((step, idx) => (
                                    <React.Fragment key={idx}>
                                        <div className={`flex flex-col items-center gap-1 flex-1`}>
                                            <div className={`w-3 h-3 rounded-full border-2 ${step.active ? 'bg-emerald-500 border-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 border-white'}`}></div>
                                            <span className={`text-[8px] font-black ${step.active ? 'text-emerald-700' : 'text-slate-400'} uppercase`}>{step.label}</span>
                                        </div>
                                        {idx < 4 && <div className={`h-[2px] flex-1 mb-4 ${step.active ? 'bg-emerald-200' : 'bg-slate-100'}`}></div>}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-8 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-[#1f3c88]/10 group-hover:bg-[#1f3c88]/20 transition-colors"></div>
                            <label className="flex items-center gap-2 text-slate-400 font-black uppercase text-[10px] mb-4 tracking-widest">
                                <Info className="w-3 h-3 text-[#1f3c88]" /> منطوق الخطاب الرسمي
                            </label>
                            
                            <div className="space-y-6 text-right">
                                <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100 font-['Amiri',_serif] text-slate-800 leading-relaxed transition-all hover:shadow-inner">
                                    <p className="text-5xl font-black mb-4 text-[#1f3c88] tracking-widest animate-in fade-in slide-in-from-top-4">{protocolPrefix}</p>
                                    <p className="text-3xl font-bold mb-3 text-[#1f3c88] opacity-90 tracking-tight">{protocolSub}</p>
                                    <p className="text-2xl font-bold text-slate-600 bg-white/50 py-2 block px-6 rounded-xl border border-slate-200">{protocolJudge}</p>
                                    <div className="flex justify-start gap-8 text-sm font-black mt-8 text-[#1f3c88]/50 uppercase tracking-tighter">
                                        <span className="flex items-center gap-2"><Clock className="w-3 h-3" /> {formattedDate} مـ</span>
                                        <span className="flex items-center gap-2"><History className="w-3 h-3" /> {hijriDate} هـ</span>
                                    </div>
                                </div>

                                <div className="pt-1 space-y-3 text-right">
                                    <label className="text-xs font-black text-slate-500 flex items-center justify-end gap-2 uppercase tracking-widest">
                                        تعديل اسم المدينة بعد عبارة المحكمة الابتدائية <MapPin className="w-3 h-3" />
                                    </label>
                                    <input
                                        value={courtCity}
                                        onChange={(e) => setCourtCity(e.target.value)}
                                        placeholder="أدخل اسم المدينة"
                                        className="w-full rounded-[1.25rem] bg-white border border-slate-200 px-5 py-4 text-right text-base font-black text-slate-700 outline-none focus:ring-4 focus:ring-[#1f3c88]/5 focus:border-[#1f3c88] transition-all"
                                    />
                                    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-4 text-right">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">المعرف القضائي المولد</div>
                                        <div className="mt-1 text-base font-black text-[#1f3c88]">{judgeCourtId || '—'}</div>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3 text-right">
                                    <label className="text-xs font-black text-slate-500 flex items-center justify-end gap-2 uppercase tracking-widest">
                                        إضافة ملاحظات قضائية <Eye className="w-3 h-3" />
                                    </label>
                                    <textarea 
                                        value={optionalNotes}
                                        onChange={(e) => setOptionalNotes(e.target.value)}
                                        placeholder="تضاف هنا أي ملاحظات تكميلية للرسم (اختياري)..."
                                        className="w-full h-32 p-6 rounded-[1.5rem] bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-[#1f3c88]/5 focus:border-[#1f3c88] outline-none text-slate-700 font-bold text-sm resize-none shadow-inner transition-all"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsSupportModalOpen(true)}
                                    className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-right text-sm font-black text-slate-700 transition-all hover:border-[#1f3c88] hover:bg-white"
                                >
                                    <span className="flex items-center justify-end gap-2">
                                        عرض المرفقات وملاحظات القاضي الأولى
                                        <Paperclip className="w-4 h-4 text-[#1f3c88]" />
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Chronology Section */}
                        <ChronologyViewer />
                    </div>

                    <div className="p-8 bg-slate-50 border-t flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Entropy</span>
                            <span className="text-[12px] font-mono font-bold text-[#1f3c88]">SECURED-SESSION-V2.1</span>
                         </div>
                         <div className="flex gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                         </div>
                    </div>
                </div>

                {/* 3️⃣ RIGHT PANEL: Multi-Unit Security Board */}
                <div className="w-[25%] flex flex-col bg-[#0F172A] text-white">
                    <div className="p-8 bg-black/20 border-b border-white/5 space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-xl">
                                <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-black text-white text-sm uppercase tracking-widest">غرفة الاعتماد القضائي</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter indent-10">Judicial Approval Module</p>
                    </div>

                    <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                        {/* Status Check List */}
                        <div className="space-y-3">
                            {[
                                { label: 'توقيع العدلين ظاهر بوضوح', checked: selectedDeed.hasFirstNotarySign && selectedDeed.hasSecondNotarySign },
                                { label: 'تطابق التضمين الرسمي', checked: selectedDeed.matchingTadmine },
                                { label: 'صحة بيانات التسجيل', checked: selectedDeed.registrationCorrect },
                                { label: 'جاهزية الرقم الوطني الموحد', checked: true },
                                { label: 'السجل لم يبلغ 500 رسم', checked: selectedDeed.registrySpaceLeft > 0 }
                            ].map((item, i) => (
                                <div 
                                    key={i} 
                                    className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                                        item.checked 
                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-100' 
                                        : 'bg-red-500/10 border-red-500/30 text-red-200'
                                    }`}
                                >
                                    <span className="text-sm font-bold">{item.label}</span>
                                    {item.checked ? <CheckCircle2 className="w-4 h-4 text-blue-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsSupportModalOpen(true)}
                            className="w-full rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-4 text-right transition-all hover:bg-blue-500/15"
                        >
                            <span className="flex items-center justify-between gap-3">
                                <span className="rounded-xl bg-white/10 px-3 py-1 text-[10px] font-black text-blue-200">
                                    {(selectedDeed.supportAttachments || []).length} مرفق
                                </span>
                                <span className="flex items-center gap-2 text-sm font-black text-blue-100">
                                    <Paperclip className="h-4 w-4 text-blue-300" />
                                    عرض المرفقات وملاحظات القاضي الأولى
                                </span>
                            </span>
                        </button>

                        {/* National Serial Generation */}
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <Scale className="w-3 h-3" /> جيل جديد من التوثيق
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">الرقم الوطني المولد للرسم</label>
                                <div className="text-3xl font-black text-blue-400 tracking-tighter">
                                    {selectedDeed.serialNumber}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                                بصمة رقمية فريدة مرتبطة بسنة التحرير ورقم السجل. لا يمكن تكراره وطنياً.
                            </p>
                        </div>

                        {/* Record Capacity Tracker */}
                        <div className="space-y-2">
                             <div className="flex justify-between items-end">
                                <span className="text-xs font-black text-slate-400 uppercase">سعة السجل الحالي</span>
                                <span className="text-xs font-mono text-slate-300">{(500 - selectedDeed.registrySpaceLeft)} / 500</span>
                             </div>
                             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000" 
                                    style={{ width: `${((500 - selectedDeed.registrySpaceLeft) / 500) * 100}%` }}
                                ></div>
                             </div>
                        </div>

                        <div className="space-y-4 border-t border-white/10 pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Monitor className="w-4 h-4 text-purple-500" />
                                    لوحة Wacom STU-540
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isWacomConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                                    <span className="text-[10px] font-black uppercase text-slate-500">{isWacomConnected ? 'Connected' : 'Offline'}</span>
                                </div>
                            </div>

                            {hardwareError && (
                                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-right text-sm font-black text-red-200">
                                    {hardwareError}
                                </div>
                            )}

                            <div className="bg-slate-950/80 rounded-2xl p-5 border border-white/10 space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black">
                                    <span className="text-slate-500 uppercase">Hardware Status</span>
                                    <span className={`px-2 py-0.5 rounded text-[8px] ${
                                        stuStatus === 'CONNECTED' ? 'bg-blue-500/20 text-blue-400' :
                                        stuStatus === 'CAPTURING' ? 'bg-amber-500/20 text-amber-500 animate-pulse' :
                                        stuStatus === 'SAVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                        'bg-slate-500/20 text-slate-400'
                                    }`}>
                                        {stuStatus}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black border-t border-white/5 pt-2">
                                    <span className="text-slate-500 uppercase">Device S/N</span>
                                    <span className="text-slate-100 font-mono tracking-wider">{tabletDeviceInfo.serial}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black border-t border-white/5 pt-2">
                                    <span className="text-slate-500 uppercase">DPI / Precision</span>
                                    <span className="text-blue-400 font-mono">{tabletDeviceInfo.resolution}</span>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative aspect-[4/2.5] bg-[#f8fafc] rounded-2xl border border-white/20 flex flex-col items-center justify-center p-0.5 overflow-hidden shadow-2xl">
                                    <canvas
                                        ref={judgeDeviceSigCanvasRef}
                                        width={800}
                                        height={480}
                                        className={`w-full h-full rounded-2xl bg-white ${stuStatus === 'CAPTURING' ? 'block' : 'hidden'}`}
                                    />
                                    {stuStatus !== 'CAPTURING' && (
                                        <div className="w-full h-full flex items-center justify-center relative bg-slate-900">
                                            {judgeSignature ? (
                                                <img src={judgeSignature} alt="Judge Signature Preview" className="max-h-[85%] object-contain" />
                                            ) : (
                                                <div className="flex flex-col items-center opacity-30">
                                                    <Cpu className="w-8 h-8 mb-2" />
                                                    <p className="text-[8px] font-black uppercase tracking-[0.2em]">Judge Signature Channel</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {stuStatus === 'CAPTURING' ? (
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => {
                                            setStuStatus('CONNECTED');
                                            clearJudgeDeviceSignatureCanvas();
                                        }}
                                        className="flex items-center justify-center gap-2 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-xl transition-all"
                                    >
                                        <span className="text-[10px] font-black">إلغاء</span>
                                    </button>
                                    <button
                                        onClick={handleClearSTU}
                                        className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-white/5"
                                    >
                                        <RefreshCcw className="w-4 h-4" />
                                        <span className="text-[10px] font-black">مسح</span>
                                    </button>
                                    <button
                                        onClick={() => void handleSaveJudgeDeviceSignature()}
                                        className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="text-[10px] font-black">حفظ التوقيع</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTabletSigningViewMode('full')}
                                            className={`rounded-xl border px-3 py-2 text-[11px] font-black transition-all ${
                                                tabletSigningViewMode === 'full'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            التوقيع فوق الصفحة الحالية
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTabletSigningViewMode('signing-zone')}
                                            className={`rounded-xl border px-3 py-2 text-[11px] font-black transition-all ${
                                                tabletSigningViewMode === 'signing-zone'
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            التوقيع فوق منطقة التوقيع
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void adjustTabletPreviewZoom(-0.12)}
                                            disabled={isSendingPreviewToTablet}
                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 transition-all hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                                        >
                                            تصغير على اللوحة
                                        </button>
                                        <div className="rounded-xl bg-slate-100 px-3 py-2 text-center text-[11px] font-black text-slate-700">
                                            {Math.round(tabletPreviewZoom * 100)}%
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void adjustTabletPreviewZoom(0.12)}
                                            disabled={isSendingPreviewToTablet}
                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 transition-all hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                                        >
                                            تكبير على اللوحة
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => void handleShowDocumentOnTablet()}
                                        disabled={isSendingPreviewToTablet}
                                        className="w-full flex items-center justify-center gap-3 py-3 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-200 disabled:text-slate-400 text-slate-800 rounded-2xl transition-all border border-slate-300"
                                    >
                                        <Monitor className={`w-4 h-4 ${isSendingPreviewToTablet ? 'animate-pulse' : ''}`} />
                                        <div className="text-right">
                                            <p className="text-sm font-black">عرض الصفحة الحالية على شاشة اللوحة</p>
                                            <p className="text-[10px] font-bold opacity-70">Preview current document page on STU-540</p>
                                        </div>
                                    </button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => void connectToSTUDevice()}
                                            className="w-full flex items-center justify-center gap-3 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all shadow-lg"
                                        >
                                            <Cpu className="w-4 h-4" />
                                            <span className="text-sm font-black">ربط اللوحة</span>
                                        </button>
                                        <button
                                            onClick={() => void handleJudgeCaptureStart()}
                                            disabled={!isWacomConnected || !hasStep2Completed}
                                            className="w-full flex items-center justify-center gap-3 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-2xl transition-all shadow-lg"
                                        >
                                            <Pen className="w-4 h-4" />
                                            <span className="text-sm font-black">توقيع القاضي على اللوحة</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    <div className="p-6 bg-slate-900 shadow-2xl space-y-4">
                        {courtStampNotice && (
                            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-right text-sm font-black text-blue-100">
                                {courtStampNotice}
                            </div>
                        )}
                        <div className="rounded-[2rem] border border-white/10 bg-white/5 px-4 py-5">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="text-right">
                                    <div className="text-sm font-black text-white">معاينة طابع المحكمة الجديد</div>
                                    <div className="text-[11px] font-bold text-slate-400">تصميم جديد بختم دائري وهوية قضائية أوضح.</div>
                                </div>
                                <Stamp className="h-5 w-5 text-blue-300" />
                            </div>
                            <div
                                className="mx-auto w-[210px] overflow-hidden rounded-[2rem] bg-white p-3 shadow-inner [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
                                dangerouslySetInnerHTML={{ __html: stampSvgMarkup }}
                            />
                        </div>
                        <button
                            type="button"
                            disabled={!selectedDeedId || !hasStep1Completed || isGeneratingCourtStamp}
                            onClick={handleGenerateJudgeCourtStamp}
                            className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all ${
                                !selectedDeedId || !hasStep1Completed || isGeneratingCourtStamp
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-[#1D4ED8] text-white shadow-xl hover:bg-[#2563eb] hover:-translate-y-0.5'
                            }`}
                        >
                            {isGeneratingCourtStamp ? (
                                <>
                                    <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>جاري توليد طابع المحكمة...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-lg">⚖️</span>
                                    <span>توليد طابع المحكمة</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            disabled={!selectedDeedId || revertCourtStampMutation.isPending}
                            onClick={handleRevertJudgeCourtStamp}
                            className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all ${
                                !selectedDeedId || revertCourtStampMutation.isPending
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-red-600 text-white shadow-xl hover:bg-red-500 hover:-translate-y-0.5'
                            }`}
                        >
                            {revertCourtStampMutation.isPending ? (
                                <>
                                    <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>جاري حذف الطابع...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-lg">↩️</span>
                                    <span>حذف طابع المحكمة</span>
                                </>
                            )}
                        </button>
                        <div className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-right">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-black text-emerald-100">المعرف القضائي المولد تلقائياً مع مراجع التضمين</span>
                                <span className="text-sm font-black text-emerald-300">{judgeCourtId || '—'}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsInclusionModalOpen(true)}
                            disabled={!selectedDeedId}
                            className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all ${
                                !selectedDeedId
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white shadow-xl hover:bg-blue-500 hover:-translate-y-0.5'
                            }`}
                        >
                            <span className="text-lg">📚</span>
                            <span>إدراج مراجع التضمين + توليد المعرف</span>
                        </button>
                        <button 
                            disabled={selectedDeed.status !== 'READY' || isStamping || !hasStep3Completed}
                            onClick={handleStampDeed}
                            className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all relative overflow-hidden group ${
                                selectedDeed.status === 'READY' && hasStep3Completed
                                ? 'bg-gradient-to-r from-[#002366] to-[#4B0082] text-white shadow-xl hover:-translate-y-1' 
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {isStamping ? (
                                <>
                                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>جاري اعتماد الخطاب...</span>
                                </>
                            ) : (
                                <>
                                    <Stamp className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                    <span>اعتماد الخطاب</span>
                                </>
                            )}
                            {/* Reflection effect */}
                            <div className="absolute inset-x-0 h-1/2 top-0 bg-white/10 -skew-y-12 translate-y-[-100%] group-hover:translate-y-[200%] transition-transform duration-700"></div>
                        </button>
                        
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-black uppercase tracking-widest px-2">
                            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> END-TO-END ENCRYPTED</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> SERVER-SYNC 3ms</span>
                        </div>
                    </div>
                </div>
            </div>

            {isInclusionModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsInclusionModalOpen(false)} />
                    <div className="relative w-full max-w-3xl rounded-[2rem] bg-white shadow-2xl border border-slate-200 overflow-hidden" dir="rtl">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">📘 إدراج مراجع تضمين الرسم بسجلات الشهادات العدلية</h3>
                                <p className="text-sm font-bold text-slate-500 mt-1">تُحفظ داخل قاعدة البيانات وتُدرج مباشرة في الشريط السفلي للرسم.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsInclusionModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black"
                            >
                                إغلاق
                            </button>
                        </div>

                        <div className="p-8 space-y-8 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
                            <section className="space-y-4">
                                <div className="text-sm font-black text-slate-700">اختر سجل التضمين</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { value: 'property', label: '🏠 سجل الأملاك' },
                                        { value: 'marriage', label: '💍 سجل الزواج' },
                                        { value: 'divorce', label: '📜 سجل الطلاق' },
                                        { value: 'inheritance', label: '⚖ سجل التركات' },
                                        { value: 'other', label: '📁 باقي الوثائق' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setRegistryType(option.value as any)}
                                            className={`rounded-2xl border px-4 py-4 text-sm font-black transition-all ${
                                                registryType === option.value
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700">📑 حرف السجل</label>
                                    <select
                                        value={registryLetter}
                                        onChange={(e) => setRegistryLetter(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500"
                                    >
                                        {['أ', 'ب', 'ث', 'ج', 'د', 'هـ', 'و'].map((letter) => (
                                            <option key={letter} value={letter}>{letter}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs font-bold text-amber-700">⚠️ تأكد من اختيار الحرف الصحيح المطابق للسجل المعتمد بالمحكمة.</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700">🔢 توليد رقم التضمين</label>
                                    <button
                                        type="button"
                                        onClick={handleGenerateInclusion}
                                        disabled={generateInclusionMutation.isPending}
                                        className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-white font-black hover:bg-blue-500 transition-colors disabled:opacity-60"
                                    >
                                        {generateInclusionMutation.isPending ? 'جاري التوليد...' : 'توليد رقم التضمين'}
                                    </button>
                                </div>
                            </section>

                            {generatedInclusion && (
                                <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 space-y-2">
                                    <div className="text-sm font-black text-blue-800">{generatedInclusion.descriptor}</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-600">📘 السجل</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={String(generatedInclusion.registerNumber)}
                                                className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 font-black text-slate-800 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-slate-700">عدد التضمين : {generatedInclusion.inclusionNumber}</div>
                                    <div className="text-sm font-bold text-slate-700">التاريخ الهجري : {generatedInclusion.hijriDate || '---'}</div>
                                    <div className="text-sm font-bold text-slate-700">التاريخ الميلادي : {generatedInclusion.gregorianDate}</div>
                                </section>
                            )}

                            {inclusionError && (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
                                    {inclusionError}
                                </div>
                            )}
                            {inclusionSuccess && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                                    {inclusionSuccess}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsInclusionModalOpen(false)}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-50"
                                >
                                    مراجعة البيانات
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveInclusionReference}
                                    disabled={saveInclusionMutation.isPending || embedFooterMutation.isPending}
                                    className="rounded-2xl bg-gradient-to-r from-violet-700 to-purple-600 px-6 py-3 text-white font-black hover:from-violet-600 hover:to-purple-500 disabled:opacity-60"
                                >
                                    {saveInclusionMutation.isPending || embedFooterMutation.isPending ? 'جاري الحفظ...' : '🔗 توليد مراجع التضمين'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isSupportModalOpen && selectedDeed && (
                <div className="fixed inset-0 z-[112] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsSupportModalOpen(false)} />
                    <div className="relative w-full max-w-4xl rounded-[2rem] bg-white shadow-2xl border border-slate-200 overflow-hidden" dir="rtl">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div className="text-right">
                                <h3 className="text-2xl font-black text-slate-900">مرفقات الإحالة وملاحظات القاضي الأولى</h3>
                                <p className="text-sm font-bold text-slate-500 mt-1">{selectedDeed.serialNumber}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSupportModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black"
                            >
                                إغلاق
                            </button>
                        </div>

                        <div className="grid gap-6 p-8 md:grid-cols-2 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
                            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                                <div className="mb-3 flex items-center justify-end gap-2 text-sm font-black text-slate-800">
                                    ملاحظات القاضي الأولى <MessageSquare className="w-4 h-4 text-violet-600" />
                                </div>
                                <div className="rounded-2xl bg-white px-4 py-4 text-right text-sm font-bold leading-7 text-slate-700 shadow-sm min-h-[180px]">
                                    {selectedDeed.judgeNotes || 'لا توجد ملاحظات محفوظة لهذا الرسم.'}
                                </div>
                            </section>

                            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                                <div className="mb-3 flex items-center justify-end gap-2 text-sm font-black text-slate-800">
                                    المرفقات الجانبية <Paperclip className="w-4 h-4 text-[#1f3c88]" />
                                </div>
                                <div className="space-y-3">
                                    {(selectedDeed.supportAttachments || []).length ? (
                                        (selectedDeed.supportAttachments || []).map((attachment, index) => (
                                            <div
                                                key={`${attachment.url}-${index}`}
                                                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
                                                    className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-700"
                                                >
                                                    <Eye className="ml-1 inline h-3.5 w-3.5" /> فتح
                                                </button>
                                                <div className="min-w-0 text-right">
                                                    <div className="truncate text-sm font-black text-slate-900">{attachment.name}</div>
                                                    <div className="mt-1 text-[11px] font-bold text-slate-400">
                                                        {attachment.category || 'مرفق'}{attachment.mimeType ? ` • ${attachment.mimeType}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-2xl bg-white px-4 py-4 text-right text-sm font-bold text-slate-500 shadow-sm">
                                            لا توجد مرفقات جانبية محفوظة لهذه الإحالة.
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setShowSuccessModal(false)}></div>
                    <div className="relative bg-white w-full max-w-xl rounded-[3rem] p-12 text-center shadow-2xl border border-slate-100 overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                        <div className="mb-8">
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-12 h-12 text-blue-600 animate-pulse" />
                            </div>
                            <h2 className="text-3xl font-black text-[#002366]">تم اعتماد الخطاب بنجاح!</h2>
                            <p className="text-slate-500 font-bold mt-4">تم إدراج الرسم في السجل الوطني وحفظه في الأرشيف السيادي الموحد.</p>
                        </div>
                        
                        <div className="bg-slate-50 rounded-3xl p-6 mb-8 text-right space-y-3 border border-slate-100">
                            <div className="flex justify-between">
                                <p className="font-['Amiri',_serif] text-xl font-black text-[#1f3c88] w-full text-center">{protocolPrefix}</p>
                            </div>
                            <div className="flex justify-center gap-4 text-xs font-bold text-[#1f3c88]/70">
                                <span>{formattedDate} م</span>
                                <span>{hijriDate} هـ</span>
                            </div>
                            <div className="h-px bg-slate-200 w-1/2 mx-auto"></div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold text-xs uppercase">الرقم الوطني النهائي</span>
                                <span className="text-[#002366] font-black">{selectedDeed.serialNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold text-xs uppercase">المعرف الرقمي للمخطوب</span>
                                <span className="font-mono text-xs font-bold text-slate-500">AUTH-STAMP-X8YZA-2026</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    setSelectedDeedId(null);
                                }}
                                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black hover:bg-slate-200 transition-colors"
                            >
                                إغلاق
                            </button>
                            <button className="flex-1 bg-[#002366] text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-900/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                                <Printer className="w-5 h-5" /> طباعة النسخة النهائية
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};
