import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  Search,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  Monitor,
  Cpu,
  RefreshCcw,
  CheckCircle,
  Hash,
  AlertCircle,
  Clock,
  Trash2,
  Lock,
  ArrowRight,
  Pen,
  Download,
  Printer,
  FolderOpen
} from 'lucide-react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { releaseStuViaBeacon } from '../../utils/stuReleaseBeacon';
import { PostSignatureCorridorOverlay } from './PostSignatureCorridorOverlay';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export const NotarySignatureWorkarea: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const trpcUtils = trpc.useUtils();
  const preferredAttachmentId = (location.state as any)?.preferredAttachmentId as string | null | undefined;
  const preferredAttachmentUrl = (location.state as any)?.preferredAttachmentUrl as string | null | undefined;
  const navigationFinalPdfUrl = (location.state as any)?.finalPdfUrl as string | null | undefined;
  const initialPreferredUrl = String(navigationFinalPdfUrl || preferredAttachmentUrl || '').trim() || null;
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [isWacomConnected, setIsWacomConnected] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<'none' | 'partial' | 'complete'>('none');
  const [activeAdoul, setActiveAdoul] = useState<1 | 2>(1);
  const [preHash, setPreHash] = useState('8f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a');
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(preferredAttachmentId || null);

  // Prevent body/page scrolling while in the signing workarea.
  // Without this, scroll chaining can push the browser outside the portal, showing a white area.
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);
  
  // Wacom STU-540 State
  const [stuStatus, setStuStatus] = useState<'SEARCHING' | 'CONNECTING' | 'CONNECTED' | 'CAPTURING' | 'SAVED' | 'ERROR'>('SEARCHING');
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [tabletInstance, setTabletInstance] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [adoul1Signature, setAdoul1Signature] = useState<string | null>(null);
  const [adoul2Signature, setAdoul2Signature] = useState<string | null>(null);
  const [adoul1BioHash, setAdoul1BioHash] = useState<string | null>(null);
  const [adoul2BioHash, setAdoul2BioHash] = useState<string | null>(null);
  const [isSendingPreviewToTablet, setIsSendingPreviewToTablet] = useState(false);
  const [tabletSigningViewMode, setTabletSigningViewMode] = useState<'full' | 'signing-zone'>('full');
  const [tabletPreviewZoom, setTabletPreviewZoom] = useState(1.32);
  const [tabletPreviewScrollOffset, setTabletPreviewScrollOffset] = useState(0.5);
  
  // PDF Injection State
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<{ width: number, height: number } | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [editedPdfBytes, setEditedPdfBytes] = useState<Uint8Array | null>(null);
  const [isPreparingSigningPdf, setIsPreparingSigningPdf] = useState(false);
  const [hasAttemptedAutoTabletConnect, setHasAttemptedAutoTabletConnect] = useState(false);
  const signLoadLoggedUrlRef = useRef<string | null>(null);
  const autoFinalizedVersionRef = useRef<string | null>(null);
  const signedDocCaptureRef = useRef<HTMLDivElement | null>(null);

  const buildPdfViewerSrc = (baseUrl: string, overrides?: { page?: number }) => {
    if (!baseUrl) return '';
    const safePage = Math.max(1, Math.floor(overrides?.page ?? page ?? 1));
    const [urlWithoutHash, existingHash] = baseUrl.split('#');

    const params = new URLSearchParams((existingHash || '').replace(/^\?/, ''));
    params.set('toolbar', '0');
    params.set('navpanes', '0');
    params.set('scrollbar', '0');
    params.set('view', 'Fit');
    params.set('page', String(safePage));
    params.set('zoom', 'page-width');
    return `${urlWithoutHash}#${params.toString()}`;
  };

  const isPdfCandidate = (rawUrl?: string | null, rawName?: string | null, rawMime?: string | null) => {
    const url = String(rawUrl || '').toLowerCase();
    const fileName = String(rawName || '').toLowerCase();
    const mime = String(rawMime || '').toLowerCase();
    return fileName.endsWith('.pdf') || url.includes('.pdf') || url.startsWith('blob:') || mime.includes('application/pdf');
  };

  // Download/Print logic
  const handleDownload = async () => {
    if (!currentPdfUrl) return;
    const link = document.createElement('a');
    link.href = currentPdfUrl;
    link.download = `Signed_Doc_${rasm?.applicationNumber || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = async () => {
    if (!currentPdfUrl) return;
    const printWindow = window.open(currentPdfUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  // Custom Placement State
  const [placedSignatures, setPlacedSignatures] = useState<Array<{ id: string, x: number, y: number, img: string, adoul: 1 | 2, page: number }>>([]);
  const [pendingPlacement, setPendingPlacement] = useState<{ img: string, adoul: 1 | 2 } | null>(null);
  const [saveDialog, setSaveDialog] = useState<'none' | 'warning' | 'success'>('none');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedFinalCategory, setSelectedFinalCategory] = useState<'Marriage' | 'Property' | 'Inheritance' | 'Divorce' | 'Other' | null>(null);
  const [finalSaveError, setFinalSaveError] = useState<string | null>(null);
  const [lastSignedDeedId, setLastSignedDeedId] = useState<string | null>(null);

  // Additive: Post-signature corridor overlay (does not replace existing save flow)
  const [isCorridorOpen, setIsCorridorOpen] = useState(false);

  const [deviceInfo, setDeviceInfo] = useState({
    serial: 'STU-540-77842',
    firmware: '1.2.4',
    resolution: '800x480 (High DPI)',
    pressureLevels: '1024'
  });

  // Wacom Refs
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
  const activeAdoulRef = useRef<1 | 2>(1);
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
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    pdfPageCountRef.current = pdfPageCount;
  }, [pdfPageCount]);

  useEffect(() => {
    activeAdoulRef.current = activeAdoul;
  }, [activeAdoul]);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  useEffect(() => {
    tabletSigningViewModeRef.current = tabletSigningViewMode;
    if (tabletSigningViewMode === 'signing-zone') {
      tabletPreviewScrollOffsetRef.current = 1;
      setTabletPreviewScrollOffset(1);
    }
  }, [tabletSigningViewMode]);

  const { data: rasm, isLoading } = trpc.feesAgent.documents.getSavedRasm.useQuery(
    { sessionToken: sessionToken || '', id: id || '' },
    { enabled: !!sessionToken && !!id, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true }
  );

  const signingDocQuery = trpc.feesAgent.documents.resolveSigningDocument.useQuery(
    { sessionToken: sessionToken || '', id: id || '', mode: 'pdf' },
    { enabled: !!sessionToken && !!id, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true }
  );
  const finalizeForSigningMutation = trpc.feesAgent.documents.finalizeForSigning.useMutation();

  const appendCacheBuster = (rawUrl: string, key: string, value: string) => {
    if (!rawUrl) return rawUrl;
    const [base, hash] = rawUrl.split('#');
    const hasQuery = base.includes('?');
    const joined = `${base}${hasQuery ? '&' : '?'}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    return hash ? `${joined}#${hash}` : joined;
  };

  const buildFallbackSigningUrls = () => {
    const candidates: string[] = [];
    const push = (raw: string | null | undefined) => {
      const value = String(raw || '').trim();
      if (!value) return;
      if (candidates.includes(value)) return;
      candidates.push(value);
    };

    push(initialPreferredUrl);
    push(signingDocQuery.data?.effectiveUrl);

    const signableCategories = ['audit_final_pdf', 'audit_draft_pdf', 'judge_attachment'];
    for (const category of signableCategories) {
      const att = (rasm?.attachments || []).find((item: any) => String(item?.category || '') === category);
      push(att?.fileUrl);
    }

    return candidates;
  };

  useEffect(() => {
    signLoadLoggedUrlRef.current = null;
    autoFinalizedVersionRef.current = null;
    setEditedPdfBytes(null);
    setPage(1);
    if (preferredAttachmentId) {
      setSelectedAttachmentId(preferredAttachmentId);
    } else {
      setSelectedAttachmentId(null);
    }
    if (!initialPreferredUrl) return;
    const seededUrl = appendCacheBuster(initialPreferredUrl, 'nav', String(Date.now()));
    setOriginalPdfUrl(seededUrl);
    setCurrentPdfUrl(seededUrl);
  }, [initialPreferredUrl, preferredAttachmentId]);

  useEffect(() => {
    const sourceUrl = currentPdfUrl || originalPdfUrl;
    if (!sourceUrl) {
      setPdfPageCount(1);
      return;
    }
    const isPdfSource = sourceUrl.toLowerCase().includes('.pdf') || sourceUrl.startsWith('blob:');
    if (!isPdfSource) {
      setPdfPageCount(1);
      return;
    }

    let cancelled = false;

    const loadPdfMeta = async () => {
      try {
        const resp = await fetch(sourceUrl, { cache: 'no-store', credentials: 'same-origin' });
        if (!resp.ok) return;
        const bytes = await resp.arrayBuffer();
        if (cancelled) return;
        const pdfDoc = await PDFDocument.load(bytes);
        if (cancelled) return;
        setPdfPageCount(pdfDoc.getPageCount() || 1);
        const activePage = pdfDoc.getPages()[Math.max(0, Math.min(page - 1, pdfDoc.getPageCount() - 1))] || pdfDoc.getPages()[0];
        if (activePage) {
          const { width, height } = activePage.getSize();
          setPdfSize({ width, height });
        }
      } catch {
        if (!cancelled) setPdfPageCount(1);
      }
    };

    loadPdfMeta();
    return () => {
      cancelled = true;
    };
  }, [currentPdfUrl, originalPdfUrl, page]);

  useEffect(() => {
    const eff = signingDocQuery.data;
    if (!eff || !id) return;

    const hasNavigationPdf =
      !!initialPreferredUrl &&
      isPdfCandidate(initialPreferredUrl, null, 'application/pdf');

    // Keep attachment selection (sidebar highlights) aligned when possible.
    if (preferredAttachmentId) {
      setSelectedAttachmentId((prev) => (prev === preferredAttachmentId ? prev : preferredAttachmentId));
    } else if (eff.attachmentId) {
      setSelectedAttachmentId(eff.attachmentId);
    }

    const baseUrl = eff.effectiveUrl || '';
    if (!baseUrl || hasNavigationPdf) return;
    const cacheKey = eff.versionId ? 'v' : 'cb';
    const cacheValue = eff.versionId || String(Date.parse(eff.updatedAt || '') || Date.now());
    const busted = appendCacheBuster(baseUrl, cacheKey, cacheValue);

    setOriginalPdfUrl(busted);
    setCurrentPdfUrl(busted);
    setEditedPdfBytes(null);

    if (busted.toLowerCase().includes('.pdf')) {
      const loadSize = async () => {
        try {
          const resp = await fetch(busted);
          const bytes = await resp.arrayBuffer();
          const pdfDoc = await PDFDocument.load(bytes);
          const firstPage = pdfDoc.getPages()[0];
          const { width, height } = firstPage.getSize();
          setPdfSize({ width, height });
        } catch (e) {
        }
      };
      loadSize();
    }
  }, [id, signingDocQuery.data, preferredAttachmentId, initialPreferredUrl]);

  useEffect(() => {
    const eff = signingDocQuery.data;
    if (!eff?.versionId || eff.source !== 'edited_docx' || !sessionToken) return;
    if (autoFinalizedVersionRef.current === eff.versionId) return;
    if (finalizeForSigningMutation.isLoading) return;

    autoFinalizedVersionRef.current = eff.versionId;
    setIsPreparingSigningPdf(true);

    finalizeForSigningMutation.mutate(
      {
        sessionToken: sessionToken || '',
        versionId: eff.versionId,
      },
      {
        onSuccess: async (res) => {
          const finalUrl = appendCacheBuster(res.finalPdfUrl, 'sig', res.versionId);
          setOriginalPdfUrl(finalUrl);
          setCurrentPdfUrl(finalUrl);
          setEditedPdfBytes(null);
          try {
            await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken: sessionToken || '', id: id || '' });
          } catch {}
          try {
            await signingDocQuery.refetch();
          } catch {}
          setIsPreparingSigningPdf(false);
        },
        onError: () => {
          autoFinalizedVersionRef.current = null;
          setIsPreparingSigningPdf(false);
        },
      }
    );
  }, [finalizeForSigningMutation, id, sessionToken, signingDocQuery, signingDocQuery.data, trpcUtils]);

  useEffect(() => {
    const eff = signingDocQuery.data;
    const urlToLoad = currentPdfUrl || originalPdfUrl;
    if (!id || !eff || !urlToLoad) return;
    if (signLoadLoggedUrlRef.current === urlToLoad) return;
    signLoadLoggedUrlRef.current = urlToLoad;

    const run = async () => {
      try {
        const resp = await fetch(urlToLoad, { cache: 'no-store' });
        const ab = await resp.arrayBuffer();
        // eslint-disable-next-line no-console
        console.log('[SIGN] load', {
          rasmId: id,
          url: urlToLoad,
          status: resp.status,
          contentType: resp.headers.get('content-type'),
          byteLength: ab.byteLength,
        });

        if (!resp.ok) {
          const candidates = buildFallbackSigningUrls();
          const nextUrl = candidates.find((candidate) => candidate && candidate !== urlToLoad);
          if (nextUrl) {
            const fallbackUrl = appendCacheBuster(nextUrl, 'fb', String(Date.now()));
            setOriginalPdfUrl(fallbackUrl);
            setCurrentPdfUrl(fallbackUrl);
            const matchingAttachment = (rasm?.attachments || []).find((item: any) => String(item?.fileUrl || '').trim() === String(nextUrl).trim());
            if (matchingAttachment?.id) {
              setSelectedAttachmentId(String(matchingAttachment.id));
            }
          }
        }
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.log('[SIGN] load', {
          rasmId: id,
          url: urlToLoad,
          status: 'fetch_error',
          error: e?.message || String(e),
        });
      }
    };

    run();
  }, [id, initialPreferredUrl, rasm?.attachments, signingDocQuery.data, currentPdfUrl, originalPdfUrl]);

  // Load selected attachment
  useEffect(() => {
    // If we set `selectedAttachmentId` purely to align the sidebar with the resolver's
    // choice, do not override the resolver-selected (cache-busted) URL.
    if (signingDocQuery.data?.attachmentId && selectedAttachmentId === signingDocQuery.data.attachmentId) {
      return;
    }

    const selectedAttachment = rasm?.attachments?.find(a => a.id === selectedAttachmentId);
    const url = selectedAttachment?.fileUrl;

    if (url && isPdfCandidate(url, selectedAttachment?.fileName, selectedAttachment?.mimeType || selectedAttachment?.type)) {
      setOriginalPdfUrl(url);
      setCurrentPdfUrl(url);
      setEditedPdfBytes(null);
      
      // Auto-load PDF size if it's a PDF
      if (url.toLowerCase().includes('.pdf')) {
        const loadSize = async () => {
          try {
            const resp = await fetch(url);
            const bytes = await resp.arrayBuffer();
            const pdfDoc = await PDFDocument.load(bytes);
            const firstPage = pdfDoc.getPages()[0];
            const { width, height } = firstPage.getSize();
            setPdfSize({ width, height });
          } catch (e) {
          }
        };
        loadSize();
      }
    } else if (selectedAttachmentId) {
      const fallbackPdf = (rasm?.attachments || []).find((item: any) =>
        isPdfCandidate(item?.fileUrl, item?.fileName, item?.mimeType || item?.type)
      );
      if (fallbackPdf?.fileUrl) {
        setSelectedAttachmentId(String(fallbackPdf.id));
        setOriginalPdfUrl(String(fallbackPdf.fileUrl));
        setCurrentPdfUrl(String(fallbackPdf.fileUrl));
        setEditedPdfBytes(null);
      }
    }
  }, [selectedAttachmentId, rasm?.attachments, signingDocQuery.data?.attachmentId]);

  // --- WACOM SDK LOGIC START ---
  const closingSessionRef = useRef<Promise<void> | null>(null);

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
        // End capture/reporting if active
        try {
          if (reportHandler?.stopReporting) {
            await reportHandler.stopReporting();
          }
        } catch (e) {
        } finally {
          reportHandlerRef.current = null;
        }

        // Clear tablet display and turn off inking before disconnect
        try {
          if (isStuReady) {
            await clearTabletScreen(tablet);
          }
        } catch (e) {
        }

        try {
          if (isStuReady && tablet && p?.InkingMode) {
            await tablet.setInkingMode(p.InkingMode.InkingMode_Off);
          }
        } catch (e) {
        }

        try {
          if (isStuReady && tablet?.disconnect) {
            await tablet.disconnect();
          }
        } catch (e) {
        } finally {
          tabletRef.current = null;
        }

        // Release stale USB interface handle (critical for refresh/reload)
        try {
          // Only attempt STU object calls if the STU websocket is still alive.
          if (isStuReady && usbInterface?.disconnect) {
            await usbInterface.disconnect();
          }
        } catch (e) {
        } finally {
          usbInterfaceRef.current = null;
        }

        // Close SigCaptX/WebSocket context if supported
        try {
          if (wgss?.STU && typeof wgss.STU.close === 'function') {
            wgss.STU.close();
          }
        } catch (e) {
        } finally {
          try {
            if (wgss) wgss.STU = null;
          } catch {
            // ignore
          }
        }

        // Give the service/OS a moment to release the exclusive USB handle.
        await new Promise((resolve) => setTimeout(resolve, 300));
      } finally {
        setIsCapturing(false);
        setIsWacomConnected(false);
        setTabletInstance(null);
        setStuStatus('SEARCHING');
        penDataRef.current = [];
      }
    })();

    closingSessionRef.current = task.finally(() => {
      closingSessionRef.current = null;
    });
    return closingSessionRef.current;
  };

  // NOTE: Browser refresh/unload does not reliably await async cleanup.
  // This sends best-effort release commands immediately (no awaits) so the SigCaptX
  // WebSocket frames are emitted before the page is torn down.
  const forceReleaseSync = () => {
    try {
      const tablet = tabletRef.current;
      const usbInterface = usbInterfaceRef.current;
      const wgss = (window as any).WacomGSS;

      try {
        tablet?.endCapture?.();
      } catch {
        // ignore
      }

      try {
        tablet?.setClearScreen?.();
      } catch {
        // ignore
      }

      try {
        tablet?.disconnect?.();
      } catch {
        // ignore
      }

      try {
        usbInterface?.disconnect?.();
      } catch {
        // ignore
      }

      try {
        wgss?.STU?.close?.();
      } catch {
        // ignore
      }

      try {
        if (wgss) wgss.STU = null;
      } catch {
        // ignore
      }
    } finally {
      tabletRef.current = null;
      usbInterfaceRef.current = null;
      reportHandlerRef.current = null;
    }
  };

  const disconnectTablet = async () => {
    const tablet = tabletRef.current;
    const reportHandler = reportHandlerRef.current;
    const wgss = (window as any).WacomGSS;
    const p = (wgss && wgss.STU) ? new wgss.STU.Protocol() : null;

    try {
      if (reportHandler && reportHandler.stopReporting) {
        await reportHandler.stopReporting();
      }
    } catch (e) {
    } finally {
      reportHandlerRef.current = null;
    }

    try {
      if (tablet && p && p.InkingMode) {
        await tablet.setInkingMode(p.InkingMode.InkingMode_Off);
      }
    } catch (e) {
    }

    try {
      if (tablet && tablet.disconnect) {
        await tablet.disconnect();
      }
    } catch (e) {
    }

    tabletRef.current = null;
    setIsWacomConnected(false);
    setStuStatus('SEARCHING');
    penDataRef.current = [];
  };

  const waitForService = (wgss: any, retries: number, delayMs = 350): Promise<boolean> => {
    return new Promise((resolve) => {
      let count = 0;
      const check = () => {
        if (wgss && wgss.STU && wgss.STU.isServiceReady()) {
          resolve(true);
        } else if (count < retries) {
          count++;
          setTimeout(check, delayMs);
        } else {
          resolve(false);
        }
      };
      check();
    });
  };

  // Enhanced cleanup to fix "Device found but busy" without USB reconnect
  const disconnectLayer = async () => {
    const wgss = (window as any).WacomGSS;
    const isStuReady = !!wgss?.STU?.isServiceReady?.();
    const p = (wgss && wgss.STU) ? new wgss.STU.Protocol() : null;
    
    try {
      // 1. Force tablet disconnect if it exists
      if (tabletRef.current) {
        // Best-effort release sequence while socket is still alive
        try {
          if (isStuReady) {
            tabletRef.current.endCapture?.();
            tabletRef.current.setClearScreen?.();
            if (p?.InkingMode) {
              tabletRef.current.setInkingMode?.(p.InkingMode.InkingMode_Off);
            }
          }
        } catch {
          // ignore
        }

        const dcPromise = isStuReady ? tabletRef.current.disconnect().catch(() => {}) : Promise.resolve();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 300));
        await Promise.race([dcPromise, timeoutPromise]);
        tabletRef.current = null;
      }
      
      // 2. Force USB interface disconnect if it exists - Critical for "Busy" error
      if (usbInterfaceRef.current) {
        try {
          if (isStuReady) {
            await usbInterfaceRef.current.disconnect();
          }
        } catch {}
        usbInterfaceRef.current = null;
      }

      // 3. Attempt to close existing connection if SDK supports it
      if (wgss && wgss.STU && typeof wgss.STU.close === 'function') {
        try { 
          wgss.STU.close(); 
        } catch {}
      }

      try {
        if (wgss) wgss.STU = null;
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
    
    // Give the OS/Service a moment to release the USB handle completely
    await new Promise(resolve => setTimeout(resolve, 180));
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
        setHardwareError("Wacom GSS SDK not loaded. Please wait.");
        connectingRef.current = false;
        return;
      }

      // 1. Force cleanup first to release any hung sessions
      await closeSignatureSession();
      await disconnectLayer();
      
      const host = 'localhost';
      
      // Reset the core STU instance to force a fresh WebSocket handshake
      if (wgss.STU) {
        try { wgss.STU.close(); } catch {}
        wgss.STU = null;
      }
      wgss.STU = new wgss.STUConstructor(9000, host);

      const isReady = await waitForService(wgss, 2, 250);
      if (!isReady) {
        setHardwareError(`SigCaptX Service not found on ${host}:9000.`);
        setStuStatus('ERROR');
        connectingRef.current = false;
        return;
      }

      const getUsbDevicesWithRetry = async (attempt: number): Promise<any[]> => {
        try {
          const list = await wgss.STU.getUsbDevices();
          if (Array.isArray(list) && list.length > 0) return list;
        } catch (e) {
          // continue to retry
        }
        if (attempt >= 2) return [];
        await new Promise((r) => setTimeout(r, 180));
        return getUsbDevicesWithRetry(attempt + 1);
      };

      const devices = await getUsbDevicesWithRetry(0);
      if (!devices || devices.length === 0) {
          setHardwareError("STU-540 not detected. Ensure USB is plugged in.");
          setStuStatus('ERROR');
          return;
      }

      const candidate = devices.find((d: any) => String(d.model || d.name || '').includes('540')) || devices[0];
      const intf = new wgss.STU.UsbInterface();
      await intf.Constructor();
      usbInterfaceRef.current = intf; // STORE THIS IMMEDIATELY
      
      // Attempt connection in exclusive mode
      try {
        await intf.connect(candidate, true);

        // Let the service settle after grabbing exclusive lock.
        await new Promise((r) => setTimeout(r, 120));
      } catch (connErr: any) {
        const errStr = String(connErr.message || connErr);
        
        // If it's the specific "busy" or "not connected" error, retry after a forced delay
        if (retryCount < 2 && (errStr.includes("not_connected") || errStr.includes("interface") || errStr.includes("exclusive"))) {
          await disconnectLayer();
          await new Promise(r => setTimeout(r, 320));
          return connectToSTUDevice(retryCount + 1);
        }
        throw connErr;
      }

      const tablet = new wgss.STU.Tablet();
      await tablet.Constructor(intf, null, null);
      tabletRef.current = tablet;

      // Safely fetch info
      const info = await tablet.getInformation().catch(() => ({}));
      const caps = await tablet.getCapability().catch(() => ({}));
      capabilityRef.current = caps;
      const inkThreshold = await tablet.getInkThreshold().catch(() => null);
      inkThresholdRef.current = inkThreshold;

      setDeviceInfo({
        serial: info.serialNumber || 'STU-540-AUTODETECT',
        firmware: info.firmwareMajor ? `${info.firmwareMajor}.${info.firmwareMinor}` : '1.0',
        resolution: (caps.screenWidth && caps.screenHeight) ? `${caps.screenWidth}x${caps.screenHeight}` : '800x480',
        pressureLevels: (caps.maxPressure || 1024).toString()
      });

      const p = new wgss.STU.Protocol();
      await tablet.setPenDataOptionMode(p.PenDataOptionMode.PenDataOptionMode_TimeCountSequence).catch(() => {});
      await tablet.setInkingMode(p.InkingMode.InkingMode_On);
      
      setIsWacomConnected(true);
      setStuStatus('CONNECTED');
      setHardwareError(null);
      connectingRef.current = false;

    } catch (err: any) {
      const msg = String(err.message || err);

      // If we got a not_connected_error after physical connect, do a deeper reset/retry.
      if (retryCount < 2 && (msg.includes('not_connected_error') || msg.includes('not_connected') || msg.includes('instance not found'))) {
        await disconnectLayer();
        await new Promise((r) => setTimeout(r, 320));
        connectingRef.current = false;
        return connectToSTUDevice(retryCount + 1);
      }

      if (msg.includes('UsbInterface')) {
          setHardwareError("Wacom USB Interface busy. Click 'RESET DEVICE' to force release.");
      } else if (msg.includes('not_connected_error')) {
          setHardwareError("Device found but busy. Click 'RESET DEVICE' to fix.");
      } else {
          setHardwareError(`Hardware Error: ${msg}`);
      }
      setStuStatus('ERROR');
      connectingRef.current = false;
    }
  };

  const handleCaptureStart = async (adoul: 1 | 2) => {
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
      setIsCapturing(true);
      penDataRef.current = [];

      if (reportHandlerRef.current?.stopReporting) {
        await reportHandlerRef.current.stopReporting().catch(() => {});
      }

      try {
        await pushPreviewToTablet(tabletSigningViewMode);
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 120));
      try {
        await tablet.setInkingMode(p.InkingMode.InkingMode_On);
      } catch {}

      // Initialize the report handler correctly
      const reportHandler = new wgss.STU.ProtocolHelper.ReportHandler();
      reportHandlerRef.current = reportHandler;

      let isDown = false;
      let lastPoint = { x: 0, y: 0 };
      const distance = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);

      // --- Drawing Logic for Real-time Preview ---
      const penData = (report: any) => {
        const canvas = sigCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const tabletMaxX = caps?.tabletMaxX ?? 10800;
        const tabletMaxY = caps?.tabletMaxY ?? 6480;

        // Map tablet coordinates to canvas coordinates
        const nextPoint = {
          x: Math.round((canvas.width * report.x) / tabletMaxX),
          y: Math.round((canvas.height * report.y) / tabletMaxY),
        };

        const threshold = inkThresholdRef.current;
        const onMark = threshold?.onPressureMark ?? (caps?.minPressure || 100);
        const offMark = threshold?.offPressureMark ?? Math.max(0, onMark - 1);
        const pressure = report.pressure ?? 0;
        const isDownNow = isDown ? !(pressure <= offMark) : pressure > onMark;

        if (!isDown && isDownNow) {
          lastPoint = nextPoint;
        }

        if (isDownNow) {
          ctx.beginPath();
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#000000'; // Black signature ink
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
    } catch (err) {
      setStuStatus('ERROR');
    }
  };

  const clearSignatureCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const clampTabletScrollOffset = (value: number) => Math.max(0, Math.min(1, value));

  const drawTabletControlButton = (
    ctx: CanvasRenderingContext2D,
    region: { id: string; x: number; y: number; width: number; height: number },
    label: string,
    accent = '#0f172a',
    fill = '#ffffff',
    border = '#cbd5e1',
    text = accent
  ) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(region.x, region.y, region.width, region.height, 10);
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

      drawTabletControlButton(
        ctx,
        region,
        region.label,
        palette.text,
        palette.fill,
        palette.border,
        palette.text
      );
    });

    const signRegion = { id: 'sign', x: margin, y: bottomY, width: screenWidth - margin * 2, height: 40 };
    drawTabletControlButton(
      ctx,
      signRegion,
      `توقيع ${activeAdoulRef.current === 1 ? 'العدل الأول' : 'العدل الثاني'}`,
      '#065f46',
      '#dcfce7',
      '#22c55e',
      '#065f46'
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(
      `صفحة ${pageRef.current}/${pdfPageCountRef.current} | ${Math.round(tabletPreviewZoomRef.current * 100)}%`,
      screenWidth - 16,
      screenHeight - 18
    );

    tabletButtonRegionsRef.current = [...regions, signRegion];
  };

  const renderTabletPreviewImage = async (mode: 'full' | 'signing-zone') => {
    const screenWidth = Number(capabilityRef.current?.screenWidth || 800);
    const screenHeight = Number(capabilityRef.current?.screenHeight || 480);
    const screenAspect = screenWidth / Math.max(1, screenHeight);
    const fullModeZoom = tabletPreviewZoomRef.current;
    const pdfSourceUrl = currentPdfUrl || originalPdfUrl || '';

    if (pdfSourceUrl) {
      try {
        const resp = await fetch(pdfSourceUrl, { cache: 'no-store', credentials: 'same-origin' });
        if (!resp.ok) throw new Error(`PDF fetch failed (${resp.status})`);
        const pdfBytes = await resp.arrayBuffer();
        const loadingTask = (pdfjsLib as any).getDocument({ data: pdfBytes });
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

        let cropX = 0;
        let cropY = 0;
        let cropWidth = renderCanvas.width;
        let cropHeight = renderCanvas.height;
        let drawX = 0;
        let drawY = 0;
        let drawWidth = screenWidth;
        let drawHeight = screenHeight;

        if (mode === 'signing-zone') {
          const zoneCropWidth = renderCanvas.width;
          const zoneCropHeight = Math.min(renderCanvas.height, Math.round(zoneCropWidth / screenAspect));
          const bottomPadding = Math.round(renderCanvas.height * 0.02);
          const srcY = Math.max(0, renderCanvas.height - zoneCropHeight - bottomPadding);
          cropX = 0;
          cropY = srcY;
          cropWidth = zoneCropWidth;
          cropHeight = zoneCropHeight;
          drawX = 0;
          drawY = 68;
          drawWidth = screenWidth;
          drawHeight = screenHeight - 124;
          targetCtx.drawImage(
            renderCanvas,
            0,
            srcY,
            zoneCropWidth,
            zoneCropHeight,
            0,
            68,
            screenWidth,
            screenHeight - 124
          );
        } else {
          const baseCropWidth = renderCanvas.width;
          const baseCropHeight = Math.min(renderCanvas.height, Math.round(baseCropWidth / screenAspect));
          cropWidth = Math.max(1, Math.round(baseCropWidth / fullModeZoom));
          cropHeight = Math.max(1, Math.round(baseCropHeight / fullModeZoom));
          cropX = Math.max(0, Math.round((renderCanvas.width - cropWidth) / 2));
          const availableScroll = Math.max(0, renderCanvas.height - cropHeight);
          cropY = Math.max(0, Math.round(availableScroll * tabletPreviewScrollOffsetRef.current));
          drawX = 0;
          drawY = 68;
          drawWidth = screenWidth;
          drawHeight = screenHeight - 124;
          targetCtx.drawImage(
            renderCanvas,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            68,
            screenWidth,
            screenHeight - 124
          );
        }

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
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          drawX,
          drawY,
          drawWidth,
          drawHeight,
        };

        return targetCanvas.toDataURL('image/png');
      } catch {
        // fall through to DOM fallback
      }
    }

    tabletPreviewTransformRef.current = null;

    if (!signedDocCaptureRef.current) {
      throw new Error('تعذر العثور على مساحة عرض الوثيقة الحالية.');
    }

    const snapshot = await html2canvas(signedDocCaptureRef.current, {
      scale: 1,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = screenWidth;
    targetCanvas.height = screenHeight;
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) throw new Error('Target canvas unavailable');
    targetCtx.fillStyle = '#ffffff';
    targetCtx.fillRect(0, 0, screenWidth, screenHeight);
    const availableHeight = screenHeight - 124;
    const scale = Math.min(screenWidth / snapshot.width, availableHeight / snapshot.height);
    const drawWidth = Math.max(1, Math.round(snapshot.width * scale));
    const drawHeight = Math.max(1, Math.round(snapshot.height * scale));
    const offsetX = Math.round((screenWidth - drawWidth) / 2);
    const offsetY = 68 + Math.round((availableHeight - drawHeight) / 2);
    targetCtx.drawImage(snapshot, offsetX, offsetY, drawWidth, drawHeight);
    drawTabletControlsOverlay(targetCtx, screenWidth, screenHeight);
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
          b64Data,
          0,
          0,
          0,
          0,
          screenWidth,
          screenHeight,
          encodingMode,
          1,
          false,
          0,
          true
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
      clearSignatureCanvas();
      await handleCaptureStart(activeAdoulRef.current);
      return;
    }

    if (buttonId === 'prev') {
      const nextPage = Math.max(1, pageRef.current - 1);
      pageRef.current = nextPage;
      setPage(nextPage);
      tabletPreviewScrollOffsetRef.current = 0.5;
      setTabletPreviewScrollOffset(0.5);
    } else if (buttonId === 'next') {
      const nextPage = Math.min(pdfPageCountRef.current, pageRef.current + 1);
      pageRef.current = nextPage;
      setPage(nextPage);
      tabletPreviewScrollOffsetRef.current = 0.5;
      setTabletPreviewScrollOffset(0.5);
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
            const hit = tabletButtonRegionsRef.current.find(
              (region) =>
                point.x >= region.x &&
                point.x <= region.x + region.width &&
                point.y >= region.y &&
                point.y <= region.y + region.height
            );
            if (hit) {
              tapLocked = true;
              try {
                await handleTabletVirtualButtonTap(hit.id);
              } finally {
                setTimeout(() => {
                  tapLocked = false;
                }, 180);
              }
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

    if (!isWacomConnected || isCapturing) return;
    try {
      setIsSendingPreviewToTablet(true);
      setHardwareError(null);
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

  /**
   * Trims transparent pixels from around the ink to make placement more pinpoint accurate
   */
  const trimCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const l = pixels.data.length;
    let i;
    let bound = {
      top: null as number | null,
      left: null as number | null,
      right: null as number | null,
      bottom: null as number | null
    };
    let x, y;

    // Signature ink is rendered in black, but we check Alpha channel primarily
    for (i = 0; i < l; i += 4) {
      if (pixels.data[i + 3] > 10) { // Check for non-transparent pixels
        x = (i / 4) % canvas.width;
        y = Math.floor((i / 4) / canvas.width);

        if (bound.top === null || y < bound.top) bound.top = y;
        if (bound.left === null || x < bound.left) bound.left = x;
        if (bound.right === null || x > bound.right) bound.right = x;
        if (bound.bottom === null || y > bound.bottom) bound.bottom = y;
      }
    }

    if (bound.top === null || bound.left === null || bound.right === null || bound.bottom === null) {
      return canvas;
    }

    const padding = 10;
    const left = Math.max(0, bound.left - padding);
    const top = Math.max(0, bound.top - padding);
    const right = Math.min(canvas.width, bound.right + padding);
    const bottom = Math.min(canvas.height, bound.bottom + padding);

    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);

    const trimmed = ctx.getImageData(left, top, width, height);
    const copy = document.createElement('canvas');
    copy.width = trimmed.width;
    copy.height = trimmed.height;
    const copyCtx = copy.getContext('2d');
    copyCtx?.putImageData(trimmed, 0, 0);
    return copy;
  };

  const handleClearSTU = async () => {
    clearSignatureCanvas();
    penDataRef.current = [];
    if (tabletRef.current) {
        try {
            const wgss = (window as any).WacomGSS;
            
            // From demobuttons-2 implementation: specific hardware reset calls
            if (typeof tabletRef.current.setClearScreen === 'function') {
                await tabletRef.current.setClearScreen();
            } else if (typeof tabletRef.current.clearScreen === 'function') {
                await tabletRef.current.clearScreen();
            }
            
            // Re-draw inking mode
            const p = new wgss.STU.Protocol();
            await tabletRef.current.setInkingMode(p.InkingMode.InkingMode_On);
          } catch {
            // ignore
        }
    }
  };

  const handleSaveSignature = async (adoul: 1 | 2) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;

    // PINPOINT ACCURACY: Trim whitespace so the signature itself is centered on the click
    const trimmed = trimCanvas(canvas);
    const realSig = trimmed.toDataURL('image/png');
    
    if (adoul === 1) {
      setAdoul1Signature(realSig);
      setAdoul1BioHash("SHA256_WACOM_" + Math.random().toString(36).substring(7).toUpperCase());
      if (!adoul2Signature) setActiveAdoul(2); // Toggle to second adoul if not signed
    } else {
      setAdoul2Signature(realSig);
      setAdoul2BioHash("SHA256_WACOM_" + Math.random().toString(36).substring(7).toUpperCase());
    }

    setStuStatus('SAVED');
    setIsCapturing(false);
    
    const isAdoul1Done = adoul === 1 || !!adoul1Signature;
    const isAdoul2Done = adoul === 2 || !!adoul2Signature;
    
    if (isAdoul1Done && isAdoul2Done) {
      setSignatureStatus('complete');
    } else {
      setSignatureStatus('partial');
    }

    // Release reporting but keep tablet connected for second adoul if needed
    if (reportHandlerRef.current && reportHandlerRef.current.stopReporting) {
        await reportHandlerRef.current.stopReporting().catch(() => {});
    }

    const canAutoPlaceOnPdf =
      tabletSigningViewMode === 'full' &&
      isPDF &&
      !!(currentPdfUrl || originalPdfUrl) &&
      !!tabletPreviewTransformRef.current &&
      penDataRef.current.length > 0;

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
            editedPdfBytes && editedPdfBytes.byteLength > 0
              ? editedPdfBytes
              : new Uint8Array(await (await fetch(currentPdfUrl || originalPdfUrl!, { cache: 'no-store', credentials: 'same-origin' })).arrayBuffer())
          );
          const pages = pdfDoc.getPages();
          const safePageIndex = Math.max(0, Math.min(transform.page - 1, pages.length - 1));
          const activePage = pages[safePageIndex];
          if (!activePage) throw new Error('Page not available for automatic signature placement.');

          const { width: pdfW, height: pdfH } = activePage.getSize();
          const renderToPdfScaleX = pdfW / Math.max(1, transform.renderWidth);
          const renderToPdfScaleY = pdfH / Math.max(1, transform.renderHeight);
          const embeddedImage = await pdfDoc.embedPng(realSig);
          const imageAspect = embeddedImage.height / Math.max(1, embeddedImage.width);

          const bboxWidthPts = Math.max(24, (sourceMaxX - sourceMinX) * renderToPdfScaleX);
          const bboxHeightPts = Math.max(18, (sourceMaxY - sourceMinY) * renderToPdfScaleY);
          const sigWidth = Math.max(42, bboxWidthPts * 1.08);
          const sigHeight = Math.max(18, sigWidth * imageAspect);
          const centerXPts = (sourceMinX + (sourceMaxX - sourceMinX) / 2) * renderToPdfScaleX;
          const centerYFromTopPts = (sourceMinY + (sourceMaxY - sourceMinY) / 2) * renderToPdfScaleY;
          const centerYPts = pdfH - centerYFromTopPts;

          activePage.drawImage(embeddedImage, {
            x: centerXPts - (sigWidth / 2),
            y: centerYPts - (sigHeight / 2),
            width: sigWidth,
            height: sigHeight,
          });

          const modifiedBytes = await pdfDoc.save();
          const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
          const newUrl = URL.createObjectURL(blob);

          setCurrentPdfUrl(newUrl);
          setEditedPdfBytes(modifiedBytes);
          setPdfSize({ width: pdfW, height: pdfH });
          setPendingPlacement(null);
          return;
        }
      } catch (err: any) {
        setHardwareError(err?.message || 'تعذر تضمين التوقيع تلقائياً داخل PDF.');
        setStuStatus('ERROR');
      }
    }

    // Fallback to the existing manual placement flow.
    setPendingPlacement({ img: realSig, adoul });
  };

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

    const timer = window.setTimeout(() => {
      setHasAttemptedAutoTabletConnect(true);
      void connectToSTUDevice();
    }, 250);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      void closeSignatureSession();
    };
  }, []);
  // --- WACOM SDK LOGIC END ---

  const clearSignatures = () => {
    setPlacedSignatures([]);
    if (originalPdfUrl) {
      setCurrentPdfUrl(originalPdfUrl);
    }
    setEditedPdfBytes(null);
    // Reset all signature-related state to allow re-signing
    setAdoul1Signature(null);
    setAdoul2Signature(null);
    setAdoul1BioHash(null);
    setAdoul2BioHash(null);
    setSignatureStatus('none');
    setActiveAdoul(1);
    setPendingPlacement(null);
    
    // Reset hardware status if it was in SAVED state
    if (stuStatus === 'SAVED') {
      setStuStatus('CONNECTED');
    }
    
    // Clear the on-screen preview canvas
    clearSignatureCanvas();
  };

  const undoLastSignature = async () => {
    if (isPDF) {
      // Re-fetching original and re-applying one less is complex, 
      // easiest is clear for now or reset to original.
      clearSignatures();
      return;
    }
    setPlacedSignatures(prev => prev.slice(0, -1));
  };

  const handleDocumentClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pendingPlacement) return;
    
    const containerRect = e.currentTarget.getBoundingClientRect();
    let clickPxX = e.clientX - containerRect.left;
    let clickPxY = e.clientY - containerRect.top;

    // --- SOLUTION: BINARY PDF INJECTION --- 
    // This actually modifies the PDF bytes and inserts the image as a new Layer
    if (isPDF && (currentPdfUrl || originalPdfUrl)) {
      try {
        setStuStatus('SEARCHING'); // Quick loading state
        
        // Fetch current PDF bytes (from memory if already edited, or from URL)
        const docUrl = currentPdfUrl || originalPdfUrl!;
        const pdfBytes = editedPdfBytes && editedPdfBytes.byteLength > 0
          ? editedPdfBytes
          : new Uint8Array(await (await fetch(docUrl, { cache: 'no-store', credentials: 'same-origin' })).arrayBuffer());

        // Load the PDF using pdf-lib
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const safePageIndex = Math.max(0, Math.min(page - 1, pages.length - 1));
        const activePage = pages[safePageIndex];
        if (!activePage) throw new Error('Page not available for signature placement.');
        
        // Page dimensions in PDF points (1/72 inch)
        const { width: pdfW, height: pdfH } = activePage.getSize();

        // Save size for consistent aspect ratio in browser
        setPdfSize({ width: pdfW, height: pdfH });

        const imgSrc = pendingPlacement.img || '';
        const isJpg = /^data:image\/jpe?g;/i.test(imgSrc);
        const embeddedImage = isJpg ? await pdfDoc.embedJpg(imgSrc) : await pdfDoc.embedPng(imgSrc);
        
        // Map the click against the stable page frame shown in the workarea.
        const renderedW = containerRect.width;
        const renderedH = containerRect.height;
        const scaleX = renderedW > 0 ? renderedW / pdfW : 1;
        const scaleY = renderedH > 0 ? renderedH / pdfH : 1;
        const clampedXPx = Math.min(Math.max(clickPxX, 0), renderedW);
        const clampedYPx = Math.min(Math.max(clickPxY, 0), renderedH);
        
        // Use exact aspect ratio from the trimmed signature capture
        const sigW = 90; // Default signature width (~3.2cm)
        const sigH = (sigW * embeddedImage.height) / embeddedImage.width; 

        // Convert pixels -> PDF points.
        const xPos = clampedXPx / scaleX;
        const yFromTopPts = clampedYPx / scaleY;
        const yPos = pdfH - yFromTopPts;

        // Draw centered on the target point
        activePage.drawImage(embeddedImage, {
          x: xPos - (sigW / 2),
          y: yPos - (sigH / 2),
          width: sigW,
          height: sigH,
        });

        // Save as new modified file
        const modifiedBytes = await pdfDoc.save();
        const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
        const newUrl = URL.createObjectURL(blob);
        
        setCurrentPdfUrl(newUrl);
        setEditedPdfBytes(modifiedBytes);

        setPendingPlacement(null);
        setStuStatus('SAVED');
        return;

      } catch (err) {
        // If binary injection fails (CORS/auth/format), still place a visible overlay preview.
        setPlacedSignatures(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            x: clickPxX,
            y: clickPxY,
            img: pendingPlacement.img,
            adoul: pendingPlacement.adoul,
            page,
          }
        ]);
        setStuStatus('ERROR');
        setHardwareError(`تعذر تضمين التوقيع داخل PDF. سيتم عرضه كمعاينة فقط. (${(err as any)?.message || 'خطأ غير معروف'})`);
        setPendingPlacement(null);
        return;
      }
    }

    // Fallback for Word/Image formats (CSS Layering)
    setPlacedSignatures(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        x: clickPxX,
        y: clickPxY,
        img: pendingPlacement.img,
        adoul: pendingPlacement.adoul,
        page,
      }
    ]);

    setPendingPlacement(null);
  };

  const payload = rasm?.payload || {};
  const currentStatus = rasm?.status || 'READY';
  const isCoSigned = !!adoul1Signature && !!adoul2Signature;
  const registrationNumber = String((rasm as any)?.registrationNumber || rasm?.applicationNumber || rasm?.fileNumber || id || '---');

  const finalSaveMutation = trpc.feesAgent.documents.finalSaveAfterSignature.useMutation();

  const arrayBufferToBase64 = (ab: ArrayBuffer) => {
    const bytes = new Uint8Array(ab);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const dataUrlToUint8Array = (dataUrl: string) => {
    const parts = String(dataUrl || '').split(',');
    const base64 = parts.length > 1 ? parts[1] : '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const handleSaveDeed = () => {
    // Platform rule: archival effect only when both signatures are present.
    if (!isCoSigned) {
      setSaveDialog('warning');
      return;
    }

    setFinalSaveError(null);
    setSelectedFinalCategory(null);
    setIsCategoryModalOpen(true);
  };

  // Build a signed PDF artifact when possible (same logic used by final save)
  const getSignedPdfBase64 = async (): Promise<string | undefined> => {
    let signedPdfBase64: string | undefined = undefined;

    // (1) Real modified PDF bytes from pdf-lib injection.
    if (editedPdfBytes && editedPdfBytes.byteLength > 0) {
      const sliced = editedPdfBytes.buffer.slice(
        editedPdfBytes.byteOffset,
        editedPdfBytes.byteOffset + editedPdfBytes.byteLength
      );
      signedPdfBase64 = arrayBufferToBase64(sliced);
    }

    // (2) If it's a PDF URL, try to fetch and validate.
    if (!signedPdfBase64) {
      try {
        const selectedAtt = (rasm as any)?.attachments?.find((a: any) => String(a?.id || '') === String(selectedAttachmentId || '')) || null;
        const candidateUrl = currentPdfUrl || originalPdfUrl || selectedAtt?.fileUrl || '';
        if (candidateUrl) {
          const resp = await fetch(candidateUrl, { cache: 'no-store', credentials: 'same-origin' });
          if (resp.ok) {
            const ab = await resp.arrayBuffer();
            try {
              await PDFDocument.load(ab);
              signedPdfBase64 = arrayBufferToBase64(ab);
            } catch {
              // Not a PDF; ignore (DOCX etc.).
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // (3) DOCX flow: generate a PDF from the visible preview so signatures are included.
    if (!signedPdfBase64 && isCoSigned && !isPDF) {
      if (!signedDocCaptureRef.current) {
        throw new Error('تعذر إنشاء نسخة موقعة لإتمام الحفظ.');
      }

      const canvas = await html2canvas(signedDocCaptureRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const jpgBytes = dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.92));
      const pdfDoc = await PDFDocument.create();
      const img = await pdfDoc.embedJpg(jpgBytes);

      // Convert CSS pixels to PDF points assuming 96dpi: 1px ~= 0.75pt
      const pageW = Math.max(1, canvas.width * 0.75);
      const pageH = Math.max(1, canvas.height * 0.75);
      const pageObj = pdfDoc.addPage([pageW, pageH]);
      pageObj.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });

      const bytes = await pdfDoc.save();
      signedPdfBase64 = arrayBufferToBase64(bytes.buffer);
    }

    return signedPdfBase64;
  };

  const handleConfirmFinalSave = async () => {
    if (!selectedFinalCategory || !sessionToken || !id) return;
    setFinalSaveError(null);
    try {
      const signedPdfBase64 = await getSignedPdfBase64();

      const res = await finalSaveMutation.mutateAsync({
        sessionToken,
        id,
        category: selectedFinalCategory,
        signedPdfBase64,
        device: {
          serial: deviceInfo.serial,
          firmware: deviceInfo.firmware,
          resolution: deviceInfo.resolution,
          pressureLevels: deviceInfo.pressureLevels,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        },
      });
      setLastSignedDeedId((res as any)?.signedDeedId ? String((res as any).signedDeedId) : null);
      setIsCategoryModalOpen(false);
      setSaveDialog('success');
    } catch (e: any) {
      setFinalSaveError(e?.message || 'تعذر حفظ الرسم.');
    }
  };

  useEffect(() => {
    // Close the optional corridor when switching rasms.
    setIsCorridorOpen(false);
  }, [id]);

  // --- Support multiple document types in the signing workarea ---
  const attachment = rasm?.attachments?.find(a => a.id === selectedAttachmentId);
  const url = currentPdfUrl || originalPdfUrl || attachment?.fileUrl || '';
  const fileName = (attachment?.fileName || '').toLowerCase();
  const fileMime = String(attachment?.mimeType || attachment?.type || '').toLowerCase();

  const isPDF = isPdfCandidate(url, fileName, fileMime);
  const isImage = /\.(png|jpe?g|webp|bmp|gif|svg)($|\?)/i.test(fileName) || /\.(png|jpe?g|webp|bmp|gif|svg)($|\?)/i.test(url);
  const isWord = /\.(docx?|dotx?)($|\?)/i.test(fileName) || /\.(docx?|dotx?)($|\?)/i.test(url) || (!isPDF && !isImage && url);

  const stripHtmlToPlainText = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n');
    return (tmp.textContent || tmp.innerText || '').trim();
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-slate-400 font-bold">جاري تحميل منصة التوقيع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans rtl">
      {/* Header Bar */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shrink-0 shadow-2xl z-20">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/notary-signing-portal')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              توقيع الرسوم المضمّنة
              <span className="px-2 py-0.5 bg-blue-600 text-[10px] rounded uppercase font-bold">Encrypted Mode</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-500 uppercase">الحالة الحالية</span>
             <span className="text-xs font-bold text-amber-500">
               {currentStatus === 'PARTIALLY_SIGNED' ? 'بانتظار العدل الثاني' : 'جاهز للتوقيع الأول'}
             </span>
          </div>

          <button
            onClick={() => navigate('/saved-documents')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-2 rounded-lg text-xs font-black transition-all border border-white/5"
            title="الوثائق المحفوظة"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">الوثائق المحفوظة</span>
          </button>

          <button
            onClick={() => navigate('/signed-rasms')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-2 rounded-lg text-xs font-black transition-all border border-white/5"
            title="الرسوم الموقعة"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">الرسوم الموقعة</span>
          </button>

          {isCoSigned && (
            <button
              type="button"
              onClick={() => setIsCorridorOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 via-sky-500 to-blue-500 hover:from-blue-500 hover:via-sky-400 hover:to-blue-400 text-white px-3 py-2 rounded-lg text-xs font-black transition-all shadow-lg shadow-blue-500/20"
              title="فتح رواق توجيه الرسم والأرشفة المؤمنة"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden md:inline">الرواق</span>
            </button>
          )}

          {(adoul1Signature || adoul2Signature || currentPdfUrl !== originalPdfUrl) && (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <button 
                onClick={handlePrint}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all group"
                title="طباعة"
              >
                <Printer className="w-5 h-5 group-hover:text-amber-400" />
              </button>
              <button 
                onClick={handleDownload}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all group"
                title="تحميل"
              >
                <Download className="w-5 h-5 group-hover:text-blue-400" />
              </button>
            </div>
          )}

          <button
            className="flex items-center gap-2 bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 text-white px-4 py-2 rounded-lg text-xs font-black transition-all shadow-lg shadow-purple-500/20"
            onClick={handleSaveDeed}
          >
            <ShieldCheck className="w-4 h-4" />
            حفظ وتسجيل
          </button>

          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-white/5">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative h-[calc(100vh-64px)]">

        <PostSignatureCorridorOverlay
          open={isCorridorOpen}
          onClose={() => setIsCorridorOpen(false)}
          sessionToken={sessionToken || ''}
          rasmId={id || ''}
          rasm={rasm}
          registrationNumber={registrationNumber}
          isCoSigned={isCoSigned}
          preHash={preHash}
          adoul1BioHash={adoul1BioHash}
          adoul2BioHash={adoul2BioHash}
          deviceInfo={deviceInfo}
          getSignedPdfBase64={getSignedPdfBase64}
          lastSignedDeedId={lastSignedDeedId}
          onSignedDeedId={(newId) => setLastSignedDeedId(newId)}
        />

        {/* Mandatory Category Modal (Final Save) */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[1000]">
            <div className="absolute inset-0 bg-black/60" onClick={() => { /* no-op: mandatory */ }} />
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="w-full max-w-lg bg-white text-slate-900 rounded-2xl shadow-2xl border border-white/30 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-gradient-to-r from-violet-800 via-purple-600 to-violet-400 text-white">
                  <h2 className="text-sm font-black">نافذة اختيار الصنف</h2>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm font-black">اختر صنف الرسم:</p>

                  <div className="space-y-2">
                    {([
                      { key: 'Marriage', label: 'رسوم الزواج' },
                      { key: 'Property', label: 'رسوم الأملاك' },
                      { key: 'Inheritance', label: 'رسوم التركات' },
                      { key: 'Divorce', label: 'رسوم الطلاق' },
                      { key: 'Other', label: 'باقي الوثائق' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSelectedFinalCategory(opt.key)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-right transition-all ${
                          selectedFinalCategory === opt.key
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm font-black text-slate-800">{opt.label}</span>
                        <span className={`w-5 h-5 rounded border flex items-center justify-center ${
                          selectedFinalCategory === opt.key ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'
                        }`}>
                          {selectedFinalCategory === opt.key ? <span className="text-white text-xs font-black">✓</span> : null}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-bold text-slate-600">لا يسمح بالحفظ دون اختيار صنف.</p>

                  {finalSaveError && (
                    <div className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">
                      {finalSaveError}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryModalOpen(false);
                        setSelectedFinalCategory(null);
                        setFinalSaveError(null);
                      }}
                      className="px-4 py-2 rounded-xl border-2 border-purple-500 text-purple-700 font-black text-xs hover:bg-purple-50 transition-colors"
                      disabled={finalSaveMutation.isPending}
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmFinalSave}
                      disabled={!selectedFinalCategory || finalSaveMutation.isPending}
                      className={`px-4 py-2 rounded-xl text-white font-black text-xs transition-all ${
                        !selectedFinalCategory || finalSaveMutation.isPending
                          ? 'bg-slate-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 shadow-lg shadow-purple-500/20'
                      }`}
                    >
                      {finalSaveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Dialog Overlay */}
        {saveDialog !== 'none' && (
          <div className="fixed inset-0 z-[999]">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-800 to-violet-400" />
            <div className="absolute inset-0 bg-black/15" />

            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-white/30 animate-in fade-in zoom-in-95 duration-300">
                <div className="h-2 bg-gradient-to-r from-violet-800 via-purple-600 to-violet-400" />

                <div className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-800 via-purple-600 to-violet-400 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>

                    {saveDialog === 'warning' ? (
                      <div className="flex-1">
                        <p className="text-lg font-black leading-relaxed">حضرة الأستاذ العدل،</p>
                        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 font-bold">
                          <p>يقتضي نظام الحفظ المعتمد أن يتم توثيق الرسم بتوقيع العدلين في آن واحد.</p>
                          <p>وعليه، فإن التوقيع المنفرد لا ينتج أثرًا حفظيًا داخل المنصة.</p>
                          <p>يرجى استكمال التوقيع الثاني ليتم اعتماد الرسم وتسجيله رسميًا.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <p className="text-lg font-black leading-relaxed">الأستاذان العدلان المحترمان،</p>
                        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 font-bold">
                          <p>باكتمال التوقيعين، أصبح الرسم مستوفياً لشروط الاعتماد النظامي.</p>
                          <p>تم حفظه وتسجيله رسمياً، ويمكن الرجوع إليه ضمن سجلات الأرشيف المهني ابتداءً من تاريخه.</p>
                          <p>نشكركم على حسن التقيد بمقتضيات التوثيق المشترك.</p>
                        </div>

                        <div className="mt-6 rounded-2xl bg-violet-50 border border-violet-100 px-5 py-4 flex items-center justify-between">
                          <span className="text-sm font-black text-violet-800">رقم التسجيل:</span>
                          <span className="text-sm font-black text-violet-950">{registrationNumber}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex items-center justify-end gap-3">
                    {saveDialog === 'warning' ? (
                      <button
                        className="px-5 py-2.5 rounded-xl border-2 border-purple-500 text-purple-700 font-black text-sm hover:bg-purple-50 transition-colors"
                        onClick={() => setSaveDialog('none')}
                      >
                        العودة للتوقيع
                      </button>
                    ) : (
                      <>
                        <button
                          className="px-5 py-2.5 rounded-xl border-2 border-purple-500 text-purple-700 font-black text-sm hover:bg-purple-50 transition-colors"
                          onClick={() => {
                            setSaveDialog('none');
                            navigate('/notary-signing-portal');
                          }}
                        >
                          الرجوع إلى لوحة التحكم
                        </button>
                        <button
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 text-white font-black text-sm shadow-lg shadow-purple-500/20 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 transition-all"
                          onClick={() => {
                            setSaveDialog('none');
                            navigate(lastSignedDeedId ? `/signed-rasms/${lastSignedDeedId}` : '/signed-rasms');
                          }}
                        >
                          الانتقال إلى الأرشيف
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* (A) PDF Viewer Section - 60% Width */}
        <div className="flex-[3] flex flex-col border-l border-stone-400/60 bg-stone-300 relative h-full overflow-hidden">
          {/* Simple, robust document viewer */}
          <div className="flex-1 overflow-auto overscroll-contain bg-stone-300 flex items-start justify-center py-6">
            <div 
              className="transition-all duration-200"
              style={{
                width: Math.max(360, 800 * zoom),
                transformOrigin: 'top center',
                flexShrink: 0
              }}
            >
              <div 
                ref={signedDocCaptureRef}
                className={`bg-white overflow-hidden ${pendingPlacement ? 'cursor-crosshair' : ''}`}
                style={{
                  width: '100%',
                  aspectRatio: pdfSize ? (pdfSize.width / pdfSize.height) : (800 / 1120),
                  position: 'relative',
                  borderRadius: '24px',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
                }}
              >
                {/* Floating Pending Indicator */}
                {pendingPlacement && (
                  <div className="absolute inset-0 flex items-center justify-center z-[99] pointer-events-none">
                    <div className="bg-blue-600 text-white px-8 py-3 rounded-full font-black text-sm shadow-2xl animate-bounce">
                      اضغط في أي مكان لوضع التوقيع
                    </div>
                  </div>
                )}

                {pendingPlacement && (
                  <div
                    onClick={handleDocumentClick}
                    className="absolute inset-0 z-[90] cursor-crosshair bg-transparent"
                    aria-label="اختر موضع التوقيع"
                  />
                )}

                {/* Document Content */}
                {url ? (
                  <>
                    {isPDF ? (
                      <div className="w-full h-full bg-white">
                        <iframe
                          key={buildPdfViewerSrc(url, { page })}
                          src={buildPdfViewerSrc(url, { page })}
                          title="Signed PDF Preview"
                          className={`w-full h-full border-0 ${pendingPlacement ? 'pointer-events-none' : ''}`}
                          style={{ borderRadius: '24px' }}
                        />
                      </div>
                    ) : isPreparingSigningPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-white px-8 text-center">
                        <div className="w-12 h-12 mb-4 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
                        <p className="font-black text-lg">جاري تجهيز نسخة PDF للتوقيع</p>
                        <p className="text-sm mt-2">يتم تحويل آخر نسخة معدلة تلقائياً قبل فتح مساحة التوقيع.</p>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-white px-8 text-center">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-40" />
                        <p className="font-black text-lg">لا يمكن عرض هذه النسخة في صفحة التوقيع</p>
                        <p className="text-sm mt-2">صفحة التوقيع تدعم فقط PDF المولّد من الخادم عبر LibreOffice.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-white flex flex-col items-center justify-center text-slate-500">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-200 rounded-full mb-4 mx-auto" />
                      <p className="font-black text-lg">لا توجد نسخة PDF صالحة للتوقيع</p>
                      <p className="text-sm mt-2">يجب استعمال PDF المولّد من الخادم، وليس DOCX أو HTML.</p>
                    </div>
                  </div>
                )}

                {/* Placed signatures overlay (visual feedback) */}
                {!isPDF && placedSignatures.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none z-[80]">
                    {placedSignatures.filter((sig) => sig.page === page).map(sig => (
                      <img
                        key={sig.id}
                        src={sig.img}
                        alt="signature"
                        style={{
                          position: 'absolute',
                          left: sig.x,
                          top: sig.y,
                          width: 140,
                          transform: 'translate(-50%, -50%)',
                          opacity: 0.95
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 bg-stone-300 px-6 pb-6 pt-2 flex justify-center">
            <div className="bg-slate-950/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4">
              <div className="flex items-center gap-2 pr-2 border-l border-white/10">
                <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-1.5 hover:bg-slate-800 rounded transition-colors"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-xs font-black min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-1.5 hover:bg-slate-800 rounded transition-colors"><ZoomIn className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="p-1.5 hover:bg-slate-800 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs font-black">صفحة {page} من {pdfPageCount}</span>
                <button
                  onClick={() => setPage((prev) => Math.min(pdfPageCount, prev + 1))}
                  disabled={page >= pdfPageCount}
                  className="p-1.5 hover:bg-slate-800 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Logic Panels (A & B regions) */}
        <div className="flex-1 min-w-[400px] flex flex-col bg-slate-900 overflow-y-auto overscroll-contain border-r border-slate-800">
          
          {/* Attachments Selector */}
          {(() => {
            const finalPdfs = rasm?.attachments?.filter(a => a.category === 'audit_final_pdf') || [];
            const judgeAttachments = rasm?.attachments?.filter(a => a.category === 'judge_attachment') || [];
            const signableAttachments = finalPdfs.length ? finalPdfs : judgeAttachments;
            return signableAttachments.length > 1 ? (
              <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">اختر المرفق للتوقيع</h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {signableAttachments.map((att: any) => (
                      <button
                        key={att.id}
                        onClick={() => {
                          setSelectedAttachmentId(att.id);
                          setPendingPlacement(null); // Reset signature placement on document switch
                        }}
                        className={`w-full px-4 py-3 rounded-lg text-left text-xs font-bold transition-all ${
                          selectedAttachmentId === att.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400'
                            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <div className="truncate">{att.fileName || `مستند`}</div>
                        <div className="text-[10px] opacity-70 mt-1">{att.mimeType || 'مستند'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null;
          })()}
          
          {/* (B) Signing Status Section */}
          <div className="p-6 space-y-6">
            <div className="space-y-4">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-blue-500" />
                 بطاقة معلومات ذكية
               </h3>

               <div className="bg-slate-950/50 rounded-2xl p-5 border border-white/5 space-y-4 shadow-inner">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">رقم الرسم</span>
                    <span className="text-white font-black">{rasm?.fileNumber || '---'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">تاريخ التضمين</span>
                    <span className="text-white font-black">{new Date(rasm?.createdAt || '').toLocaleDateString('ar-MA')}</span>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] font-black text-slate-600 uppercase">بصمة SHA-256 الحالية</p>
                    <div className="bg-black/40 p-3 rounded-lg border border-white/5 flex items-center gap-3">
                       <Hash className="w-4 h-4 text-slate-500 shrink-0" />
                       <code className="text-[10px] font-mono text-blue-400 break-all leading-relaxed">{preHash}</code>
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">اختر الموقع (العدل)</h3>
               <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => !adoul1Signature && setActiveAdoul(1)}
                    disabled={!!adoul1Signature}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-right ${
                      activeAdoul === 1 
                        ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10' 
                        : adoul1Signature 
                          ? 'bg-emerald-600/10 border-emerald-500/50 opacity-100'
                          : 'bg-slate-950/50 border-white/5 opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      adoul1Signature ? 'bg-emerald-600 text-white' : (activeAdoul === 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500')
                    }`}>
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black">العدل الأول</p>
                      <p className="text-[10px] font-bold text-slate-500 italic">
                        {adoul1Signature ? 'تم التوقيع بنجاح' : (activeAdoul === 1 ? 'محدد حالياً للتوقيع' : 'انقر للتحديد')}
                      </p>
                    </div>
                    {adoul1Signature ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : activeAdoul === 1 && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                  </button>

                  <button 
                    onClick={() => !adoul2Signature && setActiveAdoul(2)}
                    disabled={!!adoul2Signature}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-right ${
                      activeAdoul === 2 
                        ? 'bg-amber-600/20 border-amber-500 shadow-lg shadow-amber-500/10' 
                        : adoul2Signature
                          ? 'bg-emerald-600/10 border-emerald-500/50 opacity-100'
                          : 'bg-slate-950/50 border-white/5 opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      adoul2Signature ? 'bg-emerald-600 text-white' : (activeAdoul === 2 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-500')
                    }`}>
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black">العدل الثاني</p>
                      <p className="text-[10px] font-bold text-slate-500 italic">
                        {adoul2Signature ? 'تم التوقيع بنجاح' : (activeAdoul === 2 ? 'محدد حالياً للتوقيع' : 'انقر للتحديد')}
                      </p>
                    </div>
                    {adoul2Signature ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : activeAdoul === 2 && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                  </button>
               </div>
            </div>

            <div className="h-px bg-slate-800" />

            {/* (C) Wacom Pad Panel */}
            <div className="space-y-4">
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

               {isWacomConnected ? (
                 <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
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
                         <span className="text-slate-100 font-mono tracking-wider">{deviceInfo.serial}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px] font-black border-t border-white/5 pt-2">
                         <span className="text-slate-500 uppercase">DPI / Precision</span>
                         <span className="text-blue-400 font-mono">{deviceInfo.resolution}</span>
                       </div>
                    </div>

                    <div className="relative group">
                       <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                       <div className="relative aspect-[4/2.5] bg-[#f8fafc] rounded-2xl border border-white/20 flex flex-col items-center justify-center p-0.5 overflow-hidden shadow-2xl">
                          {/* Live Signature Canvas (Like demobuttons sample) */}
                          <canvas 
                            ref={sigCanvasRef}
                            width={800}
                            height={480}
                            className={`w-full h-full rounded-2xl bg-white ${stuStatus === 'CAPTURING' ? 'block' : 'hidden'}`}
                          />

                          {stuStatus !== 'CAPTURING' && (
                            <div className="w-full h-full flex items-center justify-center relative bg-slate-900">
                               {adoul1Signature || adoul2Signature ? (
                                  <img 
                                    src={adoul1Signature || adoul2Signature || ''} 
                                    alt="Signature Preview" 
                                    className="max-h-[85%] object-contain"
                                  />
                               ) : (
                                  <div className="flex flex-col items-center opacity-30">
                                    <Monitor className="w-8 h-8 mb-2" />
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em]">AES-256 Secure Tunnel</p>
                                  </div>
                               )}
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                       {stuStatus === 'CAPTURING' ? (
                         <div className="grid grid-cols-3 gap-3">
                           <button 
                              onClick={() => {
                                 setIsCapturing(false);
                                 setStuStatus('CONNECTED');
                                 clearSignatureCanvas();
                              }}
                              className="flex items-center justify-center gap-2 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-xl transition-all"
                              title="إيقاف"
                           >
                              <span className="text-[10px] font-black">إلغاء</span>
                           </button>
                           
                           <button 
                              onClick={handleClearSTU}
                              className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-white/5"
                              title="مسح الشاشة"
                           >
                              <RefreshCcw className="w-4 h-4" />
                              <span className="text-[10px] font-black">مسح</span>
                           </button>

                           <button 
                              onClick={() => handleSaveSignature(activeAdoul)}
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

                           <button 
                              onClick={async () => {
                                 clearSignatureCanvas();
                                 await handleCaptureStart(activeAdoul);
                              }}
                              disabled={activeAdoul === 1 ? !!adoul1Signature : !!adoul2Signature}
                              className={`w-full flex items-center justify-center gap-3 py-4 ${
                                activeAdoul === 1 ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                              } disabled:bg-slate-800 disabled:text-slate-500 rounded-2xl transition-all shadow-xl group`}
                           >
                              <Pen className="w-5 h-5 group-hover:rotate-12 transition-transform text-white" />
                              <div className="text-right text-white">
                                 <p className="text-sm font-black">توقيع {activeAdoul === 1 ? 'العدل الأول' : 'العدل الثاني'}</p>
                                 <p className="text-[10px] font-bold opacity-70">
                                   {tabletSigningViewMode === 'full'
                                     ? 'التوقيع أثناء عرض الصفحة الحالية'
                                     : 'التوقيع داخل منطقة التوقيع المكبرة'}
                                 </p>
                              </div>
                           </button>

                           { (placedSignatures.length > 0 || currentPdfUrl !== originalPdfUrl || adoul1Signature || adoul2Signature) && (
                              <button 
                                onClick={clearSignatures}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-red-900/30 border border-white/5 hover:border-red-500/50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="text-xs font-black">حذف جميع التوقيعات</span>
                              </button>
                           )}
                         </div>
                       )}
                    </div>
                 </div>
               ) : (
                 <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-6 text-center space-y-5 shadow-2xl backdrop-blur-sm animate-in zoom-in-95 duration-500">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <div className="absolute inset-0 bg-red-500 rounded-full opacity-20 animate-ping"></div>
                      <AlertCircle className="w-16 h-16 text-red-500 relative" />
                    </div>
                    
                    <div className="space-y-2">
                       <p className="text-xs font-black text-white leading-relaxed">
                        {hardwareError || 'STU-540 Device Not Detected'}
                       </p>
                       <p className="text-[10px] font-bold text-slate-400">
                        Check USB Connection or Reset Software below.
                       </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button 
                        onClick={() => connectToSTUDevice(0)}
                        className="w-full flex items-center justify-center gap-3 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-xl shadow-red-900/40 active:scale-[0.98]"
                      >
                        <RefreshCcw className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Retry Connection</span>
                      </button>
                      
                      <button 
                        onClick={async () => {
                           setHardwareError("Performing Deep Reset...");
                           await disconnectLayer();
                           await new Promise(r => setTimeout(r, 250));
                           connectToSTUDevice(0);
                        }}
                        className="w-full text-[9px] text-red-400/80 font-black hover:text-white transition-all uppercase tracking-[0.15em] py-2.5 rounded-xl border border-white/5 hover:border-red-500/30 hover:bg-red-500/10"
                      >
                        ⚡ Force Hardware Release (Fix Busy)
                      </button>

                      {!hasAttemptedAutoTabletConnect && (
                      <button 
                        onClick={() => {
                          setHasAttemptedAutoTabletConnect(true);
                          void connectToSTUDevice(0);
                        }}
                        className="w-full flex items-center justify-center gap-3 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-xl shadow-blue-900/30 active:scale-[0.98]"
                      >
                        <Monitor className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Connect Tablet</span>
                      </button>
                      )}

                      <button 
                        onClick={() => window.location.reload()}
                        className="w-full text-[8px] text-slate-500 font-bold hover:text-slate-200 transition-all uppercase underline py-1"
                      >
                        Hard Refresh Application (If still busy)
                      </button>
                    </div>
                 </div>
               )}
            </div>
          </div>

          <div className="mt-auto p-6 bg-slate-950/40 border-t border-slate-800">
             <div className="flex items-center gap-3 p-4 bg-blue-600/10 rounded-2xl border border-blue-500/50">
                <Clock className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Session Timeout</p>
                   <p className="text-sm font-black text-white">29:45 متبقي</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
