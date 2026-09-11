import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle, 
  Download, 
  Share2,
  UserCheck, 
  Book, 
  Clipboard, 
  FileCheck, 
  MapPin, 
  Activity, 
  AlertTriangle, 
  Clock, 
  FileText, 
  MoreVertical, 
  XCircle, 
  Printer,
  Plus,
  Minus,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Save,
  Upload,
  FileDown,
  Edit3,
  AlertCircle,
  PlusCircle,
  Building,
  CreditCard as CreditCardIcon,
  Medal as AwardIcon,
  FileSignature,
  RotateCcw,
  History,
  Lock,
  CheckCircle2,
  PenTool,
  Scale,
  FileSearch,
  ShieldCheck,
  Users,
  Building2,
  Trash2,
  Settings,
  HeartPulse,
  ScrollText,
  LayoutGrid,
  FolderArchive,
  Loader2
} from 'lucide-react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import type { FeesAgentState } from '../FeesAgent';
import { generateDocxBlobFromTemplate } from '../../utils/docxTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { renderAsync } from 'docx-preview';
import { PDFDocument } from 'pdf-lib';
import { RasmDocxPreview } from '../../components/SmartDrafting/RasmDocxPreview';
import { WordPreview, type WordPreviewHandle } from '../../components/WordPreview';
import { OnlyOfficeEditor } from '../../components/OnlyOfficeEditor';
// @ts-ignore
import PizZip from 'pizzip';
import JSZip from 'jszip';
import { injectPlainTextIntoDocxZip } from '../../utils/docxTemplate';

import { PAGE_WIDTH, PAGE_HEIGHT, PAGE_GAP, getPages, stripHtmlToPlainText } from './utils/textParsers';
import { HighResViewer } from './components/HighResViewer';
import { SignatureConfirmationModal } from './modals/SignatureConfirmationModal';
import { PreSaveReviewModal } from './modals/PreSaveReviewModal';
import { SaveCategoryModal } from './modals/SaveCategoryModal';
import { DecisionModal } from './modals/DecisionModal';
import { ImageViewerModal } from './modals/ImageViewerModal';

export const AuditHubContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState('data');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionToken, user, notaryProfile } = useAuth();
  const trpcUtils = trpc.useContext();
  const params = new URLSearchParams(location.search);
  const rasmId = params.get('id') || params.get('rasmId');
  const shouldForceRefetch = params.get('refetch') === 'true' || Boolean(params.get('cb'));

  const [state, setState] = useState<FeesAgentState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark as requested
  const [selectedAttachmentTabDoc, setSelectedAttachmentTabDoc] = useState<any>(null);
  
  // Modals & Panels
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'correct' | 'reject' | null>(null);

  // Signature Transition State
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  // Pre-save review (before category selection)
  const [isPreSaveReviewModalOpen, setIsPreSaveReviewModalOpen] = useState(false);
  const [preSaveReviewIntent, setPreSaveReviewIntent] = useState<'save' | 'signing'>('save');
  const [saveCategoryIntent, setSaveCategoryIntent] = useState<'save' | 'signing'>('save');
  const [isSaveCategoryModalOpen, setIsSaveCategoryModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{ show: boolean; docId?: string }>({ show: false });
  const [sigChecks, setSigChecks] = useState({ 
    accuracy: false, 
    judgeNotes: false, 
    registration: false, 
    finality: false 
  });
  const [preSaveChecks, setPreSaveChecks] = useState({
    inclusionComplete: false,
    judgeNotesApplied: false,
    noJudgeNotes: false,
    registrationConfirmed: false,
    finalClosure: false,
  });
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isCategorySaving, setIsCategorySaving] = useState(false);

  const buildFinalReviewChecklist = useCallback(() => ({
    inclusionComplete: !!preSaveChecks.inclusionComplete,
    judgeNotesApplied: !!preSaveChecks.judgeNotesApplied,
    noJudgeNotes: !!preSaveChecks.noJudgeNotes,
    registrationConfirmed: !!preSaveChecks.registrationConfirmed,
    finalClosure: !!preSaveChecks.finalClosure,
    savedAt: new Date().toISOString(),
    source: 'audit_hub_pre_signing_review',
  }), [preSaveChecks]);

  // Get the current notary's primary court for auto-population
  const defaultCourt = notaryProfile?.primary_court || 'الرباط';

  // Property Units System
  const [propertyUnits, setPropertyUnits] = useState<any[]>([
    { 
        id: crypto.randomUUID(), 
        type: 'unregistered', 
        unregisteredData: { bookType: 'أملاك', bookNumber: '', count: '', page: '', date: '', authority: defaultCourt, notes: '' },
        registeredData: { deedNumber: '', issueDate: '', registryOffice: defaultCourt, applicationNumber: '', notes: '' }
    }
  ]);

  const addPropertyUnit = () => {
    setPropertyUnits([...propertyUnits, { 
        id: crypto.randomUUID(), 
        type: 'unregistered',
        unregisteredData: { bookType: 'أملاك', bookNumber: '', count: '', page: '', date: '', authority: defaultCourt, notes: '' },
        registeredData: { deedNumber: '', issueDate: '', registryOffice: defaultCourt, applicationNumber: '', notes: '' }
    }]);
  };

  const removePropertyUnit = (id: string) => {
    if (propertyUnits.length > 1) {
        setPropertyUnits(propertyUnits.filter(u => u.id !== id));
    }
  };

  const updatePropertyUnit = (id: string, field: string, value: any, subField?: string) => {
    setPropertyUnits(propertyUnits.map(u => {
      if (u.id === id) {
        if (subField) {
          return { ...u, [field]: { ...u[field], [subField]: value } };
        }
        return { ...u, [field]: value };
      }
      return u;
    }));
  };

  const [vaultModal, setVaultModal] = useState<{ isOpen: boolean; title: string; type: 'ids' | 'certificates' | 'none' }>({ isOpen: false, title: '', type: 'none' });
  const [selectedVaultDoc, setSelectedVaultDoc] = useState<any>(null);
  const [forcedViewerDocState, setForcedViewerDoc] = useState<any>(null);

  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const [primaryTextEditorOpen, setPrimaryTextEditorOpen] = useState(false);
  const [primaryBusy, setPrimaryBusy] = useState(false);
  const primaryDocBlobUrlRef = useRef<string | null>(null);
  const editedPlainTextGetterRef = useRef<null | (() => string)>(null);
  const preEditPlainTextRef = useRef<string>('');
  const preEditDocIdRef = useRef<string | null>(null);
  const [viewerDocRenderNonce, setViewerDocRenderNonce] = useState(0);
  const onlyOfficeBaselineRef = useRef<{ versionId: string | null; updatedAt: string | null }>({
    versionId: null,
    updatedAt: null,
  });

  const revokePrimaryDocBlobUrl = () => {
    if (primaryDocBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(primaryDocBlobUrlRef.current);
      } catch {}
      primaryDocBlobUrlRef.current = null;
    }
  };

  const base64ToBlobUrl = (base64: string, mime: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes as any], { type: mime });
    return URL.createObjectURL(blob);
  };

  // PDF text editor (white-out + overlay text)
  const [pdfFormEditorOpen, setPdfFormEditorOpen] = useState(false);
  const [pdfFormBusy, setPdfFormBusy] = useState(false);
  const [pdfFormError, setPdfFormError] = useState<string | null>(null);

  type PdfRedactionRect = { x: number; y: number; w: number; h: number };
  type PdfOverlayText = { x: number; y: number; text: string; size: number };
  type PdfTextEdits = { rects: PdfRedactionRect[]; texts: PdfOverlayText[] };

  const [pdfTextTool, setPdfTextTool] = useState<'redact' | 'text'>('redact');
  const [pdfTextInput, setPdfTextInput] = useState('');
  const [pdfTextFontSize, setPdfTextFontSize] = useState(14);
  const [pdfTextPageIndex, setPdfTextPageIndex] = useState(0);
  const [pdfTextPageSizes, setPdfTextPageSizes] = useState<Array<{ width: number; height: number }>>([]);
  const [pdfTextEditsByPage, setPdfTextEditsByPage] = useState<Record<number, PdfTextEdits>>({});

  const pdfOriginalDocRef = useRef<any>(null);
  const pdfOriginalBytesRef = useRef<ArrayBuffer | null>(null);

  const getDocEffectiveUrl = (doc: any): string => {
    return (
      doc?.remoteUrl ||
      doc?.remote_url ||
      doc?.url ||
      doc?.fileUrl ||
      doc?.file_url ||
      doc?.fileURL ||
      doc?.publicUrl ||
      doc?.public_url ||
      ''
    ).toString();
  };

  const stripHash = (url: string) => {
    const idx = url.indexOf('#');
    return idx === -1 ? url : url.slice(0, idx);
  };

  const buildPdfViewerUrl = (url: string, pageIndex: number) => {
    const base = stripHash(url);
    const page = Math.max(1, (pageIndex || 0) + 1);
    return `${base}#page=${page}&zoom=page-width`;
  };

  const isSelectedPdf = useMemo(() => {
    const d = selectedVaultDoc as any;
    if (!d) return false;
    const u = getDocEffectiveUrl(d).toLowerCase();
    const n = (d?.fileName || d?.file_name || d?.name || '').toString().toLowerCase();
    const t = (d?.mimeType || d?.mime_type || d?.type || '').toString().toLowerCase();
    return n.endsWith('.pdf') || u.includes('.pdf') || t.includes('application/pdf');
  }, [selectedVaultDoc]);

  const closePdfFormEditor = useCallback((opts?: { restoreSelection?: boolean }) => {
    const restoreSelection = opts?.restoreSelection !== false;
    setPdfFormEditorOpen(false);
    setPdfFormBusy(false);
    setPdfFormError(null);
    setPdfTextTool('redact');
    setPdfTextInput('');
    setPdfTextFontSize(14);
    setPdfTextPageIndex(0);
    setPdfTextPageSizes([]);
    setPdfTextEditsByPage({});
    pdfOriginalBytesRef.current = null;

    if (restoreSelection && pdfOriginalDocRef.current) {
      setSelectedVaultDoc(pdfOriginalDocRef.current);
    }

    pdfOriginalDocRef.current = null;
  }, []);

  const openPdfFormEditor = useCallback(async () => {
    if (!selectedVaultDoc || !isSelectedPdf) return;
    setPdfFormError(null);
    setPdfFormBusy(true);
    try {
      const url = stripHash(getDocEffectiveUrl(selectedVaultDoc));
      if (!url) throw new Error('PDF URL is missing');

      // snapshot current doc to revert
      pdfOriginalDocRef.current = selectedVaultDoc;

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load PDF (${resp.status})`);
      const bytes = await resp.arrayBuffer();
      pdfOriginalBytesRef.current = bytes;

      const pdfDoc = await PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();
      const sizes = pages.map((p) => {
        const s = p.getSize();
        return { width: s.width, height: s.height };
      });

      setPdfTextPageSizes(sizes);
      setPdfTextPageIndex(0);
      setPdfTextEditsByPage({});
      setPdfTextTool('redact');
      setPdfFormEditorOpen(true);

      // Force viewer to a stable view so overlay mapping is consistent.
      setSelectedVaultDoc((prev: any) => {
        const base = pdfOriginalDocRef.current || prev;
        const effective = stripHash(getDocEffectiveUrl(base));
        const nextUrl = buildPdfViewerUrl(effective, 0);
        return {
          ...(base || {}),
          fileUrl: nextUrl,
          url: nextUrl,
          mimeType: 'application/pdf',
          type: 'application/pdf',
        };
      });
    } catch (e: any) {
      setPdfFormError(e?.message || String(e));
      setPdfFormEditorOpen(true);
    } finally {
      setPdfFormBusy(false);
    }
  }, [isSelectedPdf, selectedVaultDoc]);

  useEffect(() => {
    if (!pdfFormEditorOpen) return;
    const base = pdfOriginalDocRef.current || selectedVaultDoc;
    if (!base) return;
    const effective = stripHash(getDocEffectiveUrl(base));
    if (!effective) return;
    setSelectedVaultDoc((prev: any) => {
      const nextUrl = buildPdfViewerUrl(effective, pdfTextPageIndex);
      return {
        ...(prev || {}),
        fileUrl: nextUrl,
        url: nextUrl,
      };
    });
  }, [pdfFormEditorOpen, pdfTextPageIndex, selectedVaultDoc]);

  const addPdfRedactionRect = useCallback((pageIndex: number, rect: PdfRedactionRect) => {
    setPdfTextEditsByPage((prev) => {
      const current = prev[pageIndex] || { rects: [], texts: [] };
      return {
        ...prev,
        [pageIndex]: {
          ...current,
          rects: [...current.rects, rect],
        },
      };
    });
  }, []);

  const addPdfOverlayText = useCallback((pageIndex: number, textItem: PdfOverlayText) => {
    setPdfTextEditsByPage((prev) => {
      const current = prev[pageIndex] || { rects: [], texts: [] };
      return {
        ...prev,
        [pageIndex]: {
          ...current,
          texts: [...current.texts, textItem],
        },
      };
    });
  }, []);

  const pdfHasAnyTextEdits = useMemo(() => {
    return Object.values(pdfTextEditsByPage).some(
      (e) => (e?.rects?.length || 0) > 0 || (e?.texts?.length || 0) > 0
    );
  }, [pdfTextEditsByPage]);

  // If user navigates away from PDF while editor is open, just clean up (don't restore selection).
  useEffect(() => {
    if (!pdfFormEditorOpen) return;
    if (isSelectedPdf) return;
    closePdfFormEditor({ restoreSelection: false });
  }, [closePdfFormEditor, isSelectedPdf, pdfFormEditorOpen]);
  
  // High-Res Viewer State
  const [viewerZoom, setViewerZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Section Collapse State
  const [isUnitsCollapsed, setIsUnitsCollapsed] = useState(true);
  const [isFinancialCollapsed, setIsFinancialCollapsed] = useState(true);

  // Availability State
  const [isUnitsAvailable, setIsUnitsAvailable] = useState(true);
  const [isFinancialAvailable, setIsFinancialAvailable] = useState(true);

  const initialFinalRecord = React.useMemo(() => ({
    serial: '2026/001',
    certificateType: 'مطابق للفئة المحددة',
    register: '',
    number: '',
    page: '',
    count: '',
    date: '2026-02-18',
    registrationDate: '',
    authority: defaultCourt,
    notes: '',
    firstPartyName: 'test',
    firstPartyId: '66676678',
    secondPartyName: '',
    secondPartyId: '',
    deedBook: 'أملاك العقارية',
    deedNumber: 'REF-9920-R',
    deedPage: '124',
    deedCount: '15',
    depositNumber: 'DEP-2026-9921',
    taxOrder: 'TAX-88201-9B',
    notaryName: '',
    optionalParties: [] as Array<{ id: string; name: string; nationalId: string }>,
  }), [defaultCourt]);

  const [finalRecord, setFinalRecord] = useState(initialFinalRecord);

  const [onlyOfficeOpen, setOnlyOfficeOpen] = useState(false);
  const [onlyOfficeDsUrl, setOnlyOfficeDsUrl] = useState<string | null>(null);
  const [onlyOfficeConfig, setOnlyOfficeConfig] = useState<Record<string, unknown> | null>(null);

  const updateRecord = (field: string, value: string) => {
    setFinalRecord(prev => ({ ...prev, [field]: value }));
  };

  const addOptionalParty = () => {
    setFinalRecord((prev: any) => ({
      ...prev,
      optionalParties: [
        ...(Array.isArray(prev.optionalParties) ? prev.optionalParties : []),
        { id: crypto.randomUUID(), name: '', nationalId: '' },
      ],
    }));
  };

  const updateOptionalParty = (partyId: string, field: 'name' | 'nationalId', value: string) => {
    setFinalRecord((prev: any) => ({
      ...prev,
      optionalParties: (Array.isArray(prev.optionalParties) ? prev.optionalParties : []).map((party: any) =>
        party.id === partyId ? { ...party, [field]: value } : party
      ),
    }));
  };

  const removeOptionalParty = (partyId: string) => {
    setFinalRecord((prev: any) => ({
      ...prev,
      optionalParties: (Array.isArray(prev.optionalParties) ? prev.optionalParties : []).filter((party: any) => party.id !== partyId),
    }));
  };

  useEffect(() => {
    if (!rasmId) return;
    // Always invalidate caches and reset local document state on rasmId change.
    // This prevents stale attachments / forced viewer docs from a previous rasm
    // from persisting when the user navigates to a different document.
    trpcUtils.feesAgent.documents.getSavedRasm.invalidate();
    (trpcUtils.feesAgent as any).getMyJudgeSubmission?.invalidate?.();
    (trpcUtils.feesAgent as any).getLatestApprovedJudgeSubmissionByFileNumber?.invalidate?.();
    setSelectedAttachmentTabDoc(null);
    setForcedViewerDoc(null);
  }, [rasmId]); // eslint-disable-line react-hooks/exhaustive-deps

  const rasmQuery = trpc.feesAgent.documents.getSavedRasm.useQuery(
    { sessionToken: sessionToken || '', id: rasmId || '' },
    { 
      enabled: !!sessionToken && !!rasmId,
      staleTime: 0,             // Always fetch fresh — never serve cached PDF stream
      refetchOnMount: 'always', // Force a network hit every time the component mounts
      // Mirror the hook: auto-poll every 1s while PDF is being compiled server-side.
      refetchInterval: (arg: any) => {
        const payloadObj = arg?.state?.data?.payload || arg?.data?.payload || arg?.payload;
        return payloadObj?.pdfCompilationReady === false ? 1000 : false;
      },
    }
  );

  const payload = (rasmQuery.data as any)?.payload as any;
  const judgeSubmissionId =
    params.get('judgeSubmissionId') ||
    payload?.judgeSubmissionId ||
    payload?.step7JudgeSubmissionId ||
    undefined;

  // pdfCompilationReady is injected by the backend into payload.
  //   false → deed is judge-approved, PDF still being compiled
  //   true  → PDF is ready (or deed is not judge-approved)
  //   undefined → legacy record (treat as ready to avoid false gates)
  const _pdfCompilationReadyRaw = (rasmQuery.data as any)?.pdfCompilationReady ?? payload?.pdfCompilationReady;
  const isAwaitingPdf: boolean =
    _pdfCompilationReadyRaw === false &&
    !!rasmId &&
    !rasmQuery.isLoading;

  const judgeSubmissionQuery = (trpc as any).feesAgent.getMyJudgeSubmission.useQuery(
    { sessionToken: sessionToken || '', submissionId: judgeSubmissionId || '' },
    { enabled: !!sessionToken && !!judgeSubmissionId, retry: 0 }
  );

  const fileNumberForJudgeLookup =
    params.get('fileNumber') ||
    ((rasmQuery.data as any)?.fileNumber as string | null | undefined) ||
    payload?.meta?.fileNumber ||
    payload?.fileNumber ||
    undefined;

  const latestApprovedByFileNumberQuery = (trpc as any).feesAgent.getLatestApprovedJudgeSubmissionByFileNumber.useQuery(
    { sessionToken: sessionToken || '', fileNumber: fileNumberForJudgeLookup || '' },
    { enabled: !!sessionToken && !!fileNumberForJudgeLookup, retry: 0 }
  );

  const judgeSubmissionById: any = judgeSubmissionQuery.data || null;
  const judgeSubmissionByFileNumber: any = latestApprovedByFileNumberQuery.data?.submission || null;

  const isApprovedJudgeStatus = (status: any) => {
    const s = (status || '').toString();
    return ['accepted', 'accepted_with_notes', 'substantive_notes'].includes(s);
  };

  // Align with Judge portal, but keep the current rasm-linked submission first.
  const approvedByFile = isApprovedJudgeStatus(judgeSubmissionByFileNumber?.status) ? judgeSubmissionByFileNumber : null;
  const effectiveJudgeSubmission: any =
    (judgeSubmissionId ? judgeSubmissionById : null) ||
    approvedByFile ||
    judgeSubmissionByFileNumber ||
    judgeSubmissionById ||
    null;

  const effectiveJudgePayload: any = effectiveJudgeSubmission?.payload || null;

  const isJudgeSubmissionsLoading =
    (Boolean(judgeSubmissionId) && judgeSubmissionQuery.isLoading) ||
    (Boolean(fileNumberForJudgeLookup) && latestApprovedByFileNumberQuery.isLoading);

  const isApprovedDeed =
    _pdfCompilationReadyRaw === false ||
    payload?.isJudgeApprovedDeed === true ||
    (rasmQuery.data as any)?.isJudgeApprovedDeed === true ||
    Boolean((rasmQuery.data as any)?.canonical_approved_pdf || payload?.canonical_approved_pdf || (rasmQuery.data as any)?.signed_pdf_url || payload?.signed_pdf_url) ||
    Boolean(
      Array.isArray((rasmQuery.data as any)?.attachments) &&
      (rasmQuery.data as any).attachments.some((a: any) =>
        ['judge_signed_pdf', 'judge_court_stamped_pdf', 'signed_pdf'].includes(String(a.category || '').toLowerCase())
      )
    ) ||
    isApprovedJudgeStatus(effectiveJudgeSubmission?.status) ||
    isApprovedJudgeStatus(payload?.judgeStatus) ||
    isApprovedJudgeStatus((rasmQuery.data as any)?.judgeStatus) ||
    Boolean(effectiveJudgeSubmission && isApprovedJudgeStatus(effectiveJudgeSubmission.decision));

  const judgeAttachmentDocs = useMemo(() => {
    if (!effectiveJudgePayload) return [] as any[];

    const normalizeToDoc = (att: any, fallbackCategory?: string) => {
      if (!att) return null;
      const base64 = att.base64;
      const type = att.type || att.mimeType || att.mime_type || 'application/octet-stream';
      const name = att.name || att.fileName || att.filename || att.file_name || 'attachment';

      const url =
        base64
          ? `data:${type};base64,${base64}`
          : (att.url || att.fileUrl || att.file_url || att.fileURL || att.publicUrl || att.public_url || null);
      if (!url) return null;

      const category = (att.category || fallbackCategory || 'supporting_doc').toString();
      const isManual = Boolean((att?.field || '').toString().includes('manualRasmFile')) ||
        Boolean((att?.category || '').toString().toLowerCase() === 'manual_rasm');
      const isPrimaryFlag = Boolean(att?.isJudgePrimary) || Boolean(att?.isPrimary);
      return {
        id: att.id || `judge-submission-attachment-${category}-${name}-${String(att.size || '')}`,
        category,
        fileName: name,
        name,
        fileUrl: url,
        url,
        mimeType: type,
        type,
        isJudgePrimary: isPrimaryFlag || isManual,
      };
    };

    const out: any[] = [];

    const extraCandidateFiles = [
      effectiveJudgePayload?.attachment,
      effectiveJudgePayload?.judgeAttachment,
      effectiveJudgePayload?.manualRasmFile,
      effectiveJudgePayload?.judgeAcceptedDoc,
      effectiveJudgePayload?.baseDoc,
      ...(Array.isArray(effectiveJudgePayload?.attachments) ? effectiveJudgePayload.attachments : []),
      ...(Array.isArray(effectiveJudgePayload?.files) ? effectiveJudgePayload.files : []),
      ...(Array.isArray(effectiveJudgePayload?.supportingDocuments) ? effectiveJudgePayload.supportingDocuments : []),
      ...(Array.isArray(effectiveJudgePayload?.id_cards) ? effectiveJudgePayload.id_cards : []),
      ...(Array.isArray(effectiveJudgePayload?.fiscal_receipts) ? effectiveJudgePayload.fiscal_receipts : []),
    ].filter(Boolean);

    for (const att of extraCandidateFiles) {
      const d = normalizeToDoc(att, att?.category || att?.field || 'supporting_doc');
      if (!d) continue;
      out.push(d);
    }

    // De-dupe by url/name
    const seen = new Set<string>();
    const deduped = out.filter((d) => {
      const key = `${d.url || ''}||${d.fileName || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Prefer Judge Portal primary (judge_attachment) first (typically PDF),
    // then DOCX, then other PDFs.
    deduped.sort((a, b) => {
      const ac = (a.category || '').toString().toLowerCase();
      const bc = (b.category || '').toString().toLowerCase();

      if (ac === 'judge_attachment' && bc !== 'judge_attachment') return -1;
      if (bc === 'judge_attachment' && ac !== 'judge_attachment') return 1;

      const an0 = (a.fileName || a.name || '').toString().toLowerCase();
      const bn0 = (b.fileName || b.name || '').toString().toLowerCase();
      const aIsWord0 = /\.(docx?|dotx?)($|\?)/i.test(an0);
      const bIsWord0 = /\.(docx?|dotx?)($|\?)/i.test(bn0);
      if (aIsWord0 && !bIsWord0) return -1;
      if (bIsWord0 && !aIsWord0) return 1;

      const aIsPdf = /\.(pdf)($|\?)/i.test(an0);
      const bIsPdf = /\.(pdf)($|\?)/i.test(bn0);
      if (aIsPdf && !bIsPdf) return -1;
      if (bIsPdf && !aIsPdf) return 1;
      return an0.localeCompare(bn0);
    });

    return deduped;
  }, [effectiveJudgePayload]);

  const judgeAttachmentDoc = judgeAttachmentDocs[0] || null;
  const judgeAcceptanceNotes = useMemo(() => {
    const fromSubmission = String((effectiveJudgeSubmission as any)?.judgeNotes || '').trim();
    if (fromSubmission) return fromSubmission;
    const fromPayload = String((effectiveJudgePayload as any)?.judgeSubmissionJudgeNotes || '').trim();
    return fromPayload || null;
  }, [effectiveJudgePayload, effectiveJudgeSubmission]);

  const isPdfLikeDoc = useCallback((doc: any) => {
    if (!doc) return false;
    const fileName = String(doc?.fileName || doc?.file_name || doc?.name || '').toLowerCase();
    const mime = String(doc?.mimeType || doc?.mime_type || doc?.type || '').toLowerCase();
    const url = String(
      doc?.url ||
      doc?.fileUrl ||
      doc?.file_url ||
      doc?.fileURL ||
      doc?.publicUrl ||
      doc?.public_url ||
      ''
    ).toLowerCase();
    return (
      fileName.endsWith('.pdf') ||
      mime.includes('application/pdf') ||
      mime.includes('pdf') ||
      url.includes('.pdf')
    );
  }, []);

  const isWordLikeDoc = useCallback((doc: any) => {
    if (!doc) return false;
    const fileName = String(doc?.fileName || doc?.file_name || doc?.name || '').toLowerCase();
    const mime = String(doc?.mimeType || doc?.mime_type || doc?.type || '').toLowerCase();
    const url = String(
      doc?.url ||
      doc?.fileUrl ||
      doc?.file_url ||
      doc?.fileURL ||
      doc?.publicUrl ||
      doc?.public_url ||
      ''
    ).toLowerCase();
    return (
      fileName.endsWith('.doc') ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.dotx') ||
      mime.includes('application/msword') ||
      mime.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
      url.includes('.doc') ||
      url.includes('.docx') ||
      url.includes('.dotx')
    );
  }, []);
  const judgeWordAttachmentDoc = useMemo(() => {
    return judgeAttachmentDocs.find((doc: any) => isWordLikeDoc(doc)) || null;
  }, [isWordLikeDoc, judgeAttachmentDocs]);

  const judgePrimaryDoc = useMemo(() => {
    const rasmData = rasmQuery.data as any;
    const rasmPayload = (rasmData?.payload as any) || {};

    // 0. Prioritize canonical approved / signed / primary PDF from saved_rasms table / rasmQuery.data
    const rasmPdfPreviewUrl =
      rasmData?.canonical_approved_pdf ||
      rasmData?.canonicalApprovedPdf ||
      rasmPayload?.canonical_approved_pdf ||
      rasmPayload?.canonicalApprovedPdf ||
      rasmData?.signed_pdf_url ||
      rasmData?.signedPdfUrl ||
      rasmPayload?.signed_pdf_url ||
      rasmPayload?.signedPdfUrl ||
      rasmData?.pdf_preview_url ||
      rasmData?.pdfPreviewUrl ||
      rasmPayload?.pdf_preview_url ||
      rasmPayload?.pdfPreviewUrl;

    if (rasmPdfPreviewUrl) {
      const u = String(rasmPdfPreviewUrl).trim();
      if (u) {
        return {
          id: `rasm-primary-pdf-${String(rasmData?.id || (effectiveJudgeSubmission as any)?.id || '')}`,
          category: 'audit_final_pdf',
          fileName: rasmData?.previewName || 'المحرر القضائي المعتمد.pdf',
          name: rasmData?.previewName || 'المحرر القضائي المعتمد.pdf',
          fileUrl: u,
          url: u,
          docxUrl: rasmData?.primary_docx_url || rasmData?.primaryDocxUrl || rasmPayload?.primary_docx_url || rasmPayload?.primaryDocxUrl || undefined,
          mimeType: 'application/pdf',
          type: 'application/pdf',
          isJudgePrimary: true,
        };
      }
    }

    // 1. Canonical compiled preview URL from submission record
    const canonicalPreviewUrl = String(
      (effectiveJudgeSubmission as any)?.previewUrl ||
      (effectiveJudgeSubmission as any)?.finalPdfUrl ||
      (effectiveJudgeSubmission as any)?.preview_url ||
      ''
    ).trim();

    if (canonicalPreviewUrl) {
      return {
        id: `judge-primary-preview-${String((effectiveJudgeSubmission as any)?.id || '')}`,
        category: 'judge_attachment',
        fileName:
          String((effectiveJudgeSubmission as any)?.previewName || 'المحرر القضائي المعتمد.pdf').trim() || 'المحرر القضائي المعتمد.pdf',
        name:
          String((effectiveJudgeSubmission as any)?.previewName || 'المحرر القضائي المعتمد.pdf').trim() || 'المحرر القضائي المعتمد.pdf',
        fileUrl: canonicalPreviewUrl,
        url: canonicalPreviewUrl,
        mimeType: String((effectiveJudgeSubmission as any)?.previewMimeType || 'application/pdf'),
        type: String((effectiveJudgeSubmission as any)?.previewMimeType || 'application/pdf'),
        isJudgePrimary: true,
      };
    }

    // 2. Compiled PDF from rasmQuery.data or payload pointers
    const candidatePdfUrls = [
      { url: rasmData?.previewUrl || rasmData?.preview_url, name: rasmData?.previewName || 'المحرر القضائي المعتمد.pdf' },
      { url: rasmData?.finalPdfUrl || rasmData?.final_pdf_url, name: 'المستند النهائي المعتمد.pdf' },
      { url: rasmData?.latestDraftPdfUrl, name: 'مسودة الرسم المعتمدة.pdf' },
      { url: rasmData?.latestSigningPdfUrl, name: 'مستند التوقيع المعتمد.pdf' },
      { url: (rasmData?.state as any)?.latestSigningPdfUrl || (rasmData?.state as any)?.previewUrl || (rasmData?.state as any)?.latestDraftPdfUrl, name: 'المحرر القضائي المعتمد.pdf' },
      { url: (rasmData?.payload as any)?.previewUrl || (rasmData?.payload as any)?.finalPdfUrl || (rasmData?.payload as any)?.latestDraftPdfUrl || (rasmData?.payload as any)?.latestSigningPdfUrl, name: 'المحرر القضائي المعتمد.pdf' },
      { url: (effectiveJudgePayload as any)?.previewUrl || (effectiveJudgePayload as any)?.finalPdfUrl || (effectiveJudgePayload as any)?.latestSigningPdfUrl || (effectiveJudgePayload as any)?.latestDraftPdfUrl, name: 'المحرر القضائي المعتمد.pdf' },
    ];

    for (const cand of candidatePdfUrls) {
      const u = String(cand.url || '').trim();
      if (u && (u.toLowerCase().endsWith('.pdf') || u.includes('.pdf') || u.startsWith('data:application/pdf') || u.startsWith('http') || u.startsWith('blob:'))) {
        return {
          id: `judge-primary-pdf-${String(rasmData?.id || (effectiveJudgeSubmission as any)?.id || '')}`,
          category: 'judge_attachment',
          fileName: cand.name,
          name: cand.name,
          fileUrl: u,
          url: u,
          mimeType: 'application/pdf',
          type: 'application/pdf',
          isJudgePrimary: true,
        };
      }
    }

    // 3. Prefer compiled PDF from judgeAttachmentDocs if available
    const compiledPdfFromAttachments = judgeAttachmentDocs.find((d: any) => isPdfLikeDoc(d));
    if (compiledPdfFromAttachments) {
      return {
        ...compiledPdfFromAttachments,
        isJudgePrimary: true,
      };
    }

    // 4. Prefer official binary DOCX attachment if available
    const compiledWordFromAttachments = judgeAttachmentDocs.find((d: any) => isWordLikeDoc(d));
    if (compiledWordFromAttachments) {
      return {
        ...compiledWordFromAttachments,
        isJudgePrimary: true,
        isWord: true,
      };
    }

    if (!effectiveJudgePayload) return null;

    const normalizeToDoc = (att: any, fallbackCategory?: string) => {
      if (!att) return null;
      const base64 = att.base64;
      const type = att.type || att.mimeType || att.mime_type || 'application/octet-stream';
      const name = att.name || att.fileName || att.filename || att.file_name || 'attachment';
      const url =
        base64
          ? `data:${type};base64,${base64}`
          : (att.url || att.fileUrl || att.file_url || att.fileURL || att.publicUrl || att.public_url || null);
      if (!url) return null;

      const category = (att.category || fallbackCategory || 'judge_attachment').toString();
      const isWord = isWordLikeDoc({ fileName: name, mimeType: type, url });
      return {
        id: `judge-primary-${category}-${name}-${String(att.size || '')}`,
        category,
        fileName: name,
        name,
        fileUrl: url,
        url,
        mimeType: type,
        type,
        isWord,
        isJudgePrimary: true,
      };
    };

    const list = Array.isArray(effectiveJudgePayload?.attachments) ? effectiveJudgePayload.attachments : [];
    const manual = list.find((a: any) => (a?.field || '').toString().includes('manualRasmFile'));
    const judgeCategory = list.find((a: any) => (a?.category || '').toString().toLowerCase() === 'judge_attachment' || (a?.category || '').toString().toLowerCase() === 'judge_attachment_docx');

    const primaryAttachment = manual || judgeCategory || null;
    const primaryAttachmentDoc = normalizeToDoc(primaryAttachment, primaryAttachment?.category);
    if (primaryAttachmentDoc) return primaryAttachmentDoc;

    const singleDoc = normalizeToDoc(effectiveJudgePayload?.attachment, 'judge_attachment');
    if (singleDoc) return singleDoc;

    // 5. Fallback to HTML or text draft ONLY if deed is not judge-approved
    const isApprovedSubmission =
      isApprovedJudgeStatus(effectiveJudgeSubmission?.status) ||
      (rasmQuery.data as any)?.payload?.pdfCompilationReady === false ||
      (rasmQuery.data as any)?.payload?.isJudgeApprovedDeed === true;

    if (isApprovedSubmission) {
      // Strictly prohibit draft/HTML fallback for approved deeds — must wait for compiled PDF
      return null;
    }

    if (effectiveJudgePayload?.rasmHtml) {
      return {
        id: 'judge-smart-rasm',
        fileName: 'المحرر القضائي (المعتمد)',
        rasmHtml: effectiveJudgePayload.rasmHtml,
        rawContent: effectiveJudgePayload.rasmHtml,
        isSmartDraft: true,
        isJudgePrimary: true,
      };
    }

    if (effectiveJudgePayload?.draft) {
      return {
        id: 'judge-draft-doc',
        fileName: 'مسودة القاضي',
        isDraft: true,
        content: effectiveJudgePayload.draft,
        rawContent: effectiveJudgePayload.draft,
        isJudgePrimary: true,
      };
    }

    return null;
  }, [effectiveJudgePayload, effectiveJudgeSubmission, isPdfLikeDoc, isWordLikeDoc, judgeAttachmentDocs, rasmQuery.data]);

  const attachmentTabDocs = useMemo(() => {
    const normalizeSavedAttachment = (att: any) => {
      if (!att) return null;
      const fileName =
        (att.fileName || att.file_name || att.name || att.filename || 'attachment').toString();
      const mimeType =
        (att.type || att.mimeType || att.mime_type || 'application/octet-stream').toString();
      const url =
        (att.url || att.fileUrl || att.file_url || att.fileURL || att.publicUrl || att.public_url || null) as
          | string
          | null;
      if (!url) return null;
      return {
        ...att,
        fileName,
        name: att.name || fileName,
        mimeType: att.mimeType || att.mime_type || att.type || mimeType,
        type: att.type || att.mime_type || att.mimeType || mimeType,
        fileUrl: att.fileUrl || att.file_url || att.url || url,
        url: att.url || att.fileUrl || att.file_url || url,
      };
    };

    const rawSaved = Array.isArray((rasmQuery.data as any)?.attachments) ? (rasmQuery.data as any).attachments : [];
    const savedDocs = rawSaved
      .map(normalizeSavedAttachment)
      .filter(Boolean)
      .filter((att: any) => {
        const category = String(att?.category || '').toLowerCase();
        return !category.startsWith('audit_');
      });

    const primaryUrl = String(judgePrimaryDoc?.url || judgePrimaryDoc?.fileUrl || '').trim();
    const primaryName = String(judgePrimaryDoc?.fileName || judgePrimaryDoc?.name || '').trim().toLowerCase();

    const merged = [...judgeAttachmentDocs, ...savedDocs];
    const seen = new Set<string>();
    return merged.filter((doc: any) => {
      const category = String(doc?.category || '').toLowerCase();
      const url = String(doc?.url || doc?.fileUrl || '').trim();
      const fileName = String(doc?.fileName || doc?.name || '').trim().toLowerCase();

      // Filter out only if it's the primary deed itself or an internal audit edit artifact
      if (primaryUrl && url === primaryUrl) return false;
      if (primaryName && fileName === primaryName && (category === 'primary_attachment' || category === 'deed' || category === 'rasm')) return false;
      if (category.startsWith('audit_')) return false;
      if (Boolean(doc?.isJudgePrimary) && (category === 'primary_attachment' || category === 'deed' || category === 'rasm')) return false;

      const key = `${url}||${fileName}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [judgeAttachmentDocs, judgePrimaryDoc, (rasmQuery.data as any)?.attachments]);

  useEffect(() => {
    if (activeTab !== 'attachments') return;
    if (!attachmentTabDocs.length) {
      setSelectedAttachmentTabDoc(null);
      return;
    }

    setSelectedAttachmentTabDoc((prev: any) => {
      if (!prev) return attachmentTabDocs[0];
      const prevKey = `${String(prev?.url || prev?.fileUrl || '').trim()}||${String(prev?.fileName || prev?.name || '').trim()}`;
      const stillExists = attachmentTabDocs.find((doc: any) => {
        const nextKey = `${String(doc?.url || doc?.fileUrl || '').trim()}||${String(doc?.fileName || doc?.name || '').trim()}`;
        return nextKey === prevKey;
      });
      return stillExists || attachmentTabDocs[0];
    });
  }, [activeTab, attachmentTabDocs]);

  // --- Dynamic Validation Engine ---
  const validations = useMemo(() => {
    const list = [];
    
    // 1. Parties Identity
    const partiesComplete = state?.sellers?.every(s => s.idNumber && s.idNumber !== '---' && s.idNumber.length > 3);
    list.push({ 
        label: 'اكتمال بيانات الأطراف (الرقم الوطني)', 
        status: partiesComplete ? 'success' : 'error',
        msg: partiesComplete ? 'تم التحقق من الوثائق الثبوتية' : 'يرجى إدخال أرقام الهوية الوطنية لجميع الأطراف'
    });

    // 2. Property Units Validation
    const unitsValid = !isUnitsAvailable || propertyUnits.every(unit => {
        if (unit.type === 'unregistered') {
            return unit.unregisteredData.bookType && unit.unregisteredData.page && unit.unregisteredData.count;
        } else {
            return unit.registeredData.deedNumber && unit.registeredData.deedNumber.length > 3;
        }
    });

    list.push({
        label: 'بيانات العقارات / السندات المرجعية',
        status: unitsValid ? 'success' : 'error',
        msg: !isUnitsAvailable ? 'تم وضع الحالة على "غير متوفر"' : (unitsValid ? 'جميع الحقول الإلزامية مكتملة' : 'هناك حقول فارغة في أحد العقارات المضافة (رقم الرسم أو بيانات التضمين)')
    });

    // 3. Duplicate Detection (Internal to current form)
    const unitStrings = isUnitsAvailable ? propertyUnits.filter(u => 
        (u.type === 'unregistered' && u.unregisteredData.count) || 
        (u.type === 'registered' && u.registeredData.deedNumber)
    ).map(u => 
        u.type === 'unregistered' 
            ? `UNREG-${u.city}-${u.unregisteredData.bookType}-${u.unregisteredData.page}-${u.unregisteredData.count}`
            : `REG-${u.registeredData.deedNumber}`
    ) : [];
    const hasDuplicates = isUnitsAvailable && unitStrings.length > 0 && new Set(unitStrings).size !== unitStrings.length;

    list.push({
        label: 'منع التكرار (رقم الرسم / السند)',
        status: hasDuplicates ? 'error' : 'success',
        msg: !isUnitsAvailable ? 'لا ينطبق (غير متوفر)' : (hasDuplicates ? 'خطأ: تم إدخال نفس العقار أكثر من مرة في هذه المعاملة' : 'لا يوجد تكرار في السندات المدخلة')
    });

    // New 3b: Financial Data Validation
    const financialValid = !isFinancialAvailable || (finalRecord.taxOrder && finalRecord.taxOrder.length > 2);
    list.push({
        label: 'التحقق من البيانات المالية',
        status: financialValid ? 'success' : 'error',
        msg: !isFinancialAvailable ? 'تم وضع الحالة على "غير متوفر"' : (financialValid ? 'البيانات المالية مكتملة' : 'يرجى إدخال رقم أمر المطالبة')
    });

    // 4. Notary Signature / Data
    const notaryValid = (finalRecord as any).judgeName && (finalRecord as any).judgeName.length > 5;
    list.push({
        label: 'بيانات العدل(ة) والختم الرقمي',
        status: notaryValid ? 'success' : 'warning',
        msg: notaryValid ? 'توقيع العدل(ة) معتمد' : 'يرجى التأكد من اسم العدل(ة) الكامل'
    });

    // 5. Attachments
    const hasAttachments = ((rasmQuery.data as any)?.attachments?.length || 0) > 0;
    list.push({
        label: 'المرفقات الرقمية الأصلية',
        status: hasAttachments ? 'success' : 'error',
        msg: hasAttachments ? 'تم العثور على النسخة الضوئية للرسم' : 'عنصر مفقود: لا يمكن التضمين بدون صورة السند الأصلي'
    });

    return list;
  }, [state, propertyUnits, rasmQuery.data, (finalRecord as any).judgeName, isUnitsAvailable, isFinancialAvailable, finalRecord.taxOrder]);

  const stats = useMemo(() => {
    const unitsSectionComplete =
      !isUnitsAvailable ||
      propertyUnits.every((unit: any) =>
        unit.type === 'unregistered'
          ? !!(unit.unregisteredData?.bookNumber && unit.unregisteredData?.count && unit.unregisteredData?.page)
          : !!(unit.registeredData?.deedNumber && unit.registeredData?.issueDate)
      );

    const financialSectionComplete =
      !isFinancialAvailable ||
      (!!(finalRecord.taxOrder && finalRecord.taxOrder.length > 2) &&
        String(finalRecord.taxOrder || '').trim() !== String(initialFinalRecord.taxOrder || '').trim());

    const trackedEntries = [
      { current: finalRecord.register, weight: 1 },
      { current: finalRecord.page, weight: 1 },
      { current: finalRecord.count, weight: 1 },
      { current: finalRecord.registrationDate, weight: 1 },
      { current: finalRecord.firstPartyName, weight: 1 },
      { current: finalRecord.firstPartyId, weight: 1 },
      { current: finalRecord.secondPartyName, weight: 1 },
      { current: finalRecord.secondPartyId, weight: 1 },
      { current: unitsSectionComplete ? 'complete' : '', initial: '', weight: 4 },
      { current: financialSectionComplete ? 'complete' : '', initial: '', weight: 2 },
    ];

    const filledCount = trackedEntries.reduce((sum, entry) => {
      const current = String(entry.current || '').trim();
      const initial = String((entry as any).initial || '').trim();
      const isFilled = current.length > 0 && (initial ? current !== initial : true);
      return sum + (isFilled ? entry.weight : 0);
    }, 0);

    const totalTrackedFields = trackedEntries.reduce((sum, entry) => sum + entry.weight, 0);
    const baseFillRatio = totalTrackedFields > 0 ? Math.round((filledCount / totalTrackedFields) * 100) : 0;
    const judgeFieldCompleted = !!String((finalRecord as any).judgeName || '').trim();
    const fillRatio = judgeFieldCompleted ? 100 : Math.min(baseFillRatio, 93);

    let qualityLabel = 'بداية';
    let qualityColor = 'text-slate-500';
    if (fillRatio >= 1 && fillRatio < 35) {
      qualityLabel = 'قيد التعبئة';
      qualityColor = 'text-red-500';
    } else if (fillRatio < 65) {
      qualityLabel = 'تقدم متوسط';
      qualityColor = 'text-amber-500';
    } else if (fillRatio < 100) {
      qualityLabel = 'قارب الاكتمال';
      qualityColor = 'text-blue-500';
    } else if (fillRatio >= 100) {
      qualityLabel = 'مكتمل';
      qualityColor = 'text-emerald-500';
    }

    const displayFees = (rasmQuery.data as any)?.totalAmount || (rasmQuery.data as any)?.amount || 124;

    return {
      fillRatio,
      qualityLabel,
      qualityColor,
      displayFees,
      filledCount: judgeFieldCompleted ? totalTrackedFields : filledCount,
      totalTrackedFields,
    };
  }, [finalRecord, isUnitsAvailable, isFinancialAvailable, propertyUnits, rasmQuery.data]);

  const finalizeMutation = (trpc as any).feesAgent.documents.finalizeAudit.useMutation();
  const addPrimaryAttachmentMutation = (trpc as any).feesAgent.documents.addSavedRasmAttachment.useMutation();
  const updateSavedRasmMutation = (trpc as any).feesAgent.documents.updateSavedRasm.useMutation();
  const createSavedRasmMutation = (trpc as any).feesAgent.documents.createSavedRasm.useMutation();
  const deleteSavedRasmMutation = (trpc as any).feesAgent.documents.deleteSavedRasm.useMutation();
  const revertLatestSavedRasmEditMutation = (trpc as any).feesAgent.documents.revertLatestSavedRasmEdit.useMutation();
  const generateDocxMutation = trpc.smartDrafting.generateDocxFromText.useMutation();

  const savePatchDraftMutation = (trpc as any).feesAgent.documents.savePatchDraft.useMutation();
  const finalizeForSigningMutation = (trpc as any).feesAgent.documents.finalizeForSigning.useMutation();
  const prepareSigningPortalDocumentMutation = (trpc as any).feesAgent.documents.prepareSigningPortalDocument.useMutation();
  const getOnlyOfficeConfigMutation = (trpc as any).feesAgent.documents.getOnlyOfficeConfig.useMutation();
  const forceOnlyOfficeSaveMutation = (trpc as any).feesAgent.documents.forceOnlyOfficeSave.useMutation();

  const [latestAuditVersionId, setLatestAuditVersionId] = useState<string | null>(null);
  const [latestSavedDocsPointerUpdatedAt, setLatestSavedDocsPointerUpdatedAt] = useState<string | null>(null);

type ActiveDocVersion = 'base' | 'edited';
type OnlyOfficePaneStatus = 'idle' | 'loading-config' | 'loading-editor' | 'ready' | 'error';
  const [activeDocVersion, setActiveDocVersion] = useState<ActiveDocVersion>('base');
  const [activeEditedArtifact, setActiveEditedArtifact] = useState<null | {
    versionId: string;
    url: string;
    pdfUrl?: string | null;
    kind: 'pdf' | 'docx';
  }>(null);
  const [onlyOfficeMode, setOnlyOfficeMode] = useState<'overlay' | 'embedded'>('overlay');
  const [onlyOfficePaneStatus, setOnlyOfficePaneStatus] = useState<OnlyOfficePaneStatus>('idle');
  const [onlyOfficeError, setOnlyOfficeError] = useState<string | null>(null);
  const [onlyOfficeLoadStartedAt, setOnlyOfficeLoadStartedAt] = useState<number | null>(null);
  const [onlyOfficeRenderNonce, setOnlyOfficeRenderNonce] = useState(0);
  const [signingTransition, setSigningTransition] = useState<{ active: boolean; progress: number; message: string }>({
    active: false,
    progress: 0,
    message: '',
  });
  const [signingTransitionStartedAt, setSigningTransitionStartedAt] = useState<number | null>(null);
  const [signingTransitionTick, setSigningTransitionTick] = useState(0);

  useEffect(() => {
    if (!signingTransition.active) {
      setSigningTransitionStartedAt(null);
      setSigningTransitionTick(0);
      return;
    }

    setSigningTransitionStartedAt((prev) => prev ?? Date.now());
    const interval = window.setInterval(() => {
      setSigningTransitionTick((prev) => prev + 1);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [signingTransition.active]);

  const signingTransitionUi = useMemo(() => {
    const elapsedMs = signingTransitionStartedAt ? Math.max(0, Date.now() - signingTransitionStartedAt) : 0;
    const elapsedSec = elapsedMs / 1000;
    const phase =
      signingTransition.progress >= 100
        ? 'handoff'
        : elapsedSec < 2
          ? 'start'
          : 'saving';

    const rotatingMessages = [
      'جاري حفظ الرسم المضمن...',
      'يتم تأمين البيانات...',
      'المرجو الانتظار، العملية جارية...',
    ];
    const rotatingIndex = signingTransitionTick % rotatingMessages.length;

    const stageTitle =
      phase === 'handoff'
        ? 'جاري تحويل الرسم إلى توقيع العدلين...'
        : phase === 'start'
          ? 'جاري تحريك الرسم نحو مرحلة الحفظ...'
          : rotatingMessages[rotatingIndex];

    const detailText =
      phase === 'handoff'
        ? 'تم تأكيد الحفظ، ويجري فتح مساحة التوقيع الآن.'
        : signingTransition.message || 'جاري تنفيذ المرحلة الحالية...';

    const docPosition =
      phase === 'handoff'
        ? 78
        : phase === 'start'
          ? 20
          : 42;

    const glowAtSave = phase !== 'handoff';
    const penGlow = phase === 'handoff';
    const lineFill = phase === 'handoff' ? 100 : phase === 'start' ? 36 : 62;

    return {
      elapsedMs,
      elapsedSec,
      phase,
      stageTitle,
      detailText,
      docPosition,
      glowAtSave,
      penGlow,
      lineFill,
      isLongWait: elapsedSec >= 5,
    };
  }, [signingTransition.active, signingTransition.message, signingTransition.progress, signingTransitionStartedAt, signingTransitionTick]);
  const onlyOfficeAutoLoadKeyRef = useRef<string | null>(null);
  const onlyOfficeRequestSeqRef = useRef(0);
  const onlyOfficeEmbeddedRetryRef = useRef(0);

  type ActiveViewMode = 'preview' | 'onlyoffice';
  const [activeViewMode, setActiveViewMode] = useState<ActiveViewMode>('preview');
  const [isImportingDocx, setIsImportingDocx] = useState(false);
  const docxImportInputRef = useRef<HTMLInputElement>(null);

  const [isAuditHubEditMode, setIsAuditHubEditMode] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);

  const currentDraftText = useMemo(() => {
    const raw =
      (state as any)?.draft ||
      (rasmQuery.data as any)?.draft ||
      ((rasmQuery.data as any)?.payload as any)?.draft ||
      ((rasmQuery.data as any)?.payload as any)?.rasmHtml ||
      (state as any)?.rasmHtml ||
      (selectedVaultDoc as any)?.content ||
      (selectedVaultDoc as any)?.rawContent ||
      (judgePrimaryDoc as any)?.rawContent ||
      '';
    if (typeof raw === 'string' && raw.includes('<') && raw.includes('>')) {
      return stripHtmlToPlainText(raw);
    }
    return String(raw || '').trim();
  }, [judgePrimaryDoc, rasmQuery.data, selectedVaultDoc, state]);

  // Resolve the highest priority PDF stream URL
  const activePdfUrl = useMemo(() => {
    const fromUrl = params.get('pdfUrl');
    if (fromUrl && fromUrl.trim()) {
      return fromUrl.trim();
    }

    const rasmData = rasmQuery.data as any;
    const rasmPayload = (rasmData?.payload as any) || {};
    const ejSub = effectiveJudgeSubmission as any;
    const ejPayload = (effectiveJudgePayload as any) || (ejSub?.payload as any) || {};

    // 1. Direct PDF attributes on saved_rasms record or payload
    const fromRasm =
      rasmData?.canonical_approved_pdf ||
      rasmData?.canonicalApprovedPdf ||
      rasmData?.signed_pdf_url ||
      rasmData?.signedPdfUrl ||
      rasmData?.pdf_preview_url ||
      rasmData?.pdfPreviewUrl ||
      rasmPayload?.canonical_approved_pdf ||
      rasmPayload?.canonicalApprovedPdf ||
      rasmPayload?.signed_pdf_url ||
      rasmPayload?.signedPdfUrl ||
      rasmPayload?.pdf_preview_url ||
      rasmPayload?.pdfPreviewUrl ||
      rasmData?.finalPdfUrl ||
      rasmData?.previewUrl ||
      rasmPayload?.previewUrl ||
      rasmPayload?.finalPdfUrl ||
      rasmPayload?.attachment?.pdfUrl ||
      (rasmPayload?.attachment?.url && String(rasmPayload.attachment.url).includes('.pdf') ? rasmPayload.attachment.url : null) ||
      (rasmPayload?.attachment?.fileUrl && String(rasmPayload.attachment.fileUrl).includes('.pdf') ? rasmPayload.attachment.fileUrl : null) ||
      (rasmPayload?.step7JudgeAttachment?.url && String(rasmPayload.step7JudgeAttachment.url).includes('.pdf') ? rasmPayload.step7JudgeAttachment.url : null) ||
      (rasmPayload?.judgeAttachment?.url && String(rasmPayload.judgeAttachment.url).includes('.pdf') ? rasmPayload.judgeAttachment.url : null) ||
      (rasmPayload?.manualRasmFile?.url && String(rasmPayload.manualRasmFile.url).includes('.pdf') ? rasmPayload.manualRasmFile.url : null);

    if (fromRasm) {
      const u = String(fromRasm).trim();
      if (u) return u;
    }

    // 2. Direct PDF attributes on judge submission payload or root
    const fromJudge =
      ejPayload?.canonical_approved_pdf ||
      ejPayload?.canonicalApprovedPdf ||
      ejPayload?.signed_pdf_url ||
      ejPayload?.signedPdfUrl ||
      ejPayload?.pdf_preview_url ||
      ejPayload?.pdfPreviewUrl ||
      ejPayload?.previewUrl ||
      ejPayload?.finalPdfUrl ||
      ejPayload?.attachment?.pdfUrl ||
      (ejPayload?.attachment?.url && String(ejPayload.attachment.url).includes('.pdf') ? ejPayload.attachment.url : null) ||
      (ejPayload?.attachment?.fileUrl && String(ejPayload.attachment.fileUrl).includes('.pdf') ? ejPayload.attachment.fileUrl : null) ||
      (ejPayload?.judgeAttachment?.url && String(ejPayload.judgeAttachment.url).includes('.pdf') ? ejPayload.judgeAttachment.url : null) ||
      (ejPayload?.judgeAttachment?.fileUrl && String(ejPayload.judgeAttachment.fileUrl).includes('.pdf') ? ejPayload.judgeAttachment.fileUrl : null) ||
      (ejPayload?.manualRasmFile?.url && String(ejPayload.manualRasmFile.url).includes('.pdf') ? ejPayload.manualRasmFile.url : null) ||
      (ejPayload?.baseDoc?.url && String(ejPayload.baseDoc.url).includes('.pdf') ? ejPayload.baseDoc.url : null) ||
      ejPayload?.judgeCourtStamp?.url ||
      ejPayload?.judgeCourtStampedDoc?.url ||
      ejPayload?.judgeSignedDoc?.url ||
      ejSub?.signedPdfUrl ||
      ejSub?.pdfPreviewUrl ||
      ejSub?.previewUrl ||
      ejSub?.finalPdfUrl;

    if (fromJudge) {
      const u = String(fromJudge).trim();
      if (u) return u;
    }

    // 3. Check attachments on saved_rasm with strict priority ordering
    const rasmAtts = Array.isArray(rasmData?.attachments) ? rasmData.attachments : [];
    const attPriority: Record<string, number> = {
      judge_signed_pdf: 5,
      judge_court_stamped_pdf: 4,
      signed_pdf: 3,
      audit_final_pdf: 2,
      judge_attachment: 1,
    };
    const pdfAtts = rasmAtts.filter((a: any) => {
      const u = String(a.url || a.fileUrl || a.file_url || '').toLowerCase();
      const m = String(a.mimeType || a.mime_type || a.type || '').toLowerCase();
      const n = String(a.fileName || a.file_name || a.name || '').toLowerCase();
      return n.endsWith('.pdf') || u.includes('.pdf') || m.includes('pdf');
    });
    if (pdfAtts.length > 0) {
      const bestAtt = pdfAtts.reduce((prev: any, curr: any) => {
        const pPrev = attPriority[String(prev.category || '').toLowerCase()] || 0;
        const pCurr = attPriority[String(curr.category || '').toLowerCase()] || 0;
        return pCurr > pPrev ? curr : prev;
      });
      const u = String(bestAtt?.url || bestAtt?.fileUrl || bestAtt?.file_url || '').trim();
      if (u) return u;
    }

    // 4. Primary judge doc if PDF
    if (judgePrimaryDoc?.url && isPdfLikeDoc(judgePrimaryDoc)) {
      return String(judgePrimaryDoc.url).trim();
    }

    // 5. Any PDF in judgeAttachmentDocs
    const foundJudgeAttPdf = (judgeAttachmentDocs || []).find((d: any) => isPdfLikeDoc(d));
    if (foundJudgeAttPdf?.url) {
      return String(foundJudgeAttPdf.url).trim();
    }

    return null;
  }, [effectiveJudgePayload, effectiveJudgeSubmission, isPdfLikeDoc, judgeAttachmentDocs, judgePrimaryDoc, rasmQuery.data]);

  const isAwaitingPdfResolved =
    Boolean(
      _pdfCompilationReadyRaw === false ||
      (isApprovedDeed && !activePdfUrl && (_pdfCompilationReadyRaw === false || isJudgeSubmissionsLoading))
    ) &&
    !!rasmId &&
    !rasmQuery.isLoading;

  // Direct Stream Derivation: on every render tick, derive canonical approved PDF from rasmQuery.data
  const canonicalApprovedPdfDoc = useMemo(() => {
    if (!activePdfUrl) return null;
    return {
      id: `canonical-approved-pdf-${String((rasmQuery.data as any)?.id || rasmId || 'active')}`,
      category: 'audit_final_pdf',
      fileName: (rasmQuery.data as any)?.previewName || 'المحرر القضائي المعتمد.pdf',
      name: (rasmQuery.data as any)?.previewName || 'المحرر القضائي المعتمد.pdf',
      fileUrl: activePdfUrl,
      url: activePdfUrl,
      mimeType: 'application/pdf',
      type: 'application/pdf',
      isJudgePrimary: true,
    };
  }, [activePdfUrl, rasmId, rasmQuery.data]);

  const forcedViewerDoc = useMemo(() => {
    // Strict Renderer Routing: If approved deed is awaiting compiled PDF, strictly prohibit draft fallbacks
    if (isAwaitingPdfResolved) return null;

    if ((activeDocVersion as any) === 'edited') {
      return forcedViewerDocState || selectedVaultDoc;
    }

    // Direct Stream Derivation: on every render tick, if canonical approved PDF exists, derive directly
    if (canonicalApprovedPdfDoc) {
      return canonicalApprovedPdfDoc;
    }

    if (forcedViewerDocState) {
      if (isApprovedDeed && (forcedViewerDocState.isDraft || forcedViewerDocState.isSmartDraft)) {
        return null;
      }
      return forcedViewerDocState;
    }

    const base = (() => {
      if (selectedVaultDoc && isWordLikeDoc(selectedVaultDoc)) {
        if (isApprovedDeed && !activePdfUrl) return null;
        return selectedVaultDoc;
      }
      if (selectedVaultDoc && (selectedVaultDoc?.category === 'audit_final_pdf' || String(selectedVaultDoc?.id || '').startsWith('imported-'))) return selectedVaultDoc;
      if (judgePrimaryDoc && isPdfLikeDoc(judgePrimaryDoc)) return judgePrimaryDoc;
      if (isApprovedDeed) return null; // strictly block draft fallbacks for approved deeds
      return selectedVaultDoc;
    })();

    if (!base) return null;
    if (isApprovedDeed && (base.isDraft || base.isSmartDraft || base.id === 'smart-rasm' || base.id === 'draft-doc')) {
      return null;
    }

    return {
      ...base,
      content: base.content || currentDraftText,
      rawContent: base.rawContent || currentDraftText,
    };
  }, [canonicalApprovedPdfDoc, forcedViewerDocState, isAwaitingPdfResolved, activeDocVersion, currentDraftText, isApprovedDeed, isPdfLikeDoc, isWordLikeDoc, judgePrimaryDoc, selectedVaultDoc, activePdfUrl]);
  const isEmbeddedOnlyOfficePreviewTab =
    activeTab === 'formal' || activeTab === 'legal' || activeTab === 'data';
  const isEmbeddedOnlyOfficeActive =
    (activeViewMode === 'onlyoffice' || isAuditHubEditMode) && isEmbeddedOnlyOfficePreviewTab && activeDocVersion === 'base';
  const shouldRenderOnlyOfficePrimaryPane = isEmbeddedOnlyOfficeActive;
  const shouldMountEmbeddedOnlyOffice =
    isEmbeddedOnlyOfficeActive &&
    !!onlyOfficeDsUrl &&
    !!onlyOfficeConfig &&
    onlyOfficePaneStatus !== 'error';
  const shouldShowEmbeddedOnlyOfficeLoader =
    shouldRenderOnlyOfficePrimaryPane &&
    !shouldMountEmbeddedOnlyOffice &&
    onlyOfficePaneStatus !== 'error';

  const docxTemplateBase64Ref = useRef<string | null>(null);

  const loadDocxTemplateBase64 = useCallback(async () => {
    if (docxTemplateBase64Ref.current) return docxTemplateBase64Ref.current;
    const templateResponse = await fetch('/templates/headers/DECOR ADOUL 33.docx');
    if (!templateResponse.ok) throw new Error('Failed to fetch template');
    const templateArrayBuffer = await templateResponse.arrayBuffer();

    // Convert ArrayBuffer -> base64 (browser-safe)
    const templateUint8 = new Uint8Array(templateArrayBuffer);
    let binary = '';
    for (let i = 0; i < templateUint8.length; i++) {
      binary += String.fromCharCode(templateUint8[i]);
    }
    const templateBase64 = btoa(binary);
    docxTemplateBase64Ref.current = templateBase64;
    return templateBase64;
  }, []);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('file read failed'));
      reader.onload = () => {
        const s = String(reader.result || '');
        const comma = s.indexOf(',');
        resolve(comma === -1 ? s : s.slice(comma + 1));
      };
      reader.readAsDataURL(file);
    });

  const uploadPrimaryFile = useCallback(
    async (file: File) => {
      if (!rasmId || !sessionToken) return;
      setPrimaryBusy(true);
      try {
        const base64 = await fileToBase64(file);
        const inferredMime = file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        // Prefer Blob URL for preview (stable even for >1MB). Keep base64 for upload.
        revokePrimaryDocBlobUrl();
        const blobUrl = URL.createObjectURL(file);
        primaryDocBlobUrlRef.current = blobUrl;

        const res = await addPrimaryAttachmentMutation.mutateAsync({
          sessionToken: sessionToken || '',
          id: rasmId,
          category: 'primary_attachment',
          field: 'primaryAttachment',
          file: {
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            base64,
          },
        });

        // Prefer showing the freshly generated file immediately (no network fetch).
        // Keep the remote URL for later download/open.
        const remoteUrl =
          (res as any)?.fileUrl ||
          (res as any)?.url ||
          (res as any)?.publicUrl ||
          (res as any)?.data?.fileUrl ||
          (res as any)?.data?.url ||
          '';
        const preferredUrl = blobUrl;
        if (preferredUrl) {
          setSelectedVaultDoc({
            id: res.attachmentId,
            category: 'primary_attachment',
            fileName: file.name,
            name: file.name,
            fileUrl: preferredUrl,
            url: preferredUrl,
            remoteUrl,
            localDataUrl: `data:${inferredMime};base64,${base64}`,
            mimeType: inferredMime,
            type: inferredMime,
          });
        }

        // Optional: keep attachments list updated, but do not block UI.
        // Avoid refetch here to prevent any timing-based viewer blanking.
      } finally {
        setPrimaryBusy(false);
      }
    },
    [addPrimaryAttachmentMutation, rasmId, rasmQuery, sessionToken]
  );

  const saveEditedPdfAsNewAttachment = useCallback(async () => {
    if (!pdfOriginalBytesRef.current) {
      alert('تعذر تحميل ملف PDF الأصلي.');
      return;
    }

    const hasAnyEdits = Object.values(pdfTextEditsByPage).some(
      (e) => (e?.rects?.length || 0) > 0 || (e?.texts?.length || 0) > 0
    );
    if (!hasAnyEdits) {
      alert('لا توجد تعديلات لحفظها.');
      return;
    }

    const dataUrlToBytes = (dataUrl: string) => {
      const comma = dataUrl.indexOf(',');
      const base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };

    try {
      setPdfFormBusy(true);

      const pdfDoc = await PDFDocument.load(pdfOriginalBytesRef.current);
      const pages = pdfDoc.getPages();

      const rasterScale = 2; // 144dpi-ish (keeps Arabic rendering correct via canvas)

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const edits = pdfTextEditsByPage[pageIndex];
        if (!edits || ((edits.rects?.length || 0) === 0 && (edits.texts?.length || 0) === 0)) continue;

        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * rasterScale));
        canvas.height = Math.max(1, Math.round(height * rasterScale));
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Redactions (white)
        ctx.fillStyle = '#ffffff';
        for (const r of edits.rects || []) {
          const x = r.x * rasterScale;
          const yTop = (height - r.y - r.h) * rasterScale;
          const w = r.w * rasterScale;
          const h = r.h * rasterScale;
          ctx.fillRect(x, yTop, w, h);
        }

        // Overlay text (black)
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';
        for (const t of edits.texts || []) {
          const text = String(t.text || '');
          if (!text.trim()) continue;
          const isArabic = /[\u0600-\u06FF]/.test(text);
          (ctx as any).direction = isArabic ? 'rtl' : 'ltr';
          ctx.textAlign = isArabic ? 'right' : 'left';
          const size = Math.max(6, Number(t.size) || 14);
          ctx.font = `${size * rasterScale}px sans-serif`;
          const x = t.x * rasterScale;
          const yTop = (height - t.y - size) * rasterScale;
          ctx.fillText(text, x, yTop);
        }

        const pngBytes = dataUrlToBytes(canvas.toDataURL('image/png'));
        const png = await pdfDoc.embedPng(pngBytes);
        page.drawImage(png, { x: 0, y: 0, width, height });
      }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes as any], { type: 'application/pdf' });
      const fileName = `primary-${Date.now()}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      await uploadPrimaryFile(file);
      closePdfFormEditor({ restoreSelection: false });
    } catch (e: any) {
      alert('تعذر حفظ PDF: ' + (e?.message || String(e)));
    } finally {
      setPdfFormBusy(false);
    }
  }, [closePdfFormEditor, pdfTextEditsByPage, uploadPrimaryFile]);

  const uploadPrimaryBase64 = useCallback(
    async (opts: { base64: string; name: string; size?: number; previewTextContent?: string }) => {
      if (!rasmId || !sessionToken) return;
      setPrimaryBusy(true);
      try {
        const inferredMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        // Use Blob URL for preview (avoid huge data: URLs)
        revokePrimaryDocBlobUrl();
        const blobUrl = base64ToBlobUrl(opts.base64, inferredMime);
        primaryDocBlobUrlRef.current = blobUrl;

        const res = await addPrimaryAttachmentMutation.mutateAsync({
          sessionToken: sessionToken || '',
          id: rasmId,
          category: 'primary_attachment',
          field: 'primaryAttachment',
          file: {
            name: opts.name,
            type: inferredMime,
            size: opts.size || opts.base64.length,
            base64: opts.base64,
          },
        });

        const remoteUrl =
          (res as any)?.fileUrl ||
          (res as any)?.url ||
          (res as any)?.publicUrl ||
          (res as any)?.data?.fileUrl ||
          (res as any)?.data?.url ||
          '';
        const preferredUrl = blobUrl;
        setSelectedVaultDoc({
          id: res?.attachmentId || `primary-${Date.now()}`,
          category: 'primary_attachment',
          fileName: opts.name,
          name: opts.name,
          fileUrl: preferredUrl,
          url: preferredUrl,
          remoteUrl,
          localDataUrl: `data:${inferredMime};base64,${opts.base64}`,
          mimeType: inferredMime,
          type: inferredMime,
          previewTextContent: opts.previewTextContent,
        });
      } finally {
        setPrimaryBusy(false);
      }
    },
    [addPrimaryAttachmentMutation, rasmId, sessionToken]
  );

  const savePrimaryFromInlineText = useCallback(
    async (text: string, opts?: { savedRasmId?: string }) => {
      const content = (text || '').trim();
      if (!content) return;

      const isDocxLike = (att: any): boolean => {
        const category = String(att?.category || '').toLowerCase();
        if (category === 'judge_attachment_docx') return true;
        const name = String(att?.name || att?.fileName || att?.filename || att?.originalName || '');
        const lower = name.toLowerCase();
        const mime = String(att?.mimeType || att?.type || att?.mime_type || '').toLowerCase();
        if (lower.endsWith('.docx') || lower.endsWith('.doc')) return true;
        if (mime.includes('wordprocessingml') || mime.includes('msword')) return true;
        return false;
      };

      const pickUrl = (att: any): string | null => {
        const url =
          att?.fileUrl ||
          att?.url ||
          att?.file_url ||
          att?.publicUrl ||
          att?.public_url ||
          att?.remoteUrl ||
          null;
        return typeof url === 'string' ? url : null;
      };

      const pickBaseJudgeDocxUrl = (attachments: any[], selected: any): string | null => {
        const selectedRemote = pickUrl(selected || {});
        if (selectedRemote && isDocxLike(selected)) return selectedRemote;
        const docxAtt = attachments.find((a: any) => isDocxLike(a)) || null;
        return docxAtt ? pickUrl(docxAtt) : null;
      };

      // New model: save a patch draft (base DOCX is immutable judge-accepted artifact)
      const effectiveRasmId = (opts?.savedRasmId || rasmId || '').toString();
      if (!effectiveRasmId || !sessionToken) return;

      const attachments = (rasmQuery.data as any)?.attachments || [];
      const baseDocUrl = pickBaseJudgeDocxUrl(attachments, selectedVaultDoc as any);

      if (!baseDocUrl || typeof baseDocUrl !== 'string' || !/^https?:/i.test(baseDocUrl)) {
        throw new Error('Base judge DOCX URL not found (judge_attachment_docx).');
      }

      // Prefer a minimal "append" patch when user only added text at the end.
      // This preserves the original DOCX layout (logo/spacing/tables) and avoids reflow/deformation.
      const baseSnapshot = String(preEditPlainTextRef.current || '').replace(/\r\n/g, '\n').trimEnd();
      const nextText = String(content || '').replace(/\r\n/g, '\n').trimEnd();
      const appended = baseSnapshot && nextText.startsWith(baseSnapshot) ? nextText.slice(baseSnapshot.length) : '';
      const patch =
        appended && appended.trim()
          ? { version: 1 as const, ops: [{ op: 'append_plain_text' as const, value: appended }] }
          : { version: 1 as const, ops: [{ op: 'set_plain_text' as const, value: nextText }] };

      // Minimal targeted debug for the edited-doc regression
      // eslint-disable-next-line no-console
      console.log('[SAVE_EDIT] click', {
        rasmId: effectiveRasmId,
        previousVersionId: latestAuditVersionId || null,
      });

      const res = await savePatchDraftMutation.mutateAsync({
        sessionToken: sessionToken || '',
        savedRasmId: effectiveRasmId,
        baseDocUrl,
        patch,
        supersedesVersionId: latestAuditVersionId || undefined,
      });

      if (!(res as any)?.previewPdfUrl) {
        // Without a server-generated PDF (LibreOffice), we'll fall back to DOCX rendering in-browser,
        // which is known to deform complex RTL documents. Surface a clear warning for operators.
        // eslint-disable-next-line no-console
        console.warn('[SAVE_EDIT] pdf missing; falling back to docx-preview', {
          versionId: (res as any)?.versionId || null,
          pdfConversionError: (res as any)?.pdfConversionError || null,
        });
        try {
          alert('تنبيه: تعذر توليد PDF للختم/المعاينة (LibreOffice غير متوفر أو فشل التحويل). سيتم عرض ملف Word وقد يبدو مشوهاً.');
        } catch {}
      }

      // Backend persists the “latest edited version” pointer on the Saved Rasm.
      try {
        const backendUpdatedAt = (res as any)?.latestPointer?.updatedAt || null;
        setLatestSavedDocsPointerUpdatedAt(backendUpdatedAt);
      } catch {}

      setLatestAuditVersionId(res?.versionId || null);

      // Prefer PDF for preview to avoid docx-preview layout deformation.
      const returnedUrl = (res as any)?.previewPdfUrl || (res as any)?.previewDocxUrl || null;
      const returnedVersionId = (res as any)?.versionId || null;
      const returnedUpdatedAt = (res as any)?.createdAt || null;

      // eslint-disable-next-line no-console
      console.log('[SAVE_EDIT] result', {
        rasmId: effectiveRasmId,
        previousVersionId: latestAuditVersionId || null,
        newVersionId: returnedVersionId,
        latestPointer: (res as any)?.latestPointer || null,
      });

      if (returnedUrl && returnedVersionId) {
        const lower = String(returnedUrl).toLowerCase();
        const kind: 'pdf' | 'docx' = lower.includes('.pdf') ? 'pdf' : 'docx';

        // Keep Judge-portal behavior: do NOT auto-switch the viewer immediately.
        setActiveDocVersion('base');
        setActiveEditedArtifact({ versionId: returnedVersionId, url: returnedUrl, kind });
      }

      setPrimaryTextEditorOpen(false);
      setViewerDocRenderNonce((n) => n + 1);

      // Invalidate Saved Documents cache so list/detail show edited version immediately.
      try {
        await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken: sessionToken || '', id: effectiveRasmId });
      } catch {}
      try {
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken: sessionToken || '' } as any);
      } catch {}
    },
    [judgeSubmissionId, latestAuditVersionId, rasmId, rasmQuery.data, savePatchDraftMutation, selectedVaultDoc, sessionToken, trpcUtils]
  );

  const handleFinalize = () => {
    if (!state || !rasmId) return;
    setDecisionType('approve');
    setIsDecisionModalOpen(true);
  };

  const baseDocUrlForDebug = useMemo(() => {
    const attachments = (rasmQuery.data as any)?.attachments || [];
    const savedJudgeDoc =
      attachments.find((a: any) => (a?.category || '').toString().toLowerCase() === 'judge_attachment_docx') ||
      attachments.find((a: any) => (a?.category || '').toString().toLowerCase() === 'judge_attachment');
    const base = (judgePrimaryDoc as any) || savedJudgeDoc || judgeAttachmentDoc || null;
    const url = base ? getDocEffectiveUrl(base) : '';
    return String(url || '').trim() || null;
  }, [judgeAttachmentDoc, judgePrimaryDoc, rasmQuery.data]);

  const editedDocUrlForDebug = useMemo(() => {
    if (activeEditedArtifact?.url) return activeEditedArtifact.url;
    const d = selectedVaultDoc as any;
    const cat = (d?.category || '').toString().toLowerCase();
    if (cat.startsWith('audit_')) return getDocEffectiveUrl(d) || null;
    return null;
  }, [activeEditedArtifact, selectedVaultDoc]);

  useEffect(() => {
    if (!rasmQuery.data) return;

    const attachments = (rasmQuery.data as any)?.attachments || [];
    const persistedEditedDocxAttachment = attachments.find((attachment: any) => {
      const category = String(attachment?.category || '').toLowerCase();
      return category === 'audit_final_docx' || category === 'audit_draft_docx';
    });
    const persistedEditedPdfAttachment = attachments.find((attachment: any) => {
      const category = String(attachment?.category || '').toLowerCase();
      return category === 'audit_final_pdf' || category === 'audit_draft_pdf';
    });
    const persistedEditedAttachment = persistedEditedPdfAttachment || persistedEditedDocxAttachment || null;

    const persistedVersionId =
      (rasmQuery.data as any)?.latestDraftVersionId ||
      String((persistedEditedAttachment as any)?.metadata?.versionId || (persistedEditedAttachment as any)?.metadata?.version_id || '') ||
      null;

    const persistedUrl =
      persistedEditedPdfAttachment?.fileUrl ||
      persistedEditedDocxAttachment?.fileUrl ||
      ((rasmQuery.data as any)?.latestDraftDocxUrl || null);

    if (!persistedVersionId || !persistedUrl) return;

    const inferredKind: 'pdf' | 'docx' =
      String(persistedEditedAttachment?.category || persistedUrl).toLowerCase().includes('pdf') ||
      String(persistedUrl).toLowerCase().includes('.pdf')
        ? 'pdf'
        : 'docx';

    setLatestSavedDocsPointerUpdatedAt((current) => current || (rasmQuery.data as any)?.latestDraftUpdatedAt || null);
    setActiveEditedArtifact((current) => {
      if (current?.versionId === persistedVersionId && current?.url === persistedUrl && current?.kind === inferredKind) {
        return current;
      }
      return {
        versionId: persistedVersionId,
        url: persistedUrl,
        kind: inferredKind,
      };
    });
  }, [rasmQuery.data]);

  useEffect(() => {
    if (!rasmQuery.data) return;
    
    const savedChecklist = ((rasmQuery.data as any)?.payload as any)?.finalReviewChecklist;
    if (!savedChecklist || typeof savedChecklist !== 'object') return;
    setPreSaveChecks({
      inclusionComplete: !!savedChecklist.inclusionComplete,
      judgeNotesApplied: !!savedChecklist.judgeNotesApplied,
      noJudgeNotes: !!savedChecklist.noJudgeNotes,
      registrationConfirmed: !!savedChecklist.registrationConfirmed,
      finalClosure: !!savedChecklist.finalClosure,
    });
  }, [(rasmQuery.data as any)?.payload]);

  const confirmFinalize = async (): Promise<boolean> => {
    if (!state || !rasmId) return false;

    // Check if there are critical errors in checklist
    const criticalError = validations.find(v => v.status === 'error');
    if (criticalError) {
      alert(`لا يمكن إتمام التضمين: ${criticalError.msg}`);
      return false;
    }
    
    // Auto-calculate names from sellers[0]
    const fullName = state.sellers?.[0]?.name || '---';
    const names = fullName.split(' ');
    const personal = names[0] || '---';
    const family = names.length > 1 ? names.slice(1).join(' ') : '---';

    // Construct detailed property reference for the ledger
    const propertySummary = propertyUnits.map(u => 
        u.type === 'unregistered'
            ? `عدلي(${u.city}, ${u.unregisteredData.page}/${u.unregisteredData.count})`
            : `محفظ(${u.registeredData.propertyId})`
    ).join(' | ');

    // 🔄 Sync modifications to the database before final approval
    // Importantly, capture current state of inline edits from the rendered WordPreview.
    // HighResViewer registers a plain-text getter through `editedPlainTextGetterRef`.
    const currentDocContent = String(
      editedPlainTextGetterRef.current?.() ||
        (state as any)?.draft ||
        (selectedVaultDoc?.isDraft ? selectedVaultDoc?.content : '') ||
        ''
    ).trim();
    const finalPayload = {
        ...state,
        draft: currentDocContent, // persist inline edits
        propertyUnits, // include the enhanced unit list
        isUnitsAvailable,
        isFinancialAvailable,
        optionalParties: Array.isArray((finalRecord as any).optionalParties) ? (finalRecord as any).optionalParties : [],
        finalReviewChecklist: buildFinalReviewChecklist(),
    };

    // New signing model:
    // - Base DOCX (judge accepted) stays immutable.
    // - We save edits as a patch JSON.
    // - Server generates final PDF for signing from (base DOCX + patch).
    let finalPdfUrl: string | null = null;
    let versionIdForSigning: string | null = null;
    try {
      if (currentDocContent && sessionToken) {
        const attachments = (rasmQuery.data as any)?.attachments || [];
        const isDocxLike = (att: any): boolean => {
          const category = String(att?.category || '').toLowerCase();
          if (category === 'judge_attachment_docx') return true;
          const name = String(att?.name || att?.fileName || att?.filename || att?.originalName || '');
          const lower = name.toLowerCase();
          const mime = String(att?.mimeType || att?.type || att?.mime_type || '').toLowerCase();
          if (lower.endsWith('.docx') || lower.endsWith('.doc')) return true;
          if (mime.includes('wordprocessingml') || mime.includes('msword')) return true;
          return false;
        };

        const pickUrl = (att: any): string | null => {
          const url =
            att?.fileUrl ||
            att?.url ||
            att?.file_url ||
            att?.publicUrl ||
            att?.public_url ||
            att?.remoteUrl ||
            null;
          return typeof url === 'string' ? url : null;
        };

        const pickBaseJudgeDocxUrl = (attachments: any[], selected: any): string | null => {
          const selectedRemote = pickUrl(selected || {});
          if (selectedRemote && isDocxLike(selected)) return selectedRemote;
          const docxAtt = attachments.find((a: any) => isDocxLike(a)) || null;
          return docxAtt ? pickUrl(docxAtt) : null;
        };

        const baseDocUrl = pickBaseJudgeDocxUrl(attachments, selectedVaultDoc as any);

        if (!baseDocUrl || typeof baseDocUrl !== 'string' || !/^https?:/i.test(baseDocUrl)) {
          throw new Error('Base judge DOCX URL not found (judge_attachment_docx).');
        }

      const baseSnapshot = String(preEditPlainTextRef.current || '').replace(/\r\n/g, '\n').trimEnd();
      const nextText = String(currentDocContent || '').replace(/\r\n/g, '\n').trimEnd();
      const appended = baseSnapshot && nextText.startsWith(baseSnapshot) ? nextText.slice(baseSnapshot.length) : '';
      const patch =
        appended && appended.trim()
          ? { version: 1 as const, ops: [{ op: 'append_plain_text' as const, value: appended }] }
          : { version: 1 as const, ops: [{ op: 'set_plain_text' as const, value: nextText }] };

        const draftRes = await savePatchDraftMutation.mutateAsync({
          sessionToken: sessionToken || '',
          savedRasmId: rasmId,
          baseDocUrl,
          patch,
          supersedesVersionId: latestAuditVersionId || undefined,
        });

        versionIdForSigning = draftRes?.versionId || null;
        setLatestAuditVersionId(versionIdForSigning);

        if (!versionIdForSigning) throw new Error('Failed to create audit doc version');

        const finRes = await finalizeForSigningMutation.mutateAsync({
          sessionToken: sessionToken || '',
          versionId: versionIdForSigning,
        });

        finalPdfUrl = finRes?.finalPdfUrl || null;
      }
    } catch (e) {
      // This one is important: signing must use server artifact.
      alert('تعذر توليد النسخة النهائية للتوقيع (PDF) على الخادم. يرجى المحاولة لاحقاً أو التحقق من إعدادات التحويل.');
      return false;
    }

    // 2. Transmit latest payload to finalization to avoid potential race conditions.
    // finalizeAudit is the source of truth (no fire-and-forget mutation before navigation).
    try {
      await finalizeMutation.mutateAsync({
        sessionToken: sessionToken || '',
        id: rasmId,
        payload: finalPayload,
        ledgerEntry: {
          family_name: family,
          personal_name: personal,
          id_card: state.sellers?.[0]?.idNumber || '---',
          certificate_type: state.documentType || 'رسم_عدلي',
          operation_type: 'تضمين_نهائي',
          amount_received: 0,
          receipt_number: `${finalRecord.register} (ص: ${finalRecord.page}, ع: ${finalRecord.count})`,
          property_reference: propertySummary,
          notary_name: (finalRecord as any).judgeName,
        },
      });

      setIsDecisionModalOpen(false);
      alert('تم التضمين بنجاح. تم إغلاق الملف ومنحه أثراً رقمياً حياً.');
      const navigationState = { draft: finalPayload.draft, finalPdfUrl, versionIdForSigning };

      // 🚀 Redirect to the Notary Signing Portal (open the selected rasm directly)
      const targetId = rasmId || '';
      navigate(targetId ? `/notary-signing-portal/sign/${targetId}` : `/notary-signing-portal`, {
        state: navigationState,
      });
      return true;
    } catch (err: any) {
      alert('حدث خطأ أثناء التضمين: ' + (err?.message || String(err)));
      return false;
    }
  };

  const selectedDocumentUrl = useMemo(() => {
    const doc = forcedViewerDoc as any;
    if (!doc) return '';
    return String(
      doc?.remoteUrl ||
        doc?.remote_url ||
        doc?.fileUrl ||
        doc?.url ||
        doc?.file_url ||
        doc?.fileURL ||
        doc?.publicUrl ||
        doc?.public_url ||
        ''
    ).trim();
  }, [forcedViewerDoc]);

  const selectedDocumentName = useMemo(() => {
    const doc = forcedViewerDoc as any;
    return String(doc?.fileName || doc?.file_name || doc?.name || 'document').trim();
  }, [forcedViewerDoc]);

  const shareSelectedDocument = useCallback(async () => {
    if (!selectedDocumentUrl) {
      alert('لا توجد نسخة قابلة للمشاركة حالياً.');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedDocumentName,
          text: 'مشاركة الوثيقة الحالية',
          url: selectedDocumentUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(selectedDocumentUrl);
      alert('تم نسخ رابط الوثيقة إلى الحافظة.');
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      alert('تعذر تنفيذ المشاركة الحالية.');
    }
  }, [selectedDocumentName, selectedDocumentUrl]);

  const printSelectedDocument = useCallback(() => {
    if (selectedDocumentUrl) {
      const printWindow = window.open(selectedDocumentUrl, '_blank', 'noopener,noreferrer');
      if (!printWindow) {
        alert('تعذر فتح نافذة الطباعة.');
      }
      return;
    }

    window.print();
  }, [selectedDocumentUrl]);

  const deleteCurrentRasm = useCallback(async () => {
    if (!sessionToken || !rasmId) return;
    if (!confirm('هل تريد حذف هذا الرسم نهائياً؟')) return;

    try {
      await deleteSavedRasmMutation.mutateAsync({ sessionToken, id: rasmId });
      try {
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken } as any);
      } catch {}
      try {
        await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken, id: rasmId });
      } catch {}
      navigate('/dashboard?module=notaryPortal');
    } catch (error: any) {
      alert(error?.message || 'تعذر حذف الرسم.');
    }
  }, [deleteSavedRasmMutation, navigate, rasmId, sessionToken, trpcUtils]);

  const revertSavedEdit = useCallback(async () => {
    if (!sessionToken || !rasmId) return;
    if (!confirm('هل تريد التراجع عن آخر التعديلات المحفوظة والرجوع إلى النسخة الأصلية؟')) return;

    try {
      await revertLatestSavedRasmEditMutation.mutateAsync({ sessionToken, id: rasmId });
      setActiveEditedArtifact(null);
      setActiveDocVersion('base');
      setLatestAuditVersionId(null);
      setLatestSavedDocsPointerUpdatedAt(null);
      setPrimaryTextEditorOpen(false);
      setViewerDocRenderNonce((n) => n + 1);
      try {
        await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken, id: rasmId });
      } catch {}
      try {
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken } as any);
      } catch {}
      await rasmQuery.refetch();
    } catch (error: any) {
      alert(error?.message || 'تعذر التراجع عن آخر التعديلات.');
    }
  }, [rasmId, rasmQuery, revertLatestSavedRasmEditMutation, sessionToken, trpcUtils]);

  useEffect(() => {
    try {
      if (!(rasmQuery.data as any)?.payload) return;

      const s = (rasmQuery.data as any)?.payload as any;
      if (!s || typeof s !== 'object') return;

      setState(s);
      setIsUnitsAvailable(s.isUnitsAvailable ?? true);
      setIsFinancialAvailable(s.isFinancialAvailable ?? true);
      
      // Auto-fill final record from payload
      setFinalRecord(prev => ({
        ...prev,
        register: (s as any).witnessesData?.notaryRegister || '',
        number: (s as any).meta?.fileNumber || (rasmQuery.data as any)?.fileNumber || '',
        page: s.properties?.[0]?.titleDocuments?.[0]?.page || '',
        count: s.properties?.[0]?.titleDocuments?.[0]?.count || '',
        date: (s as any).meta?.dateGregorian || new Date().toISOString().split('T')[0],
        certificateType: s.documentType || 'رسم بيع',
        firstPartyName: s.sellers?.[0]?.name || '',
        firstPartyId: s.sellers?.[0]?.idNumber || '',
        secondPartyName: s.buyers?.[0]?.name || '',
        secondPartyId: s.buyers?.[0]?.idNumber || '',
        notaryName: s.notaryPrimary || 'الأستاذ المصطفى العلوي',
        optionalParties: Array.isArray((s as any).optionalParties)
          ? (s as any).optionalParties.map((party: any) => ({
              id: String(party?.id || crypto.randomUUID()),
              name: String(party?.name || ''),
              nationalId: String(party?.nationalId || party?.idNumber || ''),
            }))
          : [],
      }));

      // Auto-select the most relevant document for viewing:
      // 0) Smart Rasm HTML from payload
      const payload = (rasmQuery.data as any)?.payload as any;
      const attachments = (rasmQuery.data as any)?.attachments || [];

      const normalizeSavedAttachment = (att: any) => {
        if (!att) return null;
        const fileName =
          (att.fileName || att.file_name || att.name || att.filename || 'attachment').toString();
        const mimeType =
          (att.type || att.mimeType || att.mime_type || 'application/octet-stream').toString();
        const url =
          (att.url || att.fileUrl || att.file_url || att.fileURL || att.publicUrl || att.public_url || null) as
            | string
            | null;
        return {
          ...att,
          fileName,
          name: att.name || fileName,
          mimeType: att.mimeType || att.mime_type || att.type || mimeType,
          type: att.type || att.mime_type || att.mimeType || mimeType,
          fileUrl: att.fileUrl || att.file_url || att.url || url,
          url: att.url || att.fileUrl || att.file_url || url,
        };
      };

      const setSelectedVaultDocNormalized = (next: any) => {
        const normalized = normalizeSavedAttachment(next) || next;
        setSelectedVaultDoc((prev: any) => {
          if (!prev || !normalized) return normalized;
          if (prev?.id && normalized?.id && prev.id === normalized.id) {
            const prevUrl = (prev.url || prev.fileUrl || '') as string;
            const keepPrevDataUrl = typeof prevUrl === 'string' && prevUrl.startsWith('data:');
            const normalizedHasRealFile =
              !!String(normalized?.url || normalized?.fileUrl || '').trim() &&
              !String(normalized?.url || normalized?.fileUrl || '').startsWith('html://') &&
              String(normalized?.url || normalized?.fileUrl || '') !== 'draft://main';
            return {
              ...prev,
              ...normalized,
              url: keepPrevDataUrl ? prev.url : normalized.url,
              fileUrl: keepPrevDataUrl ? prev.fileUrl : normalized.fileUrl,
              fileName: normalized.fileName || prev.fileName,
              mimeType: normalized.mimeType || prev.mimeType,
              type: normalized.type || prev.type,
              ...(normalizedHasRealFile
                ? {
                    rasmHtml: undefined,
                    isSmartDraft: false,
                    isDraft: false,
                    content: undefined,
                    textContent: undefined,
                    previewTextContent: undefined,
                  }
                : {}),
            };
          }
          return normalized;
        });
      };
      const editedOverrideDocx = attachments.find((a: any) => {
        const category = (a.category || '').toString().toLowerCase();
        return category === 'audit_final_docx' || category === 'audit_draft_docx';
      });
      const editedOverridePdf = attachments.find((a: any) => {
        const category = (a.category || '').toString().toLowerCase();
        return category === 'audit_final_pdf' || category === 'audit_draft_pdf';
      });
      const primaryOverride = attachments.find((a: any) =>
        (a.category || '').toString().toLowerCase() === 'primary_attachment'
      );
      const savedJudgeDoc = attachments.find((a: any) =>
        (a.category || '').toString().toLowerCase() === 'judge_attachment'
      );
      const deed = attachments.find((a: any) =>
        ['deed', 'rasm', 'contract', 'title_documents', 'post_registration'].includes((a.category || '').toString().toLowerCase())
      );

      // Deterministic precedence: if we have an edited artifact, keep it selected.
      // Prevent query refetch / auto-select from clobbering the edited URL.
      if ((activeDocVersion as any) === 'edited' && activeEditedArtifact?.url && activeEditedArtifact?.versionId) {
        const kind = activeEditedArtifact.kind;
        const editedDoc = {
          id: kind === 'pdf' ? `audit-draft-${activeEditedArtifact.versionId}` : `audit-draft-docx-${activeEditedArtifact.versionId}`,
          category: kind === 'pdf' ? 'audit_draft_pdf' : 'audit_draft_docx',
          fileName: kind === 'pdf' ? `audit-draft-${activeEditedArtifact.versionId}.pdf` : `audit-draft-${activeEditedArtifact.versionId}.docx`,
          name: kind === 'pdf' ? `audit-draft-${activeEditedArtifact.versionId}.pdf` : `audit-draft-${activeEditedArtifact.versionId}.docx`,
          fileUrl: activeEditedArtifact.url,
          url: activeEditedArtifact.url,
          remoteUrl: activeEditedArtifact.url,
          mimeType: kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          type: kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        setSelectedVaultDocNormalized(editedDoc);
        return;
      }

      // Base mode: open the compiled PDF primary document first, then judge Word attachment.
      // Edited artifacts should only take over automatically when (activeDocVersion as any) === 'edited'.
      if (judgePrimaryDoc && isPdfLikeDoc(judgePrimaryDoc)) {
        setSelectedVaultDoc(judgePrimaryDoc);
      } else if (activePdfUrl) {
        setSelectedVaultDoc({
          id: `canonical-approved-pdf-${String((rasmQuery.data as any)?.id || rasmId || 'active')}`,
          category: 'audit_final_pdf',
          fileName: (rasmQuery.data as any)?.previewName || 'المحرر القضائي المعتمد.pdf',
          name: (rasmQuery.data as any)?.previewName || 'المحرر القضائي المعتمد.pdf',
          fileUrl: activePdfUrl,
          url: activePdfUrl,
          mimeType: 'application/pdf',
          type: 'application/pdf',
          isJudgePrimary: true,
        });
      } else if (judgeWordAttachmentDoc) {
        setSelectedVaultDocNormalized(judgeWordAttachmentDoc);
      } else if (judgePrimaryDoc) {
        setSelectedVaultDoc(judgePrimaryDoc);
      } else if (savedJudgeDoc) {
        setSelectedVaultDocNormalized(savedJudgeDoc);
      } else if (judgeAttachmentDoc) {
        setSelectedVaultDocNormalized(judgeAttachmentDoc);
      } else if (primaryOverride) {
        setSelectedVaultDocNormalized(primaryOverride);
      } else if (editedOverridePdf) {
        setSelectedVaultDocNormalized(editedOverridePdf);
      } else if (editedOverrideDocx) {
        setSelectedVaultDocNormalized(editedOverrideDocx);
      } else {
        // Guard: if the backend explicitly says the PDF is not yet compiled for a
        // judge-approved deed, do NOT fall back to the raw HTML/draft renderer.
        // The PdfCompilationGate will display a spinner until the poll resolves.
        const awaitingCompilation =
          (rasmQuery.data as any)?.payload?.pdfCompilationReady === false ||
          isApprovedDeed ||
          isJudgeSubmissionsLoading;
        if (!awaitingCompilation) {
          if (payload?.rasmHtml) {
            setSelectedVaultDoc({
              id: 'smart-rasm',
              fileName: 'المحرر العدلي (نظام ذكي)',
              rasmHtml: payload.rasmHtml,
              isSmartDraft: true
            });
          } else if (deed) {
            setSelectedVaultDocNormalized(deed);
          } else if (Array.isArray(attachments) && attachments.length > 0) {
            setSelectedVaultDocNormalized(attachments[0]);
          } else if (rasmQuery.data && ((rasmQuery.data as any).draft || (s as any)?.draft)) {
            const draftContent = (rasmQuery.data as any).draft || (s as any)?.draft;
            if (draftContent) {
              setSelectedVaultDoc({
                id: 'draft-doc',
                fileName: 'المحرر العدلي',
                isDraft: true,
                content: draftContent
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in document selection logic:', error);
    }
  }, [activeDocVersion, activeEditedArtifact, rasmQuery.data, judgeAttachmentDoc, judgeAttachmentDocs, judgePrimaryDoc, judgeWordAttachmentDoc]);

  // Force re-selection if the judge-side primary preview appears later.
  useEffect(() => {
    if (!judgePrimaryDoc && !activePdfUrl) return;

    const currentUrl = String(
      selectedVaultDoc?.url ||
      selectedVaultDoc?.fileUrl ||
      selectedVaultDoc?.file_url ||
      selectedVaultDoc?.fileURL ||
      ''
    ).trim();
    const currentId = String(selectedVaultDoc?.id || '');
    const currentCategory = String(selectedVaultDoc?.category || '').toLowerCase();
    const currentFileName = String(
      selectedVaultDoc?.fileName ||
      selectedVaultDoc?.file_name ||
      selectedVaultDoc?.name ||
      ''
    ).toLowerCase();
    const currentMime = String(
      selectedVaultDoc?.mimeType ||
      selectedVaultDoc?.mime_type ||
      selectedVaultDoc?.type ||
      ''
    ).toLowerCase();
    const judgePreviewIsPdf =
      String((judgePrimaryDoc as any)?.fileName || (judgePrimaryDoc as any)?.name || '').toLowerCase().endsWith('.pdf') ||
      String((judgePrimaryDoc as any)?.mimeType || (judgePrimaryDoc as any)?.type || '').toLowerCase().includes('application/pdf') ||
      Boolean(activePdfUrl);
    const currentIsStatic =
      !currentUrl ||
      currentUrl.startsWith('html://') ||
      currentUrl === 'draft://main' ||
      currentId === 'smart-rasm' ||
      currentId === 'draft-doc';
    const currentIsDocxLike =
      currentCategory === 'judge_attachment_docx' ||
      currentFileName.endsWith('.docx') ||
      currentFileName.endsWith('.doc') ||
      currentMime.includes('wordprocessingml') ||
      currentMime.includes('msword');
    const currentIsPdf =
      currentCategory === 'judge_attachment' ||
      currentCategory === 'audit_final_pdf' ||
      currentFileName.endsWith('.pdf') ||
      currentMime.includes('application/pdf');

    if (currentIsStatic || (judgePreviewIsPdf && !currentIsPdf) || currentIsDocxLike) {
      if (judgePrimaryDoc && isPdfLikeDoc(judgePrimaryDoc)) {
        setSelectedVaultDoc(judgePrimaryDoc);
      } else if (activePdfUrl) {
        setSelectedVaultDoc({
          id: `canonical-approved-pdf-${String((rasmQuery.data as any)?.id || rasmId || 'active')}`,
          category: 'audit_final_pdf',
          fileName: (rasmQuery.data as any)?.previewName || 'المحرر القضائي المعتمد.pdf',
          name: (rasmQuery.data as any)?.previewName || 'المحرر القضائي المعتمد.pdf',
          fileUrl: activePdfUrl,
          url: activePdfUrl,
          mimeType: 'application/pdf',
          type: 'application/pdf',
          isJudgePrimary: true,
        });
      }
    }
  }, [
    activePdfUrl,
    isPdfLikeDoc,
    judgePrimaryDoc,
    rasmId,
    rasmQuery.data,
    selectedVaultDoc?.id,
    selectedVaultDoc?.url,
    selectedVaultDoc?.fileUrl,
    selectedVaultDoc?.category,
    selectedVaultDoc?.fileName,
    selectedVaultDoc?.mimeType,
    selectedVaultDoc?.type,
  ]);

  // Force re-selection if judgeAttachmentDoc appears later
  useEffect(() => {
    if (judgeAttachmentDoc && selectedVaultDoc?.id === 'draft-doc') {
       setSelectedVaultDoc(judgeAttachmentDoc);
    }
  }, [judgeAttachmentDoc]);

  useEffect(() => {
    if (rasmQuery.error) {
      setError(rasmQuery.error.message);
    }
  }, [rasmQuery.error]);

  const handleViewerMouseDown = (e: React.MouseEvent) => {
    if (primaryTextEditorOpen) return;
    const el = viewerContainerRef.current;
    if (!el) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
  };

  const handleViewerMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const el = viewerContainerRef.current;
    if (!el) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    el.scrollLeft = dragStart.current.scrollLeft - dx;
    el.scrollTop = dragStart.current.scrollTop - dy;
  };

  const handleViewerMouseUp = () => setIsDragging(false);

  const getBaseViewerWidth = (doc: any) => (doc?.rasmHtml ? 800 : PAGE_WIDTH);

  const computeFitZoom = React.useCallback(() => {
    const el = viewerContainerRef.current;
    if (!el || !selectedVaultDoc) return 1;
    const baseWidth = getBaseViewerWidth(selectedVaultDoc);
    const available = Math.max(320, el.clientWidth - 96); // padding + breathing room
    const z = available / baseWidth;
    return Math.min(Math.max(z, 0.75), 1.5);
  }, [selectedVaultDoc]);

  const updateZoom = (nextZoom: number) => {
    const z = Math.min(Math.max(nextZoom, 0.5), 3);
    setViewerZoom(z);
  };

  const handleViewerWheel = (e: any) => {
    if (e.ctrlKey) {
      if (e.preventDefault) e.preventDefault();
      return;
    }
  };

  // Reset listener for the Reset View button
  useEffect(() => {
    const handleReset = () => {
      const z = computeFitZoom();
      setViewerZoom(z);
      const el = viewerContainerRef.current;
      if (el) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    };
    window.addEventListener('viewer-reset', handleReset);
    return () => window.removeEventListener('viewer-reset', handleReset);
  }, [computeFitZoom]);

  // Fit-to-width on document change (sensible default for normal users)
  useEffect(() => {
    if (!selectedVaultDoc) return;
    requestAnimationFrame(() => {
      const z = computeFitZoom();
      setViewerZoom(z);
      const el = viewerContainerRef.current;
      if (el) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    });
  }, [selectedVaultDoc?.id, computeFitZoom]);

  const updateDraftContent = (newContent: string) => {
    setState((prev: any) => ({ ...prev, draft: newContent }));
    if (selectedVaultDoc?.id === 'draft-doc') {
      setSelectedVaultDoc((prev: any) => ({ ...prev, content: newContent }));
    }
  };

  const loadOnlyOfficeConfig = useCallback(
    async ({
      mode = 'overlay',
      silent = false,
      force = false,
    }: {
      mode?: 'overlay' | 'embedded';
      silent?: boolean;
      force?: boolean;
    } = {}) => {
      if (primaryBusy) return false;

      if (!sessionToken || !rasmId) {
        if (!silent) {
          alert('خطأ: لم يتم العثور على جلسة المستخدم أو معرّف الرسم.');
        }
        return false;
      }

      const requestSeq = ++onlyOfficeRequestSeqRef.current;

      setOnlyOfficeMode(mode);
      setOnlyOfficeError(null);

      if (mode === 'embedded') {
        setOnlyOfficeOpen(false);
        setOnlyOfficePaneStatus('loading-config');
        setOnlyOfficeLoadStartedAt((prev) => prev ?? Date.now());
      } else {
        setOnlyOfficePaneStatus('ready');
        setOnlyOfficeLoadStartedAt(null);
      }

      if (force) {
        setOnlyOfficeDsUrl(null);
        setOnlyOfficeConfig(null);
        setOnlyOfficeRenderNonce((n) => n + 1);
      }

      try {
        onlyOfficeBaselineRef.current = {
          versionId: ((rasmQuery.data as any)?.latestDraftVersionId as string | null) || null,
          updatedAt:
            ((rasmQuery.data as any)?.latestDraftUpdatedAt as string | null) ||
            String(((rasmQuery.data as any)?.payload as any)?.latestDocumentUpdatedAt || '') ||
            null,
        };

        const res = await getOnlyOfficeConfigMutation.mutateAsync({
          sessionToken: sessionToken || '',
          savedRasmId: rasmId,
        });

        if (requestSeq !== onlyOfficeRequestSeqRef.current) return false;

        const nextDsUrl = String(res?.dsUrl || '').trim();
        const nextConfig = (res as any)?.config;

        if (!nextDsUrl || !nextConfig || typeof nextConfig !== 'object') {
          throw new Error('OnlyOffice config response is incomplete');
        }

        setOnlyOfficeDsUrl(nextDsUrl);
        setOnlyOfficeConfig(nextConfig);
        setOnlyOfficeRenderNonce((n) => n + 1);

        if (mode === 'embedded') {
          setOnlyOfficePaneStatus('loading-editor');
        } else {
          setOnlyOfficeOpen(true);
        }

        return true;
      } catch (e: any) {
        if (requestSeq !== onlyOfficeRequestSeqRef.current) return false;

        const message = e?.message || String(e);
        setOnlyOfficeError(message);
        setOnlyOfficeDsUrl(null);
        setOnlyOfficeConfig(null);
        setOnlyOfficeOpen(false);
        setOnlyOfficeLoadStartedAt(null);
        setOnlyOfficePaneStatus(mode === 'embedded' ? 'error' : 'idle');

        if (!silent) {
          alert('تعذر فتح محرر Word: ' + message);
        }

        return false;
      }
    },
    [getOnlyOfficeConfigMutation, primaryBusy, rasmId, rasmQuery.data, sessionToken]
  );

  const reloadEmbeddedOnlyOfficeToLatestVersion = useCallback(() => {
    if (!isEmbeddedOnlyOfficeActive) return;
    if (onlyOfficeMode !== 'embedded') return;
    window.setTimeout(() => {
      void loadOnlyOfficeConfig({ mode: 'embedded', silent: true, force: true });
    }, 0);
  }, [isEmbeddedOnlyOfficeActive, loadOnlyOfficeConfig, onlyOfficeMode]);

  const handleSaveEditsAndExit = useCallback(async () => {
    if (!rasmId || !sessionToken) return;
    setIsSavingEdits(true);
    try {
      if (onlyOfficeConfig) {
        const documentKey = String((onlyOfficeConfig as any)?.document?.key || '').trim();
        if (documentKey) {
          try {
            await forceOnlyOfficeSaveMutation.mutateAsync({
              sessionToken,
              savedRasmId: rasmId,
              documentKey,
            });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Force save OnlyOffice warning:', err);
          }
        }
      }

      const text =
        editedPlainTextGetterRef.current?.() ||
        (state as any)?.draft ||
        currentDraftText ||
        '';

      let newPdfUrl: string | null = null;
      let newVersionId: string | null = null;

      // Try savePatchDraft if baseDocUrl is available
      const attachments = (rasmQuery.data as any)?.attachments || [];
      const pickUrl = (att: any) =>
        att?.fileUrl || att?.url || att?.file_url || att?.publicUrl || att?.remoteUrl || null;
      const isDocxLikeItem = (a: any) => {
        const name = String(a?.fileName || a?.name || '').toLowerCase();
        const cat = String(a?.category || '').toLowerCase();
        const type = String(a?.mimeType || a?.type || '').toLowerCase();
        return cat.includes('docx') || name.endsWith('.docx') || type.includes('wordprocessingml');
      };
      const baseDocxAtt = attachments.find((a: any) => isDocxLikeItem(a)) || selectedVaultDoc;
      const baseDocUrl = baseDocxAtt ? pickUrl(baseDocxAtt) : null;

      if (baseDocUrl && typeof baseDocUrl === 'string' && /^https?:/i.test(baseDocUrl)) {
        try {
          const patch = { version: 1 as const, ops: [{ op: 'set_plain_text' as const, value: text }] };
          const res = await savePatchDraftMutation.mutateAsync({
            sessionToken,
            savedRasmId: rasmId,
            baseDocUrl,
            patch,
            supersedesVersionId: latestAuditVersionId || undefined,
          });
          newPdfUrl = (res as any)?.previewPdfUrl || (res as any)?.previewDocxUrl || null;
          newVersionId = (res as any)?.versionId || null;
          if (newVersionId) {
            setLatestAuditVersionId(newVersionId);
          }
        } catch (patchErr) {
          // eslint-disable-next-line no-console
          console.warn('[handleSaveEditsAndExit] savePatchDraft fallback:', patchErr);
        }
      }

      if (text) {
        await updateSavedRasmMutation.mutateAsync({
          sessionToken,
          id: rasmId,
          draft: text,
        });
      }

      // Invalidate queries and fetch fresh state
      await rasmQuery.refetch();
      try {
        await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken, id: rasmId });
      } catch {}
      try {
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken } as any);
      } catch {}

      // Revoke any active primary blob URL
      revokePrimaryDocBlobUrl();

      // Force Cache Invalidation & Blob Re-creation
      const resolvedPdf =
        newPdfUrl ||
        (rasmQuery.data as any)?.latestDraftPdfUrl ||
        (rasmQuery.data as any)?.latestDraftDocxUrl ||
        null;

      if (resolvedPdf) {
        const cacheBustedUrl = `${resolvedPdf}${resolvedPdf.includes('?') ? '&' : '?'}cb=${Date.now()}`;
        setSelectedVaultDoc({
          id: `edited-${newVersionId || Date.now()}`,
          fileUrl: cacheBustedUrl,
          url: cacheBustedUrl,
          mimeType: 'application/pdf',
          category: 'audit_final_pdf',
          content: text,
          rawContent: text,
        });
        setActiveEditedArtifact({
          versionId: newVersionId || String(Date.now()),
          url: cacheBustedUrl,
          kind: 'pdf',
        });
        setActiveDocVersion('edited');
      }

      setViewerDocRenderNonce((n) => n + 1);
      setIsAuditHubEditMode(false);
    } catch (e: any) {
      alert('حدث خطأ أثناء حفظ التعديلات: ' + (e?.message || String(e)));
    } finally {
      setIsSavingEdits(false);
    }
  }, [
    currentDraftText,
    forceOnlyOfficeSaveMutation,
    latestAuditVersionId,
    onlyOfficeConfig,
    rasmId,
    rasmQuery,
    savePatchDraftMutation,
    selectedVaultDoc,
    sessionToken,
    state,
    trpcUtils,
    updateSavedRasmMutation,
  ]);

  const handleStartOnlyOfficeEdit = useCallback(async () => {
    setActiveViewMode('onlyoffice');
    await loadOnlyOfficeConfig({ mode: 'embedded', force: true });
  }, [loadOnlyOfficeConfig]);

  const handleSaveAndCloseOnlyOffice = useCallback(async () => {
    if (!rasmId || !sessionToken) return;
    setIsSavingEdits(true);
    try {
      if (onlyOfficeConfig) {
        const documentKey = String((onlyOfficeConfig as any)?.document?.key || '').trim();
        if (documentKey) {
          try {
            await forceOnlyOfficeSaveMutation.mutateAsync({
              sessionToken,
              savedRasmId: rasmId,
              documentKey,
            });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Force save OnlyOffice warning:', err);
          }
        }
      }

      const text =
        editedPlainTextGetterRef.current?.() ||
        (state as any)?.draft ||
        currentDraftText ||
        '';

      if (text) {
        try {
          await updateSavedRasmMutation.mutateAsync({
            sessionToken,
            id: rasmId,
            draft: text,
          });
        } catch {}
      }

      // Try savePatchDraft if baseDocUrl is available
      const attachments = (rasmQuery.data as any)?.attachments || [];
      const pickUrl = (att: any) =>
        att?.fileUrl || att?.url || att?.file_url || att?.publicUrl || att?.remoteUrl || null;
      const isDocxLikeItem = (a: any) => {
        const name = String(a?.fileName || a?.name || '').toLowerCase();
        const cat = String(a?.category || '').toLowerCase();
        const type = String(a?.mimeType || a?.type || '').toLowerCase();
        return cat.includes('docx') || name.endsWith('.docx') || type.includes('wordprocessingml');
      };
      const baseDocxAtt = attachments.find((a: any) => isDocxLikeItem(a)) || selectedVaultDoc;
      const baseDocUrl = baseDocxAtt ? pickUrl(baseDocxAtt) : null;

      if (text && baseDocUrl && typeof baseDocUrl === 'string' && /^https?:/i.test(baseDocUrl)) {
        try {
          const patch = { version: 1 as const, ops: [{ op: 'set_plain_text' as const, value: text }] };
          await savePatchDraftMutation.mutateAsync({
            sessionToken,
            savedRasmId: rasmId,
            baseDocUrl,
            patch,
            supersedesVersionId: latestAuditVersionId || undefined,
          });
        } catch {}
      }

      await rasmQuery.refetch();
      try {
        await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken, id: rasmId });
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken } as any);
      } catch {}

      revokePrimaryDocBlobUrl();

      const freshRes = await rasmQuery.refetch();
      const freshData = (freshRes?.data || null) as any;
      const latestPdfUrl =
        freshData?.latestDraftPdfUrl ||
        (freshData?.attachments || []).find(
          (a: any) =>
            String(a?.category || '').toLowerCase() === 'audit_final_pdf' ||
            String(a?.file_name || a?.fileName || '').endsWith('.pdf')
        )?.file_url;

      if (latestPdfUrl) {
        const cacheBusted = `${latestPdfUrl}${latestPdfUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`;
        setSelectedVaultDoc({
          id: `edited-${Date.now()}`,
          fileUrl: cacheBusted,
          url: cacheBusted,
          mimeType: 'application/pdf',
          category: 'audit_final_pdf',
          content: text,
          rawContent: text,
        });
        setActiveEditedArtifact({
          versionId: String(Date.now()),
          url: cacheBusted,
          kind: 'pdf',
        });
        setActiveDocVersion('edited');
      }

      setViewerDocRenderNonce((n) => n + 1);
      setActiveViewMode('preview');
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ التعديلات: ' + (err?.message || String(err)));
    } finally {
      setIsSavingEdits(false);
    }
  }, [
    currentDraftText,
    forceOnlyOfficeSaveMutation,
    latestAuditVersionId,
    onlyOfficeConfig,
    rasmId,
    rasmQuery,
    savePatchDraftMutation,
    selectedVaultDoc,
    sessionToken,
    state,
    trpcUtils,
    updateSavedRasmMutation,
  ]);

  const resolveActiveDocxTarget = useCallback(() => {
    // Helper to sanitize filename to clean .docx extension
    const sanitizeDocxFileName = (name?: string) => {
      const base = (name || `رسم_عدلي_${finalRecord.serial || 'document'}`)
        .replace(/\.pdf$/i, '')
        .replace(/\.docx$/i, '')
        .trim();
      return `${base || 'document'}.docx`;
    };

    // Extract active rasm text / HTML content across all possible sources
    const activeContent =
      (typeof currentDraftText === 'string' && currentDraftText.trim().length > 0 ? currentDraftText : '') ||
      (typeof (state as any)?.draft === 'string' && (state as any).draft.trim().length > 0 ? (state as any).draft : '') ||
      (selectedVaultDoc as any)?.content ||
      (selectedVaultDoc as any)?.rawContent ||
      (selectedVaultDoc as any)?.textContent ||
      (selectedVaultDoc as any)?.previewTextContent ||
      (selectedVaultDoc as any)?.rasmHtml ||
      (rasmQuery.data as any)?.rasmHtml ||
      (rasmQuery.data as any)?.payload?.rasmHtml ||
      (rasmQuery.data as any)?.payload?.draft ||
      (rasmQuery.data as any)?.payload?.content ||
      (rasmQuery.data as any)?.draft ||
      '';

    const defaultFileName = sanitizeDocxFileName(selectedVaultDoc?.fileName || (rasmQuery.data as any)?.documentType || finalRecord.serial);

    // 1. Freshly imported or edited artifact in current session (if DOCX)
    if (activeEditedArtifact?.url && activeEditedArtifact.kind === 'docx') {
      return {
        url: activeEditedArtifact.url,
        fileName: defaultFileName,
        textContent: activeContent
      };
    }

    // 2. Currently selected document if explicitly a DOCX asset (NOT a PDF)
    // 2. Canonical DB row primary_docx_url pointer
    const canonicalDocxUrl =
      (rasmQuery.data as any)?.primary_docx_url ||
      (rasmQuery.data as any)?.payload?.primary_docx_url ||
      (rasmQuery.data as any)?.payload?.primaryAttachmentUrl ||
      (rasmQuery.data as any)?.latestDraftDocxUrl;

    if (canonicalDocxUrl && typeof canonicalDocxUrl === 'string' && !canonicalDocxUrl.startsWith('html://') && canonicalDocxUrl !== 'draft://main') {
      const lower = canonicalDocxUrl.toLowerCase();
      if (!lower.endsWith('.pdf') && !lower.includes('application/pdf')) {
        return {
          url: canonicalDocxUrl,
          fileName: defaultFileName,
          textContent: activeContent
        };
      }
    }

    // 3. Currently selected document if explicitly a DOCX asset (NOT a PDF)
    const selectedDocxUrl = (selectedVaultDoc as any)?.docxUrl;
    if (selectedDocxUrl && typeof selectedDocxUrl === 'string' && !selectedDocxUrl.startsWith('html://') && selectedDocxUrl !== 'draft://main') {
      return {
        url: selectedDocxUrl,
        fileName: defaultFileName,
        textContent: activeContent
      };
    }

    const selectedUrl = selectedVaultDoc?.url || selectedVaultDoc?.fileUrl;
    const selectedName = String(selectedVaultDoc?.fileName || '').toLowerCase();
    const selectedMime = String(selectedVaultDoc?.mimeType || selectedVaultDoc?.type || '').toLowerCase();
    const isExplicitDocx = (selectedName.endsWith('.docx') || selectedMime.includes('wordprocessingml')) && !selectedName.endsWith('.pdf') && !selectedMime.includes('pdf');

    if (isExplicitDocx && selectedUrl && typeof selectedUrl === 'string' && !selectedUrl.startsWith('html://') && selectedUrl !== 'draft://main') {
      return {
        url: selectedUrl,
        fileName: defaultFileName,
        textContent: activeContent
      };
    }

    // 3. Persisted DOCX attachment in database record
    // 4. Persisted DOCX attachment in database record
    const attachments = (rasmQuery.data as any)?.attachments || [];
    const primaryDocx = attachments.find((a: any) => {
      const cat = String(a?.category || '').toLowerCase();
      const name = String(a?.fileName || a?.name || a?.file_name || '').toLowerCase();
      const mime = String(a?.mimeType || a?.type || a?.mime_type || '').toLowerCase();
      return (cat === 'audit_final_docx' || cat === 'primary_attachment' || cat === 'judge_attachment_docx' || name.endsWith('.docx') || mime.includes('wordprocessingml')) && !name.endsWith('.pdf') && !mime.includes('pdf');
    });

    if (primaryDocx && (primaryDocx.fileUrl || primaryDocx.url)) {
      return { 
        url: primaryDocx.fileUrl || primaryDocx.url, 
        fileName: sanitizeDocxFileName(primaryDocx.fileName || primaryDocx.name || defaultFileName),
        textContent: activeContent
      };
    }

    // 4. Default / Fallback: Compile fresh native DOCX from active content
    // 5. Default / Fallback: Compile fresh native DOCX from active content
    return { 
      url: undefined,
      textContent: activeContent, 
      fileName: defaultFileName
    };
  }, [activeEditedArtifact, currentDraftText, finalRecord.serial, rasmQuery.data, selectedVaultDoc, state]);

  const handleDownloadDocx = useCallback(async () => {
    try {
      const target = resolveActiveDocxTarget();
      const fileName = target.fileName || `رسم_عدلي_${finalRecord.serial || 'document'}.docx`;

      // If target.url is present, check if it's a valid DOCX binary stream
      if (target.url && typeof target.url === 'string' && (target.url.startsWith('http') || target.url.startsWith('data:') || target.url.startsWith('blob:'))) {
        try {
          const resp = await fetch(target.url);
          if (resp.ok) {
            const blob = await resp.blob();
            // Guard: If the fetched blob is a PDF, do NOT download it as .docx; fall through to template compilation!
            if (!blob.type.includes('pdf')) {
              const objectUrl = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = objectUrl;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(objectUrl);
              return;
            }
          }
        } catch (fetchErr) {
          console.warn('Direct docx fetch failed, falling back to compile template:', fetchErr);
        }
      }

      // If target.url was not docx or direct fetch was bypassed, compile native OpenXML .docx from active content
      const contentToCompile = (target.textContent && target.textContent.trim().length > 0)
        ? target.textContent
        : (currentDraftText || (state as any)?.draft || (rasmQuery.data as any)?.rasmHtml || (rasmQuery.data as any)?.draft || '');

      if (contentToCompile && contentToCompile.trim().length > 0) {
        const docxBlob = await generateDocxBlobFromTemplate(contentToCompile);
        const objectUrl = URL.createObjectURL(docxBlob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
        return;
      }

      alert('لم يتم العثور على محتوى لتصديره بصيغة Word (.docx).');
    } catch (err: any) {
      alert('حدث خطأ أثناء تصدير ملف Word: ' + (err?.message || String(err)));
    }
  }, [currentDraftText, finalRecord.serial, rasmQuery.data, resolveActiveDocxTarget, state]);

  const handleImportDocxFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !rasmId || !sessionToken) return;
    e.target.value = '';
    setIsImportingDocx(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const res = await updateSavedRasmMutation.mutateAsync({
        sessionToken,
        id: rasmId,
        files: [{
          name: file.name,
          size: file.size,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          category: 'document',
          base64,
        }],
      });

      revokePrimaryDocBlobUrl();

      const timeStamp = Date.now();
      const rawPdfUrl = (res as any)?.pdfPreviewUrl || (res as any)?.previewPdfUrl || (res as any)?.fileUrl || (res as any)?.savedUrl;
      const rawDocxUrl = (res as any)?.primaryDocxUrl || (res as any)?.previewDocxUrl || (res as any)?.docxUrl || (res as any)?.files?.[0]?.url || (res as any)?.files?.[0]?.fileUrl;
      
      const cbPdfUrl = rawPdfUrl ? (rawPdfUrl.includes('cb=') ? rawPdfUrl : `${rawPdfUrl}${rawPdfUrl.includes('?') ? '&' : '?'}cb=${timeStamp}`) : `${rawDocxUrl}?cb=${timeStamp}`;
      const cbDocxUrl = rawDocxUrl ? (rawDocxUrl.includes('cb=') ? rawDocxUrl : `${rawDocxUrl}${rawDocxUrl.includes('?') ? '&' : '?'}cb=${timeStamp}`) : `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;

      // 1. Force state update immediately in React state
      setSelectedVaultDoc({
        id: `imported-${timeStamp}`,
        url: cbPdfUrl,
        fileUrl: cbPdfUrl,
        docxUrl: cbDocxUrl,
        mimeType: 'application/pdf',
        category: 'audit_final_pdf',
        fileName: file.name
      });

      setForcedViewerDoc({
        id: `imported-${timeStamp}`,
        url: cbPdfUrl,
        fileUrl: cbPdfUrl,
        docxUrl: cbDocxUrl,
        mimeType: 'application/pdf',
        category: 'audit_final_pdf'
      });

      setActiveEditedArtifact({
        versionId: `imported-${timeStamp}`,
        url: cbDocxUrl,
        pdfUrl: cbPdfUrl,
        kind: 'docx'
      });

      setActiveDocVersion('edited');
      setViewerDocRenderNonce((n) => n + 1);
      setActiveViewMode('preview');

      // 2. Refetch query to align background cache
      try {
        await trpcUtils.feesAgent.documents.getSavedRasm.refetch({ sessionToken, id: rasmId });
      } catch {}
      await rasmQuery.refetch();
      try {
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken } as any);
      } catch {}

      alert('تم استبدال النسخة الرئيسية وتحديث المعاينة بنجاح');
    } catch (err: any) {
      alert('فشل رفع ومعالجة ملف Word: ' + (err?.message || String(err)));
    } finally {
      setIsImportingDocx(false);
    }
  }, [rasmId, rasmQuery, revokePrimaryDocBlobUrl, sessionToken, trpcUtils.feesAgent.documents, updateSavedRasmMutation]);

  const handleToggleEditMode = useCallback(async () => {
    if (!isAuditHubEditMode) {
      if (currentDraftText) {
        updateDraftContent(currentDraftText);
      }
      setIsAuditHubEditMode(true);
    } else {
      setIsAuditHubEditMode(false);
    }
  }, [currentDraftText, isAuditHubEditMode]);

  const refreshAfterOnlyOfficeSave = useCallback((opts?: {
    requirePdf?: boolean;
    requestedAfterMs?: number;
    baselineOverride?: { versionId: string | null; updatedAt: string | null };
    forceSaveRequestId?: string | null;
  }) => (async () => {
    const baseline = opts?.baselineOverride || onlyOfficeBaselineRef.current;
    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    let lastData: any = null;

    for (let attempt = 0; attempt < 12; attempt++) {
      let nextData: any = null;
      try {
        const refetchRes = await rasmQuery.refetch();
        nextData = refetchRes?.data || null;
      } catch {}
      lastData = nextData;

      const nextVersionId = (nextData?.latestDraftVersionId as string | null) || null;
      const nextUpdatedAt =
        (nextData?.latestDraftUpdatedAt as string | null) ||
        String((nextData?.payload as any)?.latestDocumentUpdatedAt || '') ||
        null;
      const nextUpdatedAtMs = nextUpdatedAt ? Date.parse(nextUpdatedAt) : 0;
      const attachments = Array.isArray(nextData?.attachments) ? nextData.attachments : [];
      const latestDraftDocxUrl = String(nextData?.latestDraftDocxUrl || '').trim() || null;
      const payloadForceSaveRequestId =
        String((nextData?.payload as any)?.latestForceSaveRequestId || '').trim() || null;
      const hasMatchingDocx = !!attachments.find((attachment: any) => {
        const category = String(attachment?.category || '').toLowerCase();
        const attachmentVersionId = String(attachment?.metadata?.versionId || attachment?.metadata?.version_id || '').trim();
        const attachmentUrl = String(attachment?.fileUrl || attachment?.url || '').trim();
        if (nextVersionId && attachmentVersionId && attachmentVersionId === nextVersionId) {
          return category === 'audit_final_docx' || category === 'audit_draft_docx';
        }
        return !!latestDraftDocxUrl && attachmentUrl === latestDraftDocxUrl;
      });
      const hasMatchingPdf = !!attachments.find((attachment: any) => {
        const category = String(attachment?.category || '').toLowerCase();
        const attachmentVersionId = String(attachment?.metadata?.versionId || attachment?.metadata?.version_id || '').trim();
        if (category !== 'audit_final_pdf' && category !== 'audit_draft_pdf') return false;
        if (!nextVersionId) return true;
        return attachmentVersionId === nextVersionId;
      });
      const hasExactForceSaveRequest = !opts?.forceSaveRequestId || payloadForceSaveRequestId === opts.forceSaveRequestId || !!attachments.find((attachment: any) => {
        const attachmentRequestId = String(attachment?.metadata?.forceSaveRequestId || '').trim();
        return attachmentRequestId && attachmentRequestId === opts.forceSaveRequestId;
      });

      const changed =
        (nextVersionId && nextVersionId !== baseline.versionId) ||
        (nextUpdatedAt && nextUpdatedAt !== baseline.updatedAt);
      const materialized = opts?.requirePdf ? hasMatchingPdf : (hasMatchingDocx || hasMatchingPdf);
      const freshEnough = opts?.requestedAfterMs ? nextUpdatedAtMs >= (opts.requestedAfterMs - 1000) : true;
      const confirmedByForceSaveRequest = !!opts?.forceSaveRequestId && hasExactForceSaveRequest;

      if ((changed || confirmedByForceSaveRequest) && materialized && freshEnough && hasExactForceSaveRequest) {
        onlyOfficeBaselineRef.current = {
          versionId: nextVersionId || baseline.versionId,
          updatedAt: nextUpdatedAt || baseline.updatedAt,
        };
        setLatestSavedDocsPointerUpdatedAt(nextUpdatedAt || null);
        if (nextVersionId) {
          setLatestAuditVersionId(nextVersionId);
        }
        setViewerDocRenderNonce((n) => n + 1);
        reloadEmbeddedOnlyOfficeToLatestVersion();
        return nextData;
      }

      await wait(500 + attempt * 250);
    }

    setViewerDocRenderNonce((n) => n + 1);
    return lastData;
  })(), [rasmQuery, reloadEmbeddedOnlyOfficeToLatestVersion]);

  const syncLatestSavedDraftState = useCallback(async (opts?: {
    requirePdf?: boolean;
    requestedAfterMs?: number;
    baselineOverride?: { versionId: string | null; updatedAt: string | null };
    forceSaveRequestId?: string | null;
  }) => {
    try {
      const refreshed = await refreshAfterOnlyOfficeSave(opts);
      if (refreshed) {
        return refreshed;
      }
    } catch {}

    try {
      const refetchRes = await rasmQuery.refetch();
      return refetchRes?.data || rasmQuery.data || null;
    } catch {
      return rasmQuery.data || null;
    }
  }, [rasmQuery, refreshAfterOnlyOfficeSave]);

  const openNotarySigningFromAuditHub = useCallback(async (opts?: { skipInitialSave?: boolean; targetDocType?: string }) => {
    if (!rasmId || !state) return;
    const clickStartedAtMs = Date.now();
    const fallbackDocumentType =
      opts?.targetDocType ||
      String(
        (state as any)?.documentType ||
          (rasmQuery.data as any)?.documentType ||
          ((rasmQuery.data as any)?.payload as any)?.documentType ||
          'باقي_الوثائق'
      ).trim() || 'باقي_الوثائق';
    const currentDocContent = String(
      editedPlainTextGetterRef.current?.() ||
        (state as any)?.draft ||
        (selectedVaultDoc?.isDraft ? selectedVaultDoc?.content : '') ||
        ''
    ).trim();
    const finalReviewChecklist = buildFinalReviewChecklist();
    const generatedForceSaveRequestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `forcesave-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let awaitedForceSaveRequestId: string | null = null;
    const baselineAtClick = {
      versionId: ((rasmQuery.data as any)?.latestDraftVersionId as string | null) || null,
      updatedAt:
        ((rasmQuery.data as any)?.latestDraftUpdatedAt as string | null) ||
        String(((rasmQuery.data as any)?.payload as any)?.latestDocumentUpdatedAt || '') ||
        null,
    };

    setSigningTransition((prev) => ({
      active: true,
      progress: Math.max(prev.progress, 20),
      message: prev.message || 'جاري تجهيز آخر نسخة قبل الانتقال إلى رواق التوقيع...',
    }));

    if (!opts?.skipInitialSave) {
      try {
        await updateSavedRasmMutation.mutateAsync({
          sessionToken: sessionToken || '',
          id: rasmId,
          documentType: fallbackDocumentType,
          draft: currentDocContent,
          payload: {
            ...state,
            documentType: fallbackDocumentType,
            draft: currentDocContent,
            propertyUnits,
            isUnitsAvailable,
            isFinancialAvailable,
            finalReviewChecklist,
          },
          files: undefined,
        });
        await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken: sessionToken || '', id: rasmId });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[AUDITHUB -> SIGNING] finalReviewChecklist persist failed', error);
      }
    }

    if (isEmbeddedOnlyOfficeActive && onlyOfficeConfig && sessionToken) {
      const documentKey = String((onlyOfficeConfig as any)?.document?.key || '').trim();
      if (documentKey) {
        setSigningTransition({
          active: true,
          progress: 24,
          message: 'جاري حفظ آخر تعديلات OnlyOffice...',
        });
        try {
          const forceSaveRes = await forceOnlyOfficeSaveMutation.mutateAsync({
            sessionToken: sessionToken || '',
            savedRasmId: rasmId,
            documentKey,
            requestId: generatedForceSaveRequestId,
          });
          awaitedForceSaveRequestId = forceSaveRes?.errorCode === 0 ? generatedForceSaveRequestId : null;
        } catch (err: any) {
          // Non-fatal: 404 means the OnlyOffice session has expired or was never started.
          // The payload was already persisted above — proceed to signing without a force-save pointer.
          const errMsg = String(err?.message || err || '');
          const is404 = errMsg.includes('404') || (err?.data?.httpStatus === 404);
          if (is404) {
            // eslint-disable-next-line no-console
            console.warn('[AUDITHUB -> SIGNING] OnlyOffice force-save returned 404 — session likely expired. Proceeding without force-save lock.', err);
            awaitedForceSaveRequestId = null;
            // Continue execution — do NOT return
          } else {
            setSigningTransition({ active: false, progress: 0, message: '' });
            alert('تعذر فرض حفظ التعديلات الأخيرة قبل التوقيع.\n\n' + errMsg);
            return;
          }
        }
      }
    }

    setSigningTransition({
      active: true,
      progress: 75,
      message: 'جاري تجهيز المستند الرئيسي للتوقيع...',
    });

    let finalPdfUrl: string | null = null;
    try {
      const prepared = await prepareSigningPortalDocumentMutation.mutateAsync({
        sessionToken: sessionToken || '',
        id: rasmId,
        forceSaveRequestId: awaitedForceSaveRequestId,
      });
      finalPdfUrl = String(prepared?.finalPdfUrl || '').trim() || null;
    } catch (err: any) {
      setSigningTransition({ active: false, progress: 0, message: '' });
      alert('تعذر تجهيز المستند الرئيسي للتوقيع.\n\n' + (err?.message || String(err)));
      return;
    }

    if (!finalPdfUrl) {
      // If the rasm is a pure HTML/draft document (no uploaded DOCX), navigate to signing portal
      // anyway — it will render from payload.rasmHtml / payload.draft directly.
      const hasDraftContent = !!(
        (state as any)?.rasmHtml ||
        (state as any)?.draft ||
        ((rasmQuery.data as any)?.payload as any)?.rasmHtml ||
        ((rasmQuery.data as any)?.payload as any)?.draft
      );
      if (!hasDraftContent) {
        setSigningTransition({ active: false, progress: 0, message: '' });
        alert('تعذر العثور على المستند الرئيسي للتوقيع. يرجى التحقق من أن الرسم قد تم حفظه وتحضيره بشكل صحيح.');
        return;
      }
      // hasDraftContent — continue to signing portal without a PDF pointer
    }

    const navState: Record<string, unknown> = {
      finalPdfUrl,
      requestedAfterMs: clickStartedAtMs,
    };

    if (awaitedForceSaveRequestId) {
      navState.forceSaveRequestId = awaitedForceSaveRequestId;
    }

    setSigningTransition({
      active: true,
      progress: 100,
      message: 'جاري فتح رواق التوقيع على المستند الرئيسي...',
    });
    navigate(`/notary-signing-portal/sign/${rasmId}`, { state: navState });
  }, [
    forceOnlyOfficeSaveMutation,
    isEmbeddedOnlyOfficeActive,
    navigate,
    onlyOfficeConfig,
    prepareSigningPortalDocumentMutation,
    rasmId,
    rasmQuery.data,
    sessionToken,
    selectedVaultDoc,
    syncLatestSavedDraftState,
    state,
    trpcUtils,
    updateSavedRasmMutation,
    propertyUnits,
    isUnitsAvailable,
    isFinancialAvailable,
    buildFinalReviewChecklist,
  ]);

  useEffect(() => {
    const autoKey =
      isEmbeddedOnlyOfficeActive && sessionToken && rasmId
        ? `${rasmId}:base`
        : null;

    if (!autoKey) return;

    if (
      onlyOfficeMode === 'embedded' &&
      onlyOfficeDsUrl &&
      onlyOfficeConfig &&
      onlyOfficePaneStatus !== 'error'
    ) {
      onlyOfficeAutoLoadKeyRef.current = autoKey;
      return;
    }

    if (
      onlyOfficeAutoLoadKeyRef.current === autoKey ||
      onlyOfficeAutoLoadKeyRef.current === `loading:${autoKey}`
    ) {
      return;
    }

    onlyOfficeAutoLoadKeyRef.current = `loading:${autoKey}`;
    void (async () => {
      const loaded = await loadOnlyOfficeConfig({ mode: 'embedded', silent: true });
      if (loaded) {
        onlyOfficeAutoLoadKeyRef.current = autoKey;
      } else if (onlyOfficeAutoLoadKeyRef.current === `loading:${autoKey}`) {
        onlyOfficeAutoLoadKeyRef.current = null;
      }
    })();
  }, [
    activeDocVersion,
    isEmbeddedOnlyOfficeActive,
    loadOnlyOfficeConfig,
    onlyOfficeConfig,
    onlyOfficeDsUrl,
    onlyOfficeMode,
    onlyOfficePaneStatus,
    rasmId,
    sessionToken,
  ]);

  useEffect(() => {
    if (!isEmbeddedOnlyOfficeActive) return;
    if (onlyOfficeMode !== 'embedded') {
      setOnlyOfficeMode('embedded');
    }
  }, [isEmbeddedOnlyOfficeActive, onlyOfficeMode]);

  useEffect(() => {
    if (!isEmbeddedOnlyOfficeActive) {
      setOnlyOfficeLoadStartedAt(null);
      return;
    }

    if (onlyOfficePaneStatus === 'ready' || onlyOfficePaneStatus === 'error' || onlyOfficePaneStatus === 'idle') {
      setOnlyOfficeLoadStartedAt(null);
    }
  }, [isEmbeddedOnlyOfficeActive, onlyOfficePaneStatus]);

  useEffect(() => {
    if (!isEmbeddedOnlyOfficeActive) {
      onlyOfficeEmbeddedRetryRef.current = 0;
      return;
    }

    if (onlyOfficePaneStatus !== 'loading-config' && onlyOfficePaneStatus !== 'loading-editor') {
      if (onlyOfficePaneStatus === 'ready' || onlyOfficePaneStatus === 'error') {
        onlyOfficeEmbeddedRetryRef.current = 0;
      }
      return;
    }

    const retryTimer = window.setTimeout(() => {
      if (onlyOfficeEmbeddedRetryRef.current >= 1) return;
      onlyOfficeEmbeddedRetryRef.current += 1;
      void loadOnlyOfficeConfig({ mode: 'embedded', silent: true, force: true });
    }, 4000);

    const elapsedMs = onlyOfficeLoadStartedAt ? Date.now() - onlyOfficeLoadStartedAt : 0;
    const remainingMs = Math.max(0, 10000 - elapsedMs);

    const failoverTimer = window.setTimeout(() => {
      setOnlyOfficeError('تجاوز تحميل OnlyOffice الوقت المتوقع. تم التحويل إلى المعاينة البديلة.');
      setOnlyOfficeLoadStartedAt(null);
      setOnlyOfficePaneStatus('error');
    }, remainingMs);

    return () => {
      window.clearTimeout(retryTimer);
      window.clearTimeout(failoverTimer);
    };
  }, [isEmbeddedOnlyOfficeActive, loadOnlyOfficeConfig, onlyOfficeLoadStartedAt, onlyOfficePaneStatus]);

  // Legacy inline WordPreview editor revert removed (OnlyOffice is used for WYSIWYG editing).

  const handleSaveToCategory = async (selectedDocType: string) => {
    if (!sessionToken) {
      alert('خطأ: لم يتم العثور على جلسة المستخدم. يرجى تسجيل الدخول من جديد.');
      return;
    }

    const latestRasmData: any = rasmQuery.data;
    const latestAttachments = Array.isArray(latestRasmData?.attachments) ? latestRasmData.attachments : [];
    const latestEditedDocxAttachment = latestAttachments.find((attachment: any) => {
      const category = String(attachment?.category || '').toLowerCase();
      return category === 'audit_final_docx' || category === 'audit_draft_docx';
    });
    const latestEditedPdfAttachment = latestAttachments.find((attachment: any) => {
      const category = String(attachment?.category || '').toLowerCase();
      return category === 'audit_final_pdf' || category === 'audit_draft_pdf';
    });
    const latestEditedAttachment = latestEditedPdfAttachment || latestEditedDocxAttachment || null;
    
    // 1. Capture current content
    const currentDocContent = String(
      editedPlainTextGetterRef.current?.() ||
        (state as any)?.draft ||
        (selectedVaultDoc?.isDraft ? selectedVaultDoc?.content : '') ||
        ''
    ).trim();

    const editedVersionId =
      (latestRasmData?.latestDraftVersionId as string | null) ||
      String((latestEditedAttachment as any)?.metadata?.versionId || (latestEditedAttachment as any)?.metadata?.version_id || '') ||
      activeEditedArtifact?.versionId ||
      latestAuditVersionId ||
      null;
    const editedUrl =
      String(
        latestEditedPdfAttachment?.fileUrl ||
        latestEditedDocxAttachment?.fileUrl ||
        latestRasmData?.latestDraftDocxUrl ||
        activeEditedArtifact?.url ||
        ''
      ).trim() || null;

    // Race guard: if user is on edited view, require a versionId/url.
    if ((activeDocVersion as any) === 'edited' && !editedVersionId) {
      alert('تعذر الحفظ إلى الوجهة لأن نسخة التعديل لم تُثبت بعد. يرجى انتظار اكتمال "Save edit" ثم المحاولة.');
      return;
    }

    // Race guard (stronger): require backend confirmation that Saved Rasm pointer was updated.
    if ((activeDocVersion as any) === 'edited' && !(latestRasmData?.latestDraftUpdatedAt || latestSavedDocsPointerUpdatedAt)) {
      alert('يرجى انتظار اكتمال حفظ التعديل وتأكيد تحديث نسخة الوثيقة قبل المتابعة إلى الحفظ/التصنيف.');
      return;
    }

    const stateAny = state as any;
    const primaryNotaryName =
      (stateAny?.notaries?.primary as string | undefined) ||
      (stateAny?.notaries?.notary1Name as string | undefined) ||
      (stateAny?.meta?.notaryPrimary as string | undefined) ||
      (user?.full_name ?? null);
    const secondaryNotaryName =
      (stateAny?.notaries?.secondary as string | undefined) ||
      (stateAny?.notaries?.notary2Name as string | undefined) ||
      (stateAny?.meta?.notarySecondary as string | undefined) ||
      null;

    const finalPayload = {
      ...state,
      draft: currentDocContent,
      propertyUnits,
      isUnitsAvailable,
      isFinancialAvailable,
      optionalParties: Array.isArray((finalRecord as any).optionalParties) ? (finalRecord as any).optionalParties : [],
      finalReviewChecklist: buildFinalReviewChecklist(),
      // Persist inclusion refs entered in AuditHub so downstream (signature + signed viewer)
      // can gather them automatically from saved_rasms.payload.
      registerNumber: finalRecord.register,
      certificateNumber: finalRecord.count,
      registryPage: finalRecord.page,
      inclusionDate: finalRecord.registrationDate || finalRecord.date,
      court: finalRecord.authority,
      // Persist notary identity from logged-in user + known meta.
      notary1Name: primaryNotaryName,
      notary2Name: secondaryNotaryName,
      phone: notaryProfile?.phone || null,
      email: user?.email || null,
      auditHubInclusion: {
        registerNumber: finalRecord.register,
        certificateNumber: finalRecord.count,
        registryPage: finalRecord.page,
        inclusionDate: finalRecord.registrationDate || finalRecord.date,
        court: finalRecord.authority,
        serial: finalRecord.serial,
        certificateType: finalRecord.certificateType,
        registrationDate: finalRecord.registrationDate || null,
        documentDate: finalRecord.date || null,
        notary1Name: primaryNotaryName,
        notary2Name: secondaryNotaryName,
        phone: notaryProfile?.phone || null,
        email: user?.email || null,
      },
      // Persist edited artifact identity for Saved Documents (stable across refresh/users)
      auditDocVersionId: editedVersionId,
      auditEditedArtifactUrl: editedUrl,
    };

    const isSigningIntent = saveCategoryIntent === 'signing';

    // ⚡ INSTANT RESPONSE:
    // When moving to signing, immediately dismiss modal and activate high-fidelity signing transition screen
    if (isSigningIntent) {
      setIsSaveCategoryModalOpen(false);
      setSigningTransition({
        active: true,
        progress: 15,
        message: 'جاري حفظ التصنيف وتجهيز رواق التوقيع...',
      });
    }

    try {
      setIsCategorySaving(true);
      
      let finalId = rasmId;

      if (!finalId) {
        // Fresh creation if no ID yet (blank start)
        const res: any = await createSavedRasmMutation.mutateAsync({
            sessionToken,
            documentType: selectedDocType,
            draft: currentDocContent,
            payload: finalPayload,
            fileNumber: (state as any)?.meta?.fileNumber || (state as any)?.fileNumber,
            files: undefined
        });
        finalId = res.id;

        // eslint-disable-next-line no-console
        console.log('[SAVE]', {
          rasmId: finalId,
          savedAttachmentId: res?.savedAttachmentId ?? null,
          savedCategory: res?.savedCategory ?? null,
          savedUrl: res?.savedUrl ?? null,
          auditDocVersionId: editedVersionId,
          hasInlinePdf: false,
        });
      } else {
        // Update existing
        const res: any = await updateSavedRasmMutation.mutateAsync({
            sessionToken,
            id: finalId,
            documentType: selectedDocType,
            draft: currentDocContent,
            payload: finalPayload,
            files: undefined
        });

        // eslint-disable-next-line no-console
        console.log('[SAVE]', {
          rasmId: finalId,
          savedAttachmentId: res?.savedAttachmentId ?? null,
          savedCategory: res?.savedCategory ?? null,
          savedUrl: res?.savedUrl ?? null,
          auditDocVersionId: editedVersionId,
          hasInlinePdf: false,
        });
      }

      setState((prev) => (prev ? ({ ...(prev as any), documentType: selectedDocType } as any) : prev));

      // Keep the saved version visible in the viewer by updating the primary DOCX attachment
      // Only needed for regular save; signing transition prepares the final document directly in openNotarySigningFromAuditHub
      if (!isSigningIntent) {
        try {
          if (finalId && currentDocContent && !isEmbeddedOnlyOfficeActive) {
            await savePrimaryFromInlineText(currentDocContent, { savedRasmId: finalId });
          }
        } catch (e) {
        }
      }

      setIsSaveCategoryModalOpen(false);
      setIsCategorySaving(false);

      // Ensure Saved Documents sees the newly persisted changes immediately.
      try {
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken: sessionToken || '' } as any);
      } catch {}
      try {
        if (finalId) {
          await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken: sessionToken || '', id: finalId } as any);
        }
      } catch {}

      if (isSigningIntent) {
        // Pass skipInitialSave: true because updateSavedRasmMutation was just completed above with selectedDocType
        await openNotarySigningFromAuditHub({ skipInitialSave: true, targetDocType: selectedDocType });
        return;
      }

      // Show success message
      setSuccessMessage({ show: true, docId: finalId });
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage({ show: false });
      }, 5000);
    } catch (err: any) {
      setIsSaveCategoryModalOpen(false);
      setIsCategorySaving(false);
      setSigningTransition({ active: false, progress: 0, message: '' });
      const errorMsg = err?.message || String(err);
      alert('خطأ أثناء الحفظ والتصنيف:\n\n' + errorMsg + '\n\nتحقق من أن جميع البيانات المطلوبة قد تمت ملؤها بشكل صحيح.');
    }
  };

  if (rasmQuery.isLoading || !state) return (
    <div className={`h-[calc(100vh-5rem)] min-h-[500px] flex flex-col items-center justify-center gap-6 transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="relative">
        <div className="w-24 h-24 border-4 border-blue-500/20 rounded-full"></div>
        <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0 shadow-lg shadow-blue-500/20"></div>
        <Shield className="w-10 h-10 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="font-black text-3xl font-amiri tracking-tight">جاري تحضير منصة التضمين</h2>
        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest animate-pulse">Initializing Secure Registration Hub</p>
      </div>
    </div>
  );
  
  if (error || rasmQuery.error) return (
    <div className="h-[calc(100vh-5rem)] min-h-[500px] flex items-center justify-center bg-red-50 p-6 md:p-12">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border-2 border-red-100 flex flex-col items-center gap-6 max-w-lg text-center">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 font-amiri">عذراً، تعذر تحميل البيانات</h3>
        <p className="text-slate-600 font-medium leading-relaxed">{error || (rasmQuery.error as any)?.message}</p>
        <button onClick={() => navigate(-1)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">العودة للخلف</button>
      </div>
    </div>
  );

  const getDocTypeColor = (type: string) => {
    if (type.includes('زواج') || type.includes('طلاق')) return 'bg-emerald-600';
    if (type.includes('بيع') || type.includes('شراء')) return 'bg-blue-700';
    return 'bg-slate-700';
  };

  const needsFiscal = !state.documentType?.includes('زواج') && !state.documentType?.includes('طلاق') && !state.documentType?.includes('اراثة');
  const needsRegistrationReview = (() => {
    const docType = (state?.documentType || '').toString().replace(/_/g, ' ');
    const contractIsTypicallyRegistrable =
      docType.includes('بيع') ||
      docType.includes('هبة') ||
      docType.includes('مقاسمة') ||
      docType.includes('قسمة') ||
      docType.includes('تفويت') ||
      docType.includes('تسليم') ||
      docType.includes('بعوض') ||
      docType.includes('مناقلة');
    const flaggedBySystem = (state as any)?.step7FiscalNature === 'subject';
    return Boolean(contractIsTypicallyRegistrable || flaggedBySystem);
  })();

  return (
    <div className="flex flex-col h-full min-h-0 w-full overflow-hidden bg-[linear-gradient(135deg,#EAF4FF_0%,#F4F7FB_100%)] font-amiri" dir="rtl">
      
      {/* ZONE 1: HEADER (Fixed) */}
      <header className="h-[70px] shrink-0 bg-[linear-gradient(90deg,#1E88E5_0%,#6A1B9A_100%)] text-white shadow-lg z-50 px-6 flex items-center justify-between relative">
         <div className="flex items-center gap-4">
             {/* Logo / Badge */}
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
                    <Shield className="w-6 h-6 text-white" />
                 </div>
                 <div className="flex flex-col">
                     <h1 className="text-lg font-black tracking-tight leading-none">مسار المراقبة و التضمين</h1>
                     <span className="text-[10px] text-blue-100 font-bold opacity-80 uppercase tracking-widest">Smart Audit Hub</span>
                 </div>
             </div>
             <div className="h-8 w-px bg-white/20 mx-2"></div>
             {/* Fee Info */}
             <div className="flex items-center gap-6">
                 <div className="flex flex-col">
                     <span className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">رقم الرسم</span>
                     <span className="text-sm font-black font-mono">{finalRecord.serial}</span>
                 </div>
                 <div className="flex flex-col border-r border-white/10 pr-4">
                     <span className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">الموثق</span>
                     <span className="text-sm font-bold">{finalRecord.notaryName || '---'}</span>
                 </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-xs font-bold text-white">قيد المعالجة</span>
                  </div>
             </div>
         </div>

         {/* Right Actions */}
         <div className="flex items-center gap-3">
             <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95 text-white/80 hover:text-white"
             >
                 <XCircle className="w-6 h-6" />
             </button>
         </div>
      </header>

      {/* Success Toast */}
      {successMessage.show && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 animate-in slide-in-from-top duration-300">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-2xl p-6 flex items-center gap-4 border border-emerald-400/50">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-black text-lg">تم الحفظ بنجاح! ✨</p>
              <p className="text-sm text-emerald-50 font-bold">تم حفظ الرسم في فئة الوثائق المختارة</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSuccessMessage({ show: false });
                  try {
                    trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken: sessionToken || '' } as any);
                  } catch {}
                  openNotarySigningFromAuditHub();
                }}
                disabled={!rasmId}
                className="px-4 py-2 bg-white text-emerald-600 rounded-lg font-bold text-sm hover:bg-emerald-50 transition-colors whitespace-nowrap"
              >
                رواق التوقيع العدلي
              </button>
              <button
                onClick={() => setSuccessMessage({ show: false })}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {signingTransition.active && (
        <div className="fixed inset-0 z-[2500] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl p-8 text-right overflow-hidden" dir="rtl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
                <FileSignature className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">رحلة الرسم المضمن</div>
                <div className="text-xs font-bold text-slate-500">يتم حفظ المستند وتأمينه قبل الانتقال إلى رواق التوقيع</div>
              </div>
            </div>

            <div className="relative rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-6 py-8 overflow-hidden">
              <div
                className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                style={{
                  transform: `translateX(${(signingTransitionTick % 2 === 0 ? 180 : 360)}%)`,
                  transition: 'transform 1.8s ease-in-out',
                }}
              />

              <div className="relative mb-8 h-28">
                <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2">
                  <div className="relative h-2 rounded-full bg-slate-200/90 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-400 via-sky-400 to-emerald-400 transition-all duration-700"
                      style={{ width: `${signingTransitionUi.lineFill}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-1/2 h-5 w-24 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-white/90 to-transparent"
                    style={{
                      left: `${Math.max(0, signingTransitionUi.lineFill - 10)}%`,
                      transition: 'left 1.4s ease-in-out',
                    }}
                  />
                </div>

                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-all duration-700"
                  style={{
                    left: `${signingTransitionUi.docPosition}%`,
                    transform: `translate(-50%, -50%) scale(${signingTransitionUi.phase === 'saving' ? (signingTransitionTick % 2 === 0 ? 1.02 : 1) : 1})`,
                  }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-blue-200/40 blur-xl" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200 bg-white shadow-lg">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="absolute left-[14%] top-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <FileText className="w-7 h-7 text-slate-600" />
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border bg-white shadow-sm transition-all duration-700 ${signingTransitionUi.glowAtSave ? 'border-emerald-200 shadow-[0_0_0_8px_rgba(16,185,129,0.08)]' : 'border-slate-200'}`}>
                    <Save className={`w-7 h-7 ${signingTransitionUi.phase === 'handoff' ? 'text-emerald-600' : 'text-slate-700'}`} />
                    {signingTransitionUi.phase === 'handoff' ? (
                      <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <>
                        <span className="absolute -left-5 top-3 h-1.5 w-4 rounded-full bg-emerald-300/90 animate-pulse" />
                        <span className="absolute -left-7 top-7 h-1.5 w-6 rounded-full bg-sky-300/80 animate-pulse" />
                        <span className="absolute -left-4 top-11 h-1.5 w-3 rounded-full bg-blue-300/80 animate-pulse" />
                      </>
                    )}
                  </div>
                </div>

                <div className="absolute right-[14%] top-1/2 -translate-y-1/2">
                  <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border bg-white shadow-sm transition-all duration-700 ${signingTransitionUi.penGlow ? 'border-amber-200 shadow-[0_0_0_8px_rgba(251,191,36,0.12)]' : 'border-slate-200'}`}>
                    <PenTool className={`w-7 h-7 ${signingTransitionUi.penGlow ? 'text-amber-500' : 'text-slate-500'}`} />
                  </div>
                </div>
              </div>

              <div className="relative text-center">
                <div className="text-xl font-black text-slate-900">{signingTransitionUi.stageTitle}</div>
                <div className="mt-2 text-sm font-bold text-slate-600">{signingTransitionUi.detailText}</div>
                {signingTransitionUi.isLongWait && signingTransitionUi.phase !== 'handoff' && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">
                    <Clock className="w-4 h-4" />
                    العملية مستمرة بشكل طبيعي ويتم تأمين آخر نسخة محفوظة
                  </div>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between text-[11px] font-black text-slate-400">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${signingTransitionUi.phase === 'start' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  <span>📜 بداية الحركة</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${signingTransitionUi.phase === 'saving' ? 'bg-blue-500 animate-pulse' : signingTransitionUi.phase === 'handoff' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span>💾 الحفظ والتأمين</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${signingTransitionUi.phase === 'handoff' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                  <span>✍️ التوقيع</span>
                </div>
              </div>

              <div className="mt-5 text-xs font-black text-slate-400 text-left" dir="ltr">
                {Math.round(signingTransition.progress)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {onlyOfficeMode === 'overlay' && onlyOfficeOpen && onlyOfficeDsUrl && onlyOfficeConfig && (
        <OnlyOfficeEditor
          key={`onlyoffice-overlay-${onlyOfficeRenderNonce}`}
          dsUrl={onlyOfficeDsUrl}
          config={onlyOfficeConfig}
          onSaved={refreshAfterOnlyOfficeSave}
          onClose={async () => {
            setOnlyOfficeOpen(false);
            await refreshAfterOnlyOfficeSave();
          }}
        />
      )}

      {/* MAIN BODY FLEX ROW */}
      <div className="flex flex-1 overflow-hidden min-w-0">
        
        {/* ZONE 2: Left Sidebar */}
        <aside className="w-[210px] xl:w-[220px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-sm z-40 relative">
           <div className="p-6">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">أقسام الملف</h3>
               <nav className="space-y-1">
                   {[
                     { id: 'data', label: 'بيانات الرسم', icon: FileText },
                     { id: 'attachments', label: 'المرفقات', icon: FileSearch },
                     { id: 'registration', label: 'التسجيل والتنبر', icon: CreditCardIcon },
                   ].map((item) => (
                       <button
                         key={item.id}
                         onClick={() => setActiveTab(item.id)}
                         className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${
                             activeTab === item.id 
                             ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100 translate-x-[-4px]' 
                             : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                         }`}
                       >
                           <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-blue-500' : 'text-slate-400'}`} />
                           {item.label}
                           {activeTab === item.id && (
                               <div className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                           )}
                       </button>
                   ))}
               </nav>
           </div>
        </aside>

        {/* ZONE 3: Workspace */}
        <main className="flex-1 relative bg-slate-50/50 overflow-hidden flex flex-col min-w-0">
            
            {/* Dynamic View based on Active Tab */}
            {activeTab === 'attachments' ? (
                <div className="h-full overflow-y-auto bg-slate-50 px-6 py-8 xl:px-8">
                    <div className="mx-auto w-full max-w-none space-y-6">
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">المرفقات</h3>
                                    <p className="mt-1 text-sm font-bold text-slate-500">تعرض هذه المساحة المرفقات الإضافية فقط، مع ملاحظات القاضي إن وُجدت.</p>
                                </div>
                                <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                                    {attachmentTabDocs.length} مرفق
                                </div>
                            </div>
                        </div>

                        {judgeAcceptanceNotes && (
                            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                                        <AlertCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-amber-900">ملاحظات القاضي للعدل</h4>
                                        <p className="text-xs font-bold text-amber-700">الملاحظات المرفقة عند قبول الرسم أو إعادته مع ملاحظات شكلية.</p>
                                    </div>
                                </div>
                                <div className="whitespace-pre-wrap rounded-2xl border border-amber-200 bg-white px-5 py-4 text-sm font-bold leading-8 text-slate-700">
                                    {judgeAcceptanceNotes}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start" dir="ltr">
                            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm xl:p-4" dir="rtl">
                                {selectedAttachmentTabDoc ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                            <div className="min-w-0">
                                                <h4 className="truncate text-lg font-black text-slate-900">
                                                    {String(selectedAttachmentTabDoc?.fileName || selectedAttachmentTabDoc?.name || 'attachment').trim()}
                                                </h4>
                                                <p className="mt-1 text-xs font-bold text-slate-500">
                                                    {String(selectedAttachmentTabDoc?.category || 'attachment').trim()}
                                                </p>
                                            </div>
                                            <a
                                                href={String(selectedAttachmentTabDoc?.url || selectedAttachmentTabDoc?.fileUrl || '').trim() || undefined}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700"
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <Download className="h-4 w-4" />
                                                    تنزيل
                                                </span>
                                            </a>
                                        </div>

                                        <div className="h-[72vh] min-h-[640px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 xl:h-[76vh]">
                                            {(() => {
                                                const previewUrl = String(selectedAttachmentTabDoc?.url || selectedAttachmentTabDoc?.fileUrl || '').trim();
                                                const fileName = String(selectedAttachmentTabDoc?.fileName || selectedAttachmentTabDoc?.name || '').toLowerCase();
                                                const mimeType = String(selectedAttachmentTabDoc?.mimeType || selectedAttachmentTabDoc?.type || '').toLowerCase();
                                                const isImage =
                                                  fileName.endsWith('.png') ||
                                                  fileName.endsWith('.jpg') ||
                                                  fileName.endsWith('.jpeg') ||
                                                  fileName.endsWith('.webp') ||
                                                  fileName.endsWith('.gif') ||
                                                  mimeType.startsWith('image/');
                                                const isPdf =
                                                  fileName.endsWith('.pdf') ||
                                                  mimeType.includes('application/pdf') ||
                                                  previewUrl.toLowerCase().includes('.pdf');
                                                const isDocx =
                                                  fileName.endsWith('.docx') ||
                                                  fileName.endsWith('.doc') ||
                                                  mimeType.includes('wordprocessingml') ||
                                                  mimeType.includes('msword');

                                                if (isImage) {
                                                    return (
                                                        <div className="flex h-full items-center justify-center bg-slate-100 p-4">
                                                            <img src={previewUrl} alt={fileName || 'attachment'} className="max-h-full max-w-full rounded-2xl object-contain shadow-sm" />
                                                        </div>
                                                    );
                                                }

                                                if (isPdf) {
                                                    return <iframe title={fileName || 'attachment-pdf'} src={previewUrl} className="h-full w-full bg-white" />;
                                                }

                                                if (isDocx) {
                                                    return (
                                                        <div className="h-full overflow-auto bg-white p-4">
                                                            <WordPreview
                                                                url={previewUrl}
                                                                isDarkMode={false}
                                                                editable={false}
                                                                sourceTag="base"
                                                                msWordRtlJustify
                                                            />
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                            <FileText className="h-7 w-7" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-black text-slate-700">معاينة غير متاحة داخل النظام</h4>
                                                            <p className="mt-2 text-sm font-bold text-slate-500">يمكنك تنزيل هذا المرفق أو فتحه في نافذة مستقلة.</p>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                            <FileSearch className="h-7 w-7" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-700">اختر مرفقاً للمعاينة</h4>
                                        <p className="mt-2 text-sm font-bold text-slate-500">لكل مرفق هنا معاينته المستقلة بعيداً عن عارض الرسم الرئيسي.</p>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm" dir="rtl">
                                {attachmentTabDocs.length > 0 ? (
                                    <div className="space-y-3">
                                        {attachmentTabDocs.map((doc: any, idx: number) => {
                                            const fileName = String(doc?.fileName || doc?.name || `attachment-${idx + 1}`).trim();
                                            const category = String(doc?.category || 'attachment').trim();
                                            const url = String(doc?.url || doc?.fileUrl || '').trim();
                                            const mimeType = String(doc?.mimeType || doc?.type || '').trim();
                                            const currentKey = `${String(selectedAttachmentTabDoc?.url || selectedAttachmentTabDoc?.fileUrl || '').trim()}||${String(selectedAttachmentTabDoc?.fileName || selectedAttachmentTabDoc?.name || '').trim()}`;
                                            const rowKey = `${url}||${fileName}`;
                                            const isActive = currentKey === rowKey;
                                            return (
                                                <button
                                                    type="button"
                                                    key={String(doc?.id || `${fileName}-${idx}`)}
                                                    onClick={() => setSelectedAttachmentTabDoc(doc)}
                                                    className={`w-full rounded-2xl border px-4 py-3 text-right transition ${
                                                        isActive
                                                          ? 'border-blue-200 bg-blue-50 shadow-sm'
                                                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-black text-slate-900">{fileName}</p>
                                                            <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
                                                                {category || 'attachment'}{mimeType ? ` • ${mimeType}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                            <FileSearch className="h-7 w-7" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-700">لا توجد مرفقات متاحة</h4>
                                        <p className="mt-2 text-sm font-bold text-slate-500">سيتم عرض مرفقات الرسم وملاحظات القاضي هنا عند توفرها.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'formal' || activeTab === 'legal' || activeTab === 'data' ? (
            <div className="flex h-full min-w-0 pb-[80px]">
                    {/* Left Half: Document Preview */}
              <div className="flex-1 relative bg-slate-200/50 border-l border-slate-200 p-2.5 flex flex-col min-w-0 overflow-hidden">
                        <div className="bg-white rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.05)] border border-slate-200 h-full overflow-hidden relative group flex flex-col">
                            {/* Document Actions Bar (Optimized Responsive Layout for 100% Zoom) */}
                            <div className="h-12 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-3 z-30 shrink-0 gap-2 overflow-x-auto no-scrollbar" dir="rtl">
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Primary Save & Sign Button */}
                                    <button 
                                      onClick={() => {
                                        if (!state) {
                                          alert('خطأ: لم يتم تحميل بيانات الرسم بعد. يرجى الانتظار قليلاً ثم المحاولة مجدداً.');
                                          return;
                                        }
                                        if (primaryTextEditorOpen) {
                                          const finalContent = editedPlainTextGetterRef.current?.();
                                          if (finalContent) {
                                            updateDraftContent(finalContent);
                                          }
                                          setPrimaryTextEditorOpen(false);
                                        }
                                        setPreSaveReviewIntent('save');
                                        setIsPreSaveReviewModalOpen(true);
                                      }}
                                      disabled={!state || isRedirecting}
                                      className={`px-3.5 py-1.5 rounded-lg text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0 ${
                                        state && !isRedirecting
                                          ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 cursor-pointer shadow-emerald-700/20'
                                          : 'bg-emerald-400 cursor-not-allowed opacity-60'
                                      }`}
                                      title="حفظ الرسم وتأهيله للتوقيع الرقمي"
                                    >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>حفظ وتصنيف (رواق التوقيع)</span>
                                    </button>

                                    {/* Compact Readiness Indicator */}
                                    {(activeEditedArtifact?.versionId || (rasmQuery.data as any)?.latestDraftVersionId) && (
                                      <div className="flex items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1 shadow-inner shrink-0">
                                        <span className="text-[10px] font-bold text-slate-500">الجاهزية</span>
                                        <div className="w-16 h-2 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-300/50">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${stats.qualityColor.replace('text-', 'bg-')}`}
                                            style={{ width: `${Math.max(stats.fillRatio, 8)}%` }}
                                          />
                                        </div>
                                        <span className={`text-[10px] font-black ${stats.qualityColor}`}>{stats.fillRatio}%</span>
                                      </div>
                                    )}

                                    {/* Revert / Refresh Draft Button */}
                                    <button 
                                        onClick={() => void revertSavedEdit()}
                                        disabled={revertLatestSavedRasmEditMutation.isPending || (!activeEditedArtifact?.versionId && !(rasmQuery.data as any)?.latestDraftVersionId)}
                                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0 ${
                                          revertLatestSavedRasmEditMutation.isPending || (!activeEditedArtifact?.versionId && !(rasmQuery.data as any)?.latestDraftVersionId)
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                                        }`}
                                        title="تحديث واستعادة النسخة المحفوظة"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>تحديث النسخة</span>
                                    </button>

                                    {/* Saved Documents Archive Button */}
                                    <button 
                                        onClick={() => {
                                          try {
                                            trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken: sessionToken || '' } as any);
                                          } catch {}
                                          navigate('/saved-documents');
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                                        title="عرض المحفوظات"
                                    >
                                        <FolderArchive className="w-3.5 h-3.5" />
                                        <span>عرض المحفوظات</span>
                                    </button>
                                </div>

                                {/* Left Action Block: Export / Import DOCX */}
                                <div className="flex items-center gap-2 shrink-0">
                                     {/* Export DOCX Button */}
                                     <button
                                       type="button"
                                       onClick={handleDownloadDocx}
                                       className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                                       title="تنزيل الملف بصيغة Word الرسمية (.docx)"
                                     >
                                       <FileDown className="w-3.5 h-3.5" />
                                       <span>تنزيل Word</span>
                                     </button>

                                     {/* Import DOCX Button */}
                                     <button
                                       type="button"
                                       disabled={isImportingDocx}
                                       onClick={() => docxImportInputRef.current?.click()}
                                       className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                                       title="رفع نسخة Word معدلة واستبدال النسخة الحالية"
                                     >
                                       {isImportingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                       <span>رفع نسخة Word</span>
                                     </button>
                                     <input
                                       type="file"
                                       accept=".docx"
                                       ref={docxImportInputRef}
                                       className="hidden"
                                       onChange={handleImportDocxFile}
                                     />

                                     <div className="h-4 w-px bg-slate-200 mx-0.5"></div>

                                     {/* Status Badge */}
                                     <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 rounded-lg py-1 px-2.5 shadow-sm shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[10px] font-bold text-emerald-800">
                                          معاينة الرسم
                                        </span>
                                     </div>
                                </div>
                            </div>

                            {/* Viewer Canvas */}
                            <div className="flex-1 relative overflow-hidden bg-slate-100">
                               {isAwaitingPdfResolved ? (
                                 <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-8">
                                   <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl flex flex-col items-center max-w-md text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
                                     <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 relative">
                                       <Loader2 className="w-8 h-8 animate-spin" />
                                       <span className="absolute text-sm">⚖️</span>
                                     </div>
                                     <div className="space-y-2">
                                       <h3 className="text-lg font-black text-slate-900 font-amiri">
                                         جاري استكمال وتجهيز المحرر القضائي المعتمد...
                                       </h3>
                                       <p className="text-xs font-bold text-slate-500 leading-relaxed">
                                         تم اعتماد المعاملة من طرف قاضي التوثيق بنجاح. يجري الآن توليد وتضمين النسخة الرقمية المعتمدة عالية الدقة.
                                       </p>
                                     </div>
                                     <div className="flex flex-col items-center gap-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-bold">
                                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                                          <span>تحديث تلقائي آني قيد المتابعة</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            rasmQuery.refetch();
                                            judgeSubmissionQuery.refetch();
                                            latestApprovedByFileNumberQuery.refetch();
                                          }}
                                          className="mt-1 px-4 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                          <span>تحديث يدوي للبيانات</span>
                                        </button>
                                      </div>
                                   </div>
                                 </div>
                               ) : forcedViewerDoc || activePdfUrl ? (
                                 <HighResViewer 
                                     doc={
                                       forcedViewerDoc || {
                                         id: `canonical-approved-pdf-${String((rasmQuery.data as any)?.id || rasmId || 'active')}`,
                                         category: 'audit_final_pdf',
                                         fileName: (rasmQuery.data as any)?.previewName || 'المحرر القضائي المعتمد.pdf',
                                         name: (rasmQuery.data as any)?.previewName || 'المحرر القضائي المعتمد.pdf',
                                         fileUrl: activePdfUrl ? `${activePdfUrl}${activePdfUrl.includes('?') ? '&' : '?'}cb=${Date.now()}` : '',
                                         url: activePdfUrl ? `${activePdfUrl}${activePdfUrl.includes('?') ? '&' : '?'}cb=${Date.now()}` : '',
                                         mimeType: 'application/pdf',
                                         type: 'application/pdf',
                                         isJudgePrimary: true,
                                       }
                                     }
                                     docSourceMeta={{
                                       selectedDocSource: activeDocVersion,
                                       baseDocUrl: baseDocUrlForDebug,
                                       editedDocUrl: editedDocUrlForDebug,
                                       versionId: activeEditedArtifact?.versionId || latestAuditVersionId || null,
                                       rasmId,
                                       submissionId: judgeSubmissionId || null,
                                       reason:
                                         (activeDocVersion as any) === 'edited'
                                           ? 'activeDocVersion=edited'
                                           : (forcedViewerDoc as any)?.category
                                             ? `selectedVaultDoc.category=${String((forcedViewerDoc as any).category)}`
                                             : 'no-selectedVaultDoc',
                                     }}
                                     zoom={viewerZoom}
                                     isDragging={isDragging}
                                     onMouseDown={handleViewerMouseDown}
                                     onMouseMove={handleViewerMouseMove}
                                     onMouseUp={handleViewerMouseUp}
                                     onWheel={handleViewerWheel}
                                     containerRef={viewerContainerRef}
                                     isDarkMode={isDarkMode}
                                     onUpdateDraft={updateDraftContent}
                                     inlineEditMode={isAuditHubEditMode}
                                     activeViewMode={activeViewMode}
                                     onlyOfficeConfig={onlyOfficeConfig}
                                     onlyOfficeDsUrl={onlyOfficeDsUrl}
                                     onSaveAndCloseOnlyOffice={handleSaveAndCloseOnlyOffice}
                                     isSavingOnlyOffice={isSavingEdits}
                                     onCloseOnlyOffice={() => setActiveViewMode('preview')}
                                     updateZoom={updateZoom}
                                     renderNonce={viewerDocRenderNonce}
                                     pdfTextEditor={{
                                       active: pdfFormEditorOpen && isSelectedPdf,
                                       tool: pdfTextTool,
                                       pageIndex: pdfTextPageIndex,
                                       pageSize: pdfTextPageSizes[pdfTextPageIndex] || null,
                                       edits: pdfTextEditsByPage[pdfTextPageIndex] || { rects: [], texts: [] },
                                       textInput: pdfTextInput,
                                       fontSize: pdfTextFontSize,
                                       onAddRect: addPdfRedactionRect,
                                       onAddText: addPdfOverlayText,
                                     }}
                                     onRegisterPlainTextGetter={(fn: () => string) => {
                                       editedPlainTextGetterRef.current = fn;
                                     }}
                                 />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-slate-400">
                                   <p className="font-bold text-sm">جاري تحضير نسخ المعاينة المعتمدة...</p>
                                 </div>
                               )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel in RTL: Validation Cards & Registration References */}
                    <div className="w-[340px] xl:w-[370px] 2xl:w-[400px] bg-white h-full overflow-y-auto p-4 shadow-sm border-r border-slate-200 flex flex-col shrink-0">
                        {activeTab === 'data' ? (
                          <div className="space-y-5 pb-16">
                                <h3 className="text-base font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    مراجع تضمين الشهادة/العقد
                                </h3>

                                {/* Level 1: Deed Identity */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    
                                    {/* New Added Fields from Requirements */}
                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">نوع الشهادة</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="radio" 
                                                checked={true} readOnly
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <input 
                                                type="text" 
                                                value={finalRecord.certificateType}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, certificateType: e.target.value}))}
                                                className="flex-1 text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                                placeholder="أدخل نوع الشهادة..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">جهة التوثيق (المكتب)</label>
                                            <select 
                                                value={finalRecord.authority}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, authority: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                                            >
                                                <option value="الرباط">مكتب التوثيق - الرباط</option>
                                                <option value="الدار البيضاء">مكتب التوثيق - الدار البيضاء</option>
                                                <option value="طنجة">مكتب التوثيق - طنجة</option>
                                                <option value="مراكش">مكتب التوثيق - مراكش</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ التقييد</label>
                                            <input 
                                                type="date" 
                                                value={finalRecord.registrationDate || finalRecord.date}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, registrationDate: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-200 my-4"></div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">الرقم المسلسل (Reference)</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={finalRecord.serial}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, serial: e.target.value}))}
                                                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono pl-8"
                                                />
                                                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            </div>
                                        </div>
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ التوثيق</label>
                                            <input 
                                                type="date" 
                                                value={finalRecord.date}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, date: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">السجل</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.register}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, register: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">الصحيفة</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.page}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, page: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">العدد</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.count}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, count: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Level 2: Parties Smart Cards */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <h4 className="font-bold text-slate-700 text-sm flex justify-between items-center">
                                            بيانات اطراف الشهادة/العقد
                                            <span className="mr-2 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Smart Verify Active</span>
                                        </h4>
                                        <button
                                          type="button"
                                          onClick={addOptionalParty}
                                          className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1.5 text-[11px] font-black text-white shadow-md transition-all hover:brightness-110"
                                        >
                                          + إضافة طرف اختياري
                                        </button>
                                    </div>
                                    
                                    <div className="mb-4 relative group">
                                        <div className="flex justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">الطرف الأول (البائع)</span>
                                                <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                                </span>
                                            </div>
                                             <div className="flex items-center gap-1 opacity-50">
                                                <ShieldCheck className="w-4 h-4 text-slate-400" />
                                                <span className="text-[10px] font-mono text-slate-400">BIO-SECURE</span>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="الاسم الثلاثي"
                                                value={finalRecord.firstPartyName}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, firstPartyName: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 mb-2 focus:ring-2 focus:ring-blue-100 outline-none pl-10"
                                            />
                                            <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="text" 
                                                    placeholder="الرقم القومي"
                                                    value={finalRecord.firstPartyId}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, firstPartyId: e.target.value}))}
                                                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-left"
                                                    dir="ltr"
                                                />
                                                <div className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-100">%IDD 98%</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 my-4 border-dashed"></div>

                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">الطرف الثاني (المشتري)</span>
                                                 <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                                </span>
                                            </div>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="الاسم الثلاثي"
                                            value={finalRecord.secondPartyName}
                                            onChange={(e) => setFinalRecord(prev => ({...prev, secondPartyName: e.target.value}))}
                                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 mb-2 focus:ring-2 focus:ring-blue-100 outline-none"
                                        />
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="الرقم القومي"
                                                value={finalRecord.secondPartyId}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, secondPartyId: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-left"
                                                dir="ltr"
                                            />
                                             <div className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-100">%IDD 95%</div>
                                        </div>
                                    </div>

                                    {Array.isArray((finalRecord as any).optionalParties) && (finalRecord as any).optionalParties.length > 0 && (
                                      <>
                                        <div className="border-t border-slate-200 my-4 border-dashed"></div>
                                        <div className="space-y-3">
                                          {(finalRecord as any).optionalParties.map((party: any, index: number) => (
                                            <div key={party.id} className="rounded-xl border border-slate-200 bg-white p-3">
                                              <div className="mb-2 flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">طرف اختياري {index + 1}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => removeOptionalParty(party.id)}
                                                  className="text-[11px] font-black text-red-600 hover:text-red-700"
                                                >
                                                  حذف
                                                </button>
                                              </div>
                                              <input
                                                type="text"
                                                placeholder="الاسم الثلاثي"
                                                value={party.name}
                                                onChange={(e) => updateOptionalParty(party.id, 'name', e.target.value)}
                                                className="mb-2 w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                              />
                                              <input
                                                type="text"
                                                placeholder="الرقم القومي"
                                                value={party.nationalId}
                                                onChange={(e) => updateOptionalParty(party.id, 'nationalId', e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 p-2.5 text-left font-mono text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                                dir="ltr"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                </div>

                                {/* Level 3: Deed Reference System (Property Units) */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div 
                                        className="flex items-center justify-between mb-0 group/header"
                                    >
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer flex-1"
                                            onClick={() => setIsUnitsCollapsed(!isUnitsCollapsed)}
                                        >
                                            <Building2 className={`w-4 h-4 transition-colors ${isUnitsCollapsed ? 'text-slate-400' : 'text-blue-500'}`} />
                                            <h4 className="font-bold text-slate-700 text-sm">مراجع سند الشهادة/العقد</h4>
                                            <div className={`p-0.5 rounded-md hover:bg-slate-200 transition-all ${isUnitsCollapsed ? 'rotate-180 text-slate-400' : 'rotate-0 text-blue-500'}`}>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-white/50 p-1 rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={isUnitsAvailable} 
                                                    onChange={() => setIsUnitsAvailable(true)}
                                                    className="w-3 h-3 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className={`text-[10px] font-bold ${isUnitsAvailable ? 'text-blue-600' : 'text-slate-400'}`}>متوفر</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={!isUnitsAvailable} 
                                                    onChange={() => setIsUnitsAvailable(false)}
                                                    className="w-3 h-3 text-red-600 focus:ring-red-500"
                                                />
                                                <span className={`text-[10px] font-bold ${!isUnitsAvailable ? 'text-red-600' : 'text-slate-400'}`}>غير متوفر</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    {!isUnitsCollapsed && (
                                        !isUnitsAvailable ? (
                                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                <span className="text-xs font-bold">تم استثناء مراجع السند (هذه الخانة غير متوفرة لهذا العقد)</span>
                                            </div>
                                        ) : (
                                        <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {propertyUnits.map((unit, idx) => {
                                            // Duplicate Check Logic
                                            const isDuplicate = propertyUnits.some((u, i) => i !== idx && (
                                                (u.type === 'unregistered' && unit.type === 'unregistered' && 
                                                 u.unregisteredData.bookNumber === unit.unregisteredData.bookNumber &&
                                                 u.unregisteredData.count === unit.unregisteredData.count &&
                                                 u.unregisteredData.page === unit.unregisteredData.page &&
                                                 u.unregisteredData.authority === unit.unregisteredData.authority) ||
                                                (u.type === 'registered' && unit.type === 'registered' &&
                                                 u.registeredData.deedNumber === unit.registeredData.deedNumber)
                                            ));

                                            return (
                                            <div key={unit.id} className={`p-4 bg-white rounded-xl border relative group transition-all ${isDuplicate ? 'border-red-300 shadow-red-100 shadow-md' : 'border-slate-200 hover:shadow-md'}`}>
                                                <div className="absolute top-3 left-3 flex gap-2">
                                                     <span className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-1 rounded-full">Unit {idx + 1}</span>
                                                    <button 
                                                        onClick={() => removePropertyUnit(unit.id)}
                                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-all"
                                                        title="Remove Unit"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                
                                                <div className="mb-4 pr-8">
                                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-2">
                                                        <span>🔹 نوع السند (Deed Type)</span>
                                                        {isDuplicate && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 rounded-full animate-pulse">تكرار بيانات!</span>}
                                                    </label>
                                                    <select 
                                                        value={unit.type}
                                                        onChange={(e) => updatePropertyUnit(unit.id, 'type', e.target.value)}
                                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer font-bold text-slate-700"
                                                    >
                                                        <option value="unregistered">☐ سند غير محفظ (رسوم عدلية – غير محفظة)</option>
                                                        <option value="registered">☐ رسم عقاري محفظ (Land Title)</option>
                                                    </select>
                                                </div>

                                                {unit.type === 'unregistered' ? (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                            <span className="text-xs font-bold text-emerald-700">حالة سند غير محفظ (رسوم عدلية)</span>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">نوع الدفتر</label>
                                                            <select 
                                                                value={unit.unregisteredData.bookType}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'bookType')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 bg-white outline-none"
                                                            >
                                                                <option value="أملاك">أملاك</option>
                                                                <option value="زواج">زواج</option>
                                                                <option value="تركات">تركات</option>
                                                                <option value="وصايا">وصايا</option>
                                                                <option value="كفالات">كفالات</option>
                                                                <option value="هبات">هبات</option>
                                                                <option value="أوقاف">أوقاف</option>
                                                                <option value="مختلفة">سجلات مختلفة</option>
                                                            </select>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم الدفتر</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="#"
                                                                    value={unit.unregisteredData.bookNumber}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'bookNumber')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none font-mono text-center"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">العدد</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="#"
                                                                    value={unit.unregisteredData.count}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'count')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none font-mono text-center"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">الصحيفة</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="#"
                                                                    value={unit.unregisteredData.page}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'page')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none font-mono text-center"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ التضمين</label>
                                                                <input 
                                                                    type="date" 
                                                                    value={unit.unregisteredData.date}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'date')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">جهة التوثيق</label>
                                                                <select 
                                                                    value={unit.unregisteredData.authority}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'authority')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                >
                                                                    <option value="الرباط">الرباط</option>
                                                                    <option value="الدار البيضاء">الدار البيضاء</option>
                                                                    <option value="طنجة">طنجة</option>
                                                                    <option value="فاس">فاس</option>
                                                                    <option value="مراكش">مراكش</option>
                                                                    <option value="أكادير">أكادير</option>
                                                                    <option value="وجدة">وجدة</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <textarea 
                                                                placeholder="ملاحظات حول هذا السند..."
                                                                value={unit.unregisteredData.notes || ''}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'notes')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none min-h-[60px]"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                            <span className="text-xs font-bold text-blue-700">حالة رسم عقاري محفظ (Registered)</span>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم الرسم العقاري</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Titre Foncier (e.g., 12345/R)"
                                                                value={unit.registeredData.deedNumber}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'deedNumber')}
                                                                className="w-full text-sm p-2.5 rounded border border-blue-200 bg-blue-50/30 outline-none font-mono font-bold text-blue-900"
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ الإصدار</label>
                                                                <input 
                                                                    type="date" 
                                                                    value={unit.registeredData.issueDate}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'issueDate')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">المحافظة العقارية</label>
                                                                <select 
                                                                    value={unit.registeredData.registryOffice}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'registryOffice')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                >
                                                                    <option value="الرباط">الرباط</option>
                                                                    <option value="الدار البيضاء">الدار البيضاء</option>
                                                                    <option value="طنجة">طنجة</option>
                                                                    <option value="القنيطرة">القنيطرة</option>
                                                                    <option value="سطات">سطات</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم المطلب (اختياري)</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="رقم مطلب التحفيظ..."
                                                                value={unit.registeredData.applicationNumber}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'applicationNumber')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                            />
                                                        </div>

                                                         <div>
                                                            <textarea 
                                                                placeholder="ملاحظات عقارية..."
                                                                value={unit.registeredData.notes || ''}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'notes')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none min-h-[60px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })}
                                        
                                        <button 
                                            onClick={addPropertyUnit}
                                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-bold hover:bg-slate-50 hover:border-slate-400 transition-all group"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <span>إضافة عقار / سند آخر (Add Property Unit)</span>
                                        </button>
                                    </div>
                                    )
                                    )}
                                </div>

                                {/* Level 4: Fiscal/Stamp */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div 
                                        className="flex items-center justify-between mb-0 group/header"
                                    >
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer flex-1"
                                            onClick={() => setIsFinancialCollapsed(!isFinancialCollapsed)}
                                        >
                                            <CreditCardIcon className={`w-4 h-4 transition-colors ${isFinancialCollapsed ? 'text-slate-400' : 'text-emerald-500'}`} />
                                            <h4 className="font-bold text-slate-700 text-sm">البيانات المالية (Financial Data)</h4>
                                            <div className={`p-0.5 rounded-md hover:bg-slate-200 transition-all ${isFinancialCollapsed ? 'rotate-180 text-slate-400' : 'rotate-0 text-emerald-500'}`}>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-white/50 p-1 rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={isFinancialAvailable} 
                                                    onChange={() => setIsFinancialAvailable(true)}
                                                    className="w-3 h-3 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span className={`text-[10px] font-bold ${isFinancialAvailable ? 'text-emerald-600' : 'text-slate-400'}`}>متوفر</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={!isFinancialAvailable} 
                                                    onChange={() => setIsFinancialAvailable(false)}
                                                    className="w-3 h-3 text-red-600 focus:ring-red-500"
                                                />
                                                <span className={`text-[10px] font-bold ${!isFinancialAvailable ? 'text-red-600' : 'text-slate-400'}`}>غير متوفر</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    {!isFinancialCollapsed && (
                                        !isFinancialAvailable ? (
                                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                <span className="text-xs font-bold">تم استثناء البيانات المالية (غير متوفرة لهذا السند)</span>
                                            </div>
                                        ) : (
                                        <div className="grid grid-cols-2 gap-3 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">دفتر المشهر</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.deedBook}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, deedBook: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none bg-slate-100" // readonly look maybe?
                                            />
                                        </div>
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">أمر المطالبة</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.taxOrder}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, taxOrder: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                    )
                                    )}
                                </div>

                                {/* Level 5: Notary Vital Data */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <h4 className="font-bold text-slate-700 mb-4 text-sm">بيانات العدل(ة)</h4>
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم العدل العاطف</label>
                                        <input 
                                            type="text" 
                                            placeholder="الاسم الرباعي"
                                            value={(finalRecord as any).judgeName || ''}
                                            onChange={(e) => setFinalRecord(prev => ({...prev, judgeName: e.target.value}))}
                                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-[2rem] border border-slate-800 bg-gradient-to-b from-slate-950 to-[#101828] p-4 shadow-[0_25px_60px_rgba(15,23,42,0.35)]">
                                  <div className="mb-4 flex items-center gap-3 text-white">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/10">
                                      <FolderArchive className="w-5 h-5 text-slate-200" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-black">إجراءات الوثيقة</div>
                                      <div className="text-[11px] font-bold text-slate-400">الإجراءات النهائية بعد استكمال جميع البيانات</div>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreSaveReviewIntent('signing');
                                        setIsPreSaveReviewModalOpen(true);
                                      }}
                                      disabled={!rasmId}
                                      className={`w-full rounded-xl px-4 py-3 text-sm font-black text-white transition-all flex items-center justify-center gap-2 border ${
                                        rasmId
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-blue-500/30 hover:brightness-110'
                                        : 'bg-slate-700 border-slate-600 opacity-60 cursor-not-allowed'
                                      }`}
                                    >
                                      <FileSignature className="w-4 h-4" />
                                      رواق التوقيع العدلي
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void shareSelectedDocument()}
                                      disabled={!selectedDocumentUrl}
                                      className={`w-full rounded-xl px-4 py-3 text-sm font-black transition-all flex items-center justify-center gap-2 border ${
                                        selectedDocumentUrl
                                        ? 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700'
                                        : 'bg-slate-800/60 text-slate-500 border-slate-800 cursor-not-allowed'
                                      }`}
                                    >
                                      <Share2 className="w-4 h-4" />
                                      مشاركة
                                    </button>

                                    <button
                                      type="button"
                                      onClick={printSelectedDocument}
                                      className="w-full rounded-xl px-4 py-3 text-sm font-black text-slate-100 bg-slate-800 hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-700"
                                    >
                                      <Printer className="w-4 h-4" />
                                      طباعة
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void deleteCurrentRasm()}
                                      disabled={!rasmId || deleteSavedRasmMutation.isPending}
                                      className={`w-full rounded-xl px-4 py-3 text-sm font-black transition-all flex items-center justify-center gap-2 border ${
                                        !rasmId || deleteSavedRasmMutation.isPending
                                        ? 'bg-red-950/40 text-red-300/50 border-red-900/40 cursor-not-allowed'
                                        : 'bg-red-950/80 text-red-300 border-red-900/60 hover:bg-red-900/80'
                                      }`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      حذف
                                    </button>
                                  </div>
                                </div>

                            </div>
                        ) : (
                            <>
                                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                    بطاقات التحقق
                                </h3>
                                
                                <div className="space-y-4 pb-20">
                            {validations.map((item, i) => (
                                <div key={i} className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-md cursor-pointer ${
                                    item.status === 'success' ? 'bg-emerald-50/50 border-emerald-100' : 
                                    item.status === 'warning' ? 'bg-amber-50/50 border-amber-100' : 
                                    'bg-red-50/50 border-red-100'
                                }`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                                            item.status === 'success' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 
                                            item.status === 'warning' ? 'bg-amber-100 border-amber-200 text-amber-600' : 
                                            'bg-red-100 border-red-200 text-red-600'
                                        }`}>
                                            {item.status === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : 
                                             item.status === 'warning' ? <AlertTriangle className="w-3.5 h-3.5" /> : 
                                             <XCircle className="w-3.5 h-3.5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-[15px]">{item.label}</h4>
                                            {item.msg && <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{item.msg}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>
                    )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full flex-col gap-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                        <Activity className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-500">مساحة العمل: {activeTab}</h3>
                </div>
            )}

            {/* ZONE 4: Footer Action Bar (Fixed at bottom of main area) */}
            <div className="h-[80px] bg-white border-t border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-20 absolute bottom-0 w-full left-0 right-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => { setDecisionType('reject'); setIsDecisionModalOpen(true); }}
                        className="px-6 py-3 rounded-xl border border-red-200 text-[#C62828] font-bold hover:bg-red-50 hover:brightness-110 transition-all text-sm"
                    >
                        رفض الملف
                    </button>
                    <button 
                        onClick={() => { setDecisionType('correct'); setIsDecisionModalOpen(true); }}
                        className="px-6 py-3 rounded-xl border border-orange-200 text-[#EF6C00] font-bold hover:bg-orange-50 hover:brightness-110 transition-all text-sm"
                    >
                        طلب استكمال
                    </button>
                    <button className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all text-sm">
                        حفظ الملاحظات
                    </button>
                </div>
                
                <div className="flex items-center gap-4">
                </div>
            </div>

        </main>
      </div>

      {/* --- Modals --- */}
      <DecisionModal
         isOpen={isDecisionModalOpen}
         onClose={() => setIsDecisionModalOpen(false)}
         type={decisionType}
         onConfirm={confirmFinalize}
         name={state?.sellers?.[0]?.name || '---'}
      />

      <PreSaveReviewModal
        isOpen={isPreSaveReviewModalOpen}
        onClose={() => setIsPreSaveReviewModalOpen(false)}
        checks={preSaveChecks}
        setChecks={setPreSaveChecks}
        showRegistration={needsRegistrationReview}
        onConfirm={async () => {
          setIsPreSaveReviewModalOpen(false);
          setSaveCategoryIntent(preSaveReviewIntent);
          setIsSaveCategoryModalOpen(true);
        }}
      />

      <SaveCategoryModal 
         isOpen={isSaveCategoryModalOpen}
         onClose={() => setIsSaveCategoryModalOpen(false)}
         onSave={handleSaveToCategory}
         intent={saveCategoryIntent}
         isLoading={isCategorySaving}
         fileName={state?.sellers?.[0]?.name ? `رسم عدلي: ${state?.sellers?.[0]?.name || ''}` : 'رسم غير مسمى'}
      />

      <ImageViewerModal 
         isOpen={isImageViewerOpen} 
         onClose={() => setIsImageViewerOpen(false)} 
         doc={selectedVaultDoc}
      />

      {/* Signature Confirmation Checklist */}
      <SignatureConfirmationModal 
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        checks={sigChecks}
        setChecks={setSigChecks}
        needsFiscal={needsFiscal}
        rasmId={rasmId}
        navigationState={{ draft: state?.draft, fallback: true }}
        onConfirm={async () => {
          setIsRedirecting(true);
          const ok = await confirmFinalize();
          if (!ok) {
            setIsRedirecting(false);
            return;
          }
          // If navigation is blocked by the alert dialog, ensure the modal doesn't stay on-screen.
          setIsSignatureModalOpen(false);
        }}
      />

      {/* Success Animation Overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 z-[2000] bg-blue-900/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce">
                <CheckCircle2 className="w-14 h-14 text-blue-600" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 font-amiri text-center">تم اعتماد الرسم بنجاح</h2>
            <p className="text-blue-200 text-xl font-bold">أصبح الرسم جاهزاً الآن لتوقيع السادة العدول...</p>
        </div>
      )}
    </div>
  );
};

export { AuditHubContainer as AuditHub };
export default AuditHubContainer;
