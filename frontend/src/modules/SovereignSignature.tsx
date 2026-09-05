import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode';
import { trpc } from '../trpc';
import { WordPreview } from '../components/WordPreview';
import { RasmDocxPreview } from '../components/SmartDrafting/RasmDocxPreview';
import { releaseStuViaBeacon } from '../utils/stuReleaseBeacon';
import { 
  PenTool, 
  ShieldCheck, 
  FileCheck, 
  UserCheck, 
  ArrowRight,
  Printer,
  Download,
  Lock,
  Stamp,
  CheckCircle,
  AlertTriangle,
  LayoutGrid,
  FolderArchive,
  Settings,
  Search,
  Users,
  BookOpen,
  ScrollText,
  HeartPulse,
  History,
  Fingerprint,
  FileDigit,
  SlidersHorizontal,
  Monitor,
  X,
  ChevronLeft,
  Hash,
  Globe,
  Server,
  QrCode,
  Send,
  ChevronRight,
  Filter,
  Eye,
  Archive,
  MoreVertical,
  Palette,
  ShieldAlert,
  Bell,
  Trash2,
  FileWarning,
  Key,
  Info
} from 'lucide-react';

/* 
  8️⃣ البنية التقنية المقترحة لقاعدة البيانات (Proposed Database Schema)
  -------------------------------------------------------------
  Table: Signed_Deeds
  - id (UUID, PK)
  - serial_number (VARCHAR)
  - category_type (ENUM: marriage, divorce, property, inheritance, misc)
  - current_status (ENUM: pending, signed, sealed, archived)
  - created_at (TIMESTAMP)
  - locked (BOOLEAN) -> يمنع التعديل بعد الخطاب

  Table: Table_Inclusion_Data
  - deed_id (FK -> Signed_Deeds.id)
  - inclusion_number (INT)
  - inclusion_book (VARCHAR)
  - inclusion_date (DATE)

  Table: Table_Parties
  - id (UUID)
  - deed_id (FK)
  - party_name (VARCHAR)
  - party_cin (VARCHAR)
  - role (ENUM: first_party, second_party)

  Table: Table_Post_Seal_Version (نظام الأرشفة الذكية)
  - id (UUID)
  - parent_deed_id (FK)
  - seal_timestamp (TIMESTAMP)
  - sealed_by_user_id (FK)
  - version_hash (VARCHAR) -> لضمان عدم التلاعب بالنسخة السابقة
*/

// --- Types ---
type ViewLayer = 'dashboard' | 'archive' | 'signing' | 'settings';
type Category = 'marriage' | 'divorce' | 'property' | 'inheritance' | 'misc';

const stripHtmlToPlainText = (html: string) => {
    if (!html) return "";
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    let text = tmp.textContent || tmp.innerText || "";
    // Clean up excessive spaces/newlines
    return text.replace(/\s\s+/g, ' ').trim();
};

const isLikelyCssDump = (s: string) => {
    const t = s.trim();
    if (!t) return false;
    // Common docx-preview CSS selectors that should never be a real deed draft.
    if (/docx-preview-content-wrapper|docx-preview-content\b/i.test(t) && /\{[^}]*\}/.test(t)) return true;
    // Heuristic: lots of CSS-ish tokens and braces.
    const cssTokens = (t.match(/\b(margin|padding|border|display|flex|color|background|font|width|height)\b/gi) || []).length;
    const braceCount = (t.match(/[{}]/g) || []).length;
    return cssTokens >= 6 && braceCount >= 6;
};

const toNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const s = value.trim();
    if (!s.length) return null;
    if (isLikelyCssDump(s)) return null;
    return s;
};

const dataUrlToBlobUrl = (dataUrl: string): string | null => {
    try {
        const [header, base64] = dataUrl.split(',');
        if (!header || !base64) return null;

        const mimeMatch = header.match(/data:(.*?);base64/i);
        const mime = mimeMatch?.[1] || 'application/octet-stream';

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const blob = new Blob([bytes], { type: mime });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error('dataUrlToBlobUrl failed:', e);
        return null;
    }
};

interface DeedRecord {
    id: string;
    serialNumber: string;
    inclusionBook: string;
    date: string;
    parties: string[];
    cinShort: string;
    adouls?: string[];
    adoulsEmails?: string[];
    category: Category;
    status: {
        signed: boolean;
        sealed: boolean;
        archived: boolean;
        locked: boolean; // Feature 5: Prevent edit after seal
    };
    metadata?: {
        sealedAt?: string;
        sealedBy?: string;
    };
    fullData: any; // Add raw data for full rendering
}

// Document Viewer Component for displaying DOCX from data URLs
const DocumentViewer: React.FC<{ dataUrl: string; isDarkMode?: boolean }> = ({ dataUrl, isDarkMode = false }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        if (dataUrl && dataUrl.startsWith('data:')) {
            const bUrl = dataUrlToBlobUrl(dataUrl);
            setBlobUrl(bUrl);
            return () => {
                if (bUrl) URL.revokeObjectURL(bUrl);
            };
        }
        setBlobUrl(null);
    }, [dataUrl]);

    if (!dataUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                <p className="text-slate-400">No document to display</p>
            </div>
        );
    }

    // Detect if it's a Word document from the data URL mime type
    const isWordDoc = dataUrl.includes('wordprocessingml') || dataUrl.includes('msword');

    if (isWordDoc) {
        return (
            <WordPreview 
                url={blobUrl || dataUrl}
                isDarkMode={isDarkMode}
                editable={false}
            />
        );
    }

    // Fallback to iframe for other types
    return (
        <iframe
            src={blobUrl || dataUrl}
            className="w-full h-full border-0"
            title="Document Preview"
            allowFullScreen
        />
    );
};

export const SovereignSignature: React.FC = () => {
    const { id: routeId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const sessionToken = localStorage.getItem('sessionToken');

    const navigationDraft = useMemo(() => toNonEmptyString((location.state as any)?.draft), [location.state]);
    const navigationAuditedDraftUrl = useMemo(
        () => toNonEmptyString((location.state as any)?.auditedDraftUrl),
        [location.state]
    );
    const navigationAuditedDraftDataUrl = useMemo(
        () => toNonEmptyString((location.state as any)?.auditedDraftDataUrl),
        [location.state]
    );

    const normalizeDocUrl = (raw: any): string | null => {
        if (!raw || typeof raw !== 'string') return null;
        const trimmed = raw.trim();
        if (!trimmed) return null;
        // Accept absolute URLs (http/https), data URLs, and relative paths
        if (/^(https?:\/\/|data:|\/)/i.test(trimmed)) return trimmed;
        // Route-safe relative paths (e.g. "uploads/x.docx") should be treated as root-relative.
        const normalized = `/${trimmed.replace(/^\/+/, '')}`;
        // Validate that normalized path is not empty
        return normalized && normalized !== '/' ? normalized : null;
    };

    const addCacheBuster = (url: string | null): string | null => {
        if (!url || url.startsWith('data:')) return url; // Don't modify data: URLs
        // Add timestamp to break browser cache
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}v=${Date.now()}`;
    };

    const normalizedNavigationAuditedDraftUrl = useMemo(
        () => normalizeDocUrl(navigationAuditedDraftUrl),
        [navigationAuditedDraftUrl]
    );
    const normalizedNavigationAuditedDraftDataUrl = useMemo(
        () => normalizeDocUrl(navigationAuditedDraftDataUrl),
        [navigationAuditedDraftDataUrl]
    );

    useEffect(() => {
        if (!(import.meta as any).env?.DEV) return;
        // eslint-disable-next-line no-console
        console.log('[ReadyForSignature] location.state raw:', location.state);
        console.log('[ReadyForSignature] navigationDraft:', navigationDraft);
        console.log('[ReadyForSignature] navigationAuditedDraftUrl:', navigationAuditedDraftUrl);
        console.log('[ReadyForSignature] navigationAuditedDraftDataUrl:', navigationAuditedDraftDataUrl);
        console.log('[ReadyForSignature] normalizedNavigationAuditedDraftUrl:', normalizedNavigationAuditedDraftUrl);
        console.log('[ReadyForSignature] normalizedNavigationAuditedDraftDataUrl:', normalizedNavigationAuditedDraftDataUrl);
    }, [location.state]);

    useEffect(() => {
        if (!(import.meta as any).env?.DEV) return;
        // eslint-disable-next-line no-console
        console.log('[ReadyForSignature] nav', {
            navigationDraft,
            navigationAuditedDraftUrl,
            normalizedNavigationAuditedDraftUrl,
            navigationAuditedDraftDataUrl,
            normalizedNavigationAuditedDraftDataUrl,
            routeId,
        });
    }, [
        navigationAuditedDraftDataUrl,
        navigationAuditedDraftUrl,
        navigationDraft,
        normalizedNavigationAuditedDraftDataUrl,
        normalizedNavigationAuditedDraftUrl,
        routeId,
    ]);
    
    // --- State ---
    const [activeLayer, setActiveLayer] = useState<ViewLayer>(routeId ? 'signing' : 'dashboard');
    const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDeed, setSelectedDeed] = useState<DeedRecord | null>(null);
    const [seededFromNavigation, setSeededFromNavigation] = useState(false);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [hoveredDeedId, setHoveredDeedId] = useState<string | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'parties' | 'docs' | 'logs'>('info');
    const [signatureStatus, setSignatureStatus] = useState({
        adoul1: false,
        adoul2: false
    });
    const [selectedDocument, setSelectedDocument] = useState<any>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    // Feature 6: Comprehensive Settings
    const [settings, setSettings] = useState({
        // Display
        cardsPerPage: 6,
        displayMode: 'cards' as 'cards' | 'dense',
        defaultSort: 'date' as 'date' | 'number',
        darkMode: true,
        // Visual (Updated based on Traditional Moroccan Palette)
        primaryColor: '#0056b3', // Royal Blue
        alertColor: '#c41e3a',   // Ruby Red
        errorColor: '#8b0000',
        readyColor: '#008751',   // Emerald Green
        goldColor: '#d4af37',    // Gold Trim
        // Signature
        wacomEnabled: true,
        sigQuality: 'high' as 'low' | 'medium' | 'high',
        savePngCopy: true,
        comparePrevSig: true,
        clarityAlert: true,
        // Security
        preventDelete: true,
        lockAfterSeal: true,
        enableLog: true,
        multiFactor: false,
        // Notifications
        delayThreshold: 3, // days
        unsignedAlert: true,
        missingAttachAlert: true,
        // --- NEW: Secure Smart Footer Settings ---
        showSmartFooter: true,
        footerUnitOrder: ['inclusion', 'adouls', 'qr'],
        enableWatermark: true,
        qrEncryptionLevel: 'AES-256',
        qrExpiryDays: 30,
        enableOtpVerification: false
    });

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Feature 11: STU-540 Hardware Integration States
    const [isCapturing, setIsCapturing] = useState(false);
    const [activeAdoulForSig, setActiveAdoulForSig] = useState<'adoul1' | 'adoul2' | null>(null);
    const [stuStatus, setStuStatus] = useState<'SEARCHING' | 'CONNECTED' | 'CAPTURING' | 'SAVED' | 'ERROR'>('SEARCHING');
    const [hardwareError, setHardwareError] = useState<string | null>(null);
    const [probedPort, setProbedPort] = useState<number | null>(null);

    const [tabletInstance, setTabletInstance] = useState<any>(null);
    const sigCanvasRef = useRef<HTMLCanvasElement>(null);
    const [adoul1Signature, setAdoul1Signature] = useState<string | null>(null);
    const [adoul2Signature, setAdoul2Signature] = useState<string | null>(null);
    const [adoul1BioHash, setAdoul1BioHash] = useState<string | null>(null);
    const [adoul2BioHash, setAdoul2BioHash] = useState<string | null>(null);
    const [connectedDeviceInfo, setConnectedDeviceInfo] = useState<{
        idVendor?: number;
        idProduct?: number;
        model?: string;
        serialNumber?: string;
    } | null>(null);

    const tabletRef = useRef<any>(null);
    const reportHandlerRef = useRef<any>(null);
    const usbInterfaceRef = useRef<any>(null);
    const closingSessionRef = useRef<Promise<void> | null>(null);
    const capabilityRef = useRef<any>(null);
    const inkThresholdRef = useRef<any>(null);
    const penDataRef = useRef<any[]>([]);

    // Initial Data Fetching (Moved up for order)
    const marriageQuery = trpc.marriageRecords.list.useQuery(undefined, { enabled: selectedCategory === 'all' || selectedCategory === 'marriage' });
    const divorceQuery = trpc.divorceRecords.list.useQuery(undefined, { enabled: selectedCategory === 'all' || selectedCategory === 'divorce' });
    const propertyQuery = trpc.propertyFees.list.useQuery(undefined, { enabled: selectedCategory === 'all' || selectedCategory === 'property' });
    const inheritanceQuery = trpc.inheritanceFees.list.useQuery(undefined, { enabled: selectedCategory === 'all' || selectedCategory === 'inheritance' });
    const miscQuery = trpc.otherDocumentFees.list.useQuery(undefined, { enabled: selectedCategory === 'all' || selectedCategory === 'misc' });
    const savedRasmsQuery = trpc.feesAgent.documents.listSavedRasms.useQuery({ sessionToken: sessionToken || '' }, { enabled: !!sessionToken });

    //  Auto-select deed if ID is in the URL (using detailed fetch for precision)
    const oneDeedQuery = trpc.feesAgent.documents.getSavedRasm.useQuery(
        { sessionToken: sessionToken || '', id: routeId || '' },
        { enabled: !!sessionToken && !!routeId }
    );

    // Instant fallback bridge: if AuditHub passed a draft through navigation state,
    // render it immediately (before queries resolve). DB remains the real source.
    useEffect(() => {
        if (!routeId) {
            console.log('[ReadyForSignature] Seeding skipped: no routeId');
            return;
        }
        if (selectedDeed) {
            console.log('[ReadyForSignature] Seeding skipped: selectedDeed already set', selectedDeed);
            return;
        }
        if (!navigationDraft && !normalizedNavigationAuditedDraftDataUrl && !normalizedNavigationAuditedDraftUrl) {
            console.log('[ReadyForSignature] Seeding skipped: no navigation data found', {
                navigationDraft,
                normalizedNavigationAuditedDraftDataUrl,
                normalizedNavigationAuditedDraftUrl,
                rawAuditedDraftUrl: navigationAuditedDraftUrl,
                rawAuditedDraftDataUrl: navigationAuditedDraftDataUrl,
            });
            return;
        }

        const seedUrl = normalizedNavigationAuditedDraftDataUrl || normalizedNavigationAuditedDraftUrl;
        // Don't add cache buster to data URLs as it breaks them - only for regular URLs
        const seedUrlWithCache = seedUrl ? (seedUrl.startsWith('data:') ? seedUrl : addCacheBuster(seedUrl)) : null;
        const seedAttachments = seedUrlWithCache
            ? [
                  {
                      id: 'audit_draft',
                      category: 'audit_draft',
                      fileUrl: seedUrlWithCache,
                      url: seedUrlWithCache,
                      fileName: 'audited-draft.docx',
                  },
              ]
            : [];

        console.log('[v0] Seeding: normalizedDataUrl length=', normalizedNavigationAuditedDraftDataUrl?.length);
        console.log('[v0] Seeding: normalizedUrl length=', normalizedNavigationAuditedDraftUrl?.length);
        console.log('[v0] Seeding: seedUrl length=', seedUrl?.length);
        console.log('[v0] Seeding: seedUrlWithCache length=', seedUrlWithCache?.length);
        console.log('[v0] Seeding: attachments=', seedAttachments.length);

        const seed: DeedRecord = {
            id: routeId,
            serialNumber: '---',
            inclusionBook: 'أدـاري',
            date: new Date().toISOString(),
            parties: ['---', '---'],
            cinShort: '----',
            adouls: ['---', '---'],
            category: 'misc',
            status: { signed: false, sealed: false, archived: false, locked: false },
            fullData: { id: routeId, payload: { draft: navigationDraft || '' }, attachments: seedAttachments },
        };

        setSelectedDeed(seed);
        setSeededFromNavigation(true);
        setActiveLayer('signing');

        if ((import.meta as any).env?.DEV) {
            // eslint-disable-next-line no-console
            console.log('[SovereignSignature] seeded selectedDeed from navigation', {
                routeId,
                hasDraft: !!navigationDraft,
                normalizedNavigationAuditedDraftDataUrl,
                normalizedNavigationAuditedDraftUrl,
            });
        }
    }, [normalizedNavigationAuditedDraftDataUrl, normalizedNavigationAuditedDraftUrl, navigationDraft, routeId, selectedDeed]);

    // Sync Route to Selection
    useEffect(() => {
        if (oneDeedQuery.data && !seededFromNavigation) {
            const s = oneDeedQuery.data as any;
            const payload = s.payload || {};
            
            // Robust name extraction
            const firstParty = 
                payload.sellers?.[0]?.name || 
                payload.applicants?.[0]?.name || 
                payload.husband_name || 
                payload.parties_names?.split('-')?.[0] || 
                payload.deceased_name || 
                payload.applicants_names?.split(',')?.[0] || 
                '---';
            
            const secondParty = 
                payload.buyers?.[0]?.name || 
                payload.wife_name || 
                payload.parties_names?.split('-')?.[1] || 
                '---';
            
            const cin = (
                payload.sellers?.[0]?.idNumber || 
                payload.applicants?.[0]?.idNumber || 
                payload.husband_cin || 
                payload.parties_cin || 
                payload.applicants_cin || 
                '0000'
            ).toString();
            
            const docType = (
                s.documentType ||
                payload.documentType ||
                payload?.meta?.documentType ||
                ''
            ).toString();

            const deed: DeedRecord = {
                id: s.id,
                                serialNumber: s.fileNumber || payload?.meta?.fileNumber || payload?.fileNumber || '---',
                inclusionBook: 'أدـاري',
                date: s.createdAt,
                parties: [firstParty, secondParty],
                cinShort: cin.length >= 4 ? cin.slice(-4) : cin,
                adouls: ['الأستاذ المصطفى العلوي', 'العدل المترافع'],
                category: (
                  (docType.includes('زواج') || docType.includes('نكاح')) ? 'marriage' : 
                  (docType.includes('طلاق') || docType.includes('خلف')) ? 'divorce' :
                  (docType.includes('عقار') || docType.includes('بيع') || docType.includes('ملك') || docType.includes('أملاك') || docType.includes('املاك')) ? 'property' : 
                  (docType.includes('إرث') || docType.includes('تركات') || docType.includes('ترك') || docType.includes('ارث')) ? 'inheritance' :
                  'misc'
                ) as Category,
                status: {
                    signed: !!payload.signed1 || !!payload.signed2, 
                    sealed: !!payload.finalized,
                    archived: false,
                    locked: false
                },
                fullData: s
            };

            // Force selection and switch layer
            setSelectedDeed(deed);
            setSeededFromNavigation(false);
            setActiveLayer('signing');
            
            // Sync local signature status if anyway partial signatures exist
            if (payload.signed1 || payload.signed2) {
                setSignatureStatus({
                    adoul1: !!payload.signed1,
                    adoul2: !!payload.signed2
                });
            }
        }
    }, [oneDeedQuery.data, routeId, seededFromNavigation, setSelectedDeed, setActiveLayer, setSignatureStatus]);

    // 🔄 Fetch full detail for saved rasms when selected
    const rasmDetailQuery = trpc.feesAgent.documents.getSavedRasm.useQuery(
        { sessionToken: sessionToken || '', id: selectedDeed?.id || '' },
        { enabled: !!sessionToken && !!selectedDeed && (selectedDeed.inclusionBook === 'أدـاري' || selectedDeed.inclusionBook === 'س'), retry: 0 }
    );

    // 🚀 NEW: Status & Signing Logic Sync (Missing Bridge)
    const updateSubmissionStage = trpc.feesAgent.documents.updateSubmissionStage.useMutation();
    const handleSaveDeed = async (id: string, stage: 'sending' | 'inclusion' | 'done') => {
        try {
            await updateSubmissionStage.mutateAsync({
                sessionToken: sessionToken || '',
                submissionId: id,
                notaryStage: stage
            });
            await rasmDetailQuery.refetch();
            if (stage === 'done') {
                setShowSuccess(true);
            }
        } catch (err) {
            console.error('[handleSaveDeed] Error:', err);
        }
    };

    // Unified effect to sync selectedDocument with the best document available
    // from navigation state or database query results.
    useEffect(() => {
        if (!selectedDeed) return;
        
        // 1. If we have database detailed data, use it to (re)confirm or update selectedDocument
        if (rasmDetailQuery.data && !selectedDocument) {
             const attachments = (rasmDetailQuery.data as any).attachments || [];
             if (attachments.length > 0) {
                 const auditDraft = attachments.find((a: any) => (a.category || '').toLowerCase() === 'audit_draft');
                 const docToSelect = auditDraft || attachments[0];
                 console.log('[v0] Sync: Auto-selecting from DB attachments:', docToSelect.id);
                 setSelectedDocument(docToSelect);
             }
        }
        // 2. Fallback to seeded navigation attachments if no DB data yet or if it was seeded
        else if (seededFromNavigation && selectedDeed.fullData?.attachments && !selectedDocument) {
             const attachments = selectedDeed.fullData.attachments;
             if (attachments.length > 0) {
                 const auditDraft = attachments.find((a: any) => (a.category || '').toLowerCase() === 'audit_draft');
                 const docToSelect = auditDraft || attachments[0];
                 console.log('[v0] Sync: Auto-selecting from SEED attachments:', docToSelect.id);
                 setSelectedDocument(docToSelect);
             }
        }
    }, [selectedDeed, seededFromNavigation, rasmDetailQuery.data, selectedDocument]);

    // Cleanup: If route disappears, and we are in signing, maybe we should clear? 
    // Usually no, as user might have clicked it.

    const allDeeds = useMemo(() => {
        const results: DeedRecord[] = [];
        
        if (savedRasmsQuery.data && Array.isArray(savedRasmsQuery.data)) {
            (savedRasmsQuery.data as any[]).forEach((s: any) => {
                const payload = s.payload || {};

                                const docType = (
                                    s.documentType ||
                                    payload.documentType ||
                                    payload?.meta?.documentType ||
                                    payload.certificateType ||
                                    ''
                                ).toString();
                
                // Comprehensive name extraction
                const firstParty = 
                    payload.sellers?.[0]?.name || 
                    payload.applicants?.[0]?.name || 
                    payload.husband_name || 
                    payload.parties_names?.split('-')?.[0] || 
                    payload.deceased_name || 
                    payload.applicants_names?.split(',')?.[0] || 
                    '---';
                
                const secondParty = 
                    payload.buyers?.[0]?.name || 
                    payload.wife_name || 
                    payload.parties_names?.split('-')?.[1] || 
                    '---';
                
                const cin = (
                    payload.sellers?.[0]?.idNumber || 
                    payload.applicants?.[0]?.idNumber || 
                    payload.husband_cin || 
                    payload.parties_cin || 
                    payload.applicants_cin || 
                    '0000'
                ).toString();

                results.push({
                    id: s.id,
                                        serialNumber: s.fileNumber || payload?.meta?.fileNumber || payload?.fileNumber || 'قيد الانتظار',
                    inclusionBook: 'س', // 'س' for Saved/Secure
                    date: s.updatedAt || s.createdAt || new Date().toISOString(),
                    parties: [firstParty, secondParty], 
                    cinShort: cin.length >= 4 ? cin.slice(-4) : cin,
                    adouls: ['الأستاذ المصطفى العلوي', 'العدل المترافع'],
                    category: (
                                            (docType.includes('زواج') || docType.includes('نكاح')) ? 'marriage' : 
                                            (docType.includes('طلاق') || docType.includes('خلف')) ? 'divorce' :
                                            (docType.includes('عقار') || docType.includes('بيع') || docType.includes('ملك') || docType.includes('أملاك') || docType.includes('املاك')) ? 'property' : 
                                            (docType.includes('إرث') || docType.includes('تركات') || docType.includes('ترك') || docType.includes('ارث')) ? 'inheritance' :
                      'misc'
                    ) as Category,
                    status: {
                        signed: !!payload.signed1 || !!payload.signed2, 
                        sealed: !!payload.finalized,
                        archived: false,
                        locked: !!payload.finalized
                    },
                    fullData: { ...s, isSavedRasm: true }
                });
            });
        }

        if (marriageQuery.data) {
            marriageQuery.data.forEach((m: any) => results.push({
                id: m.id,
                serialNumber: m.registry_number ? `${m.registry_number}/${m.registry_count || ''}` : '2024/M-New',
                inclusionBook: m.registry_book_type || 'أ',
                date: m.inclusion_date || new Date().toISOString(),
                parties: [m.husband_name || 'الزوج', m.wife_name || 'الزوجة'],
                cinShort: (m.husband_cin || '0000').slice(-4),
                adouls: ['العدل بناني', 'العدل الفاسي'],
                adoulsEmails: ['benani.adl@justice.ma', 'fassi.adl@justice.ma'],
                category: 'marriage',
                status: { 
                    signed: !!m.document_url, 
                    sealed: m.is_verified || false, 
                    archived: m.is_archived || false, 
                    locked: m.is_verified || false 
                },
                fullData: m
            }));
        }

        if (divorceQuery.data) {
            divorceQuery.data.forEach((d: any) => results.push({
                id: d.id,
                serialNumber: d.divorce_registry_number ? `${d.divorce_registry_number}/${d.divorce_registry_count || ''}` : '2024/D-New',
                inclusionBook: d.divorce_registry_book_type || 'ب',
                date: d.inclusion_date || new Date().toISOString(),
                parties: [d.husband_name || 'الزوج', d.wife_name || 'الزوجة'],
                cinShort: (d.husband_cin || '0000').slice(-4),
                adouls: ['العدل بناني', 'العدل الفاسي'],
                adoulsEmails: ['benani.adl@justice.ma', 'fassi.adl@justice.ma'],
                category: 'divorce',
                status: { 
                    signed: !!d.document_url, 
                    sealed: d.is_verified || false, 
                    archived: d.is_archived || false, 
                    locked: d.is_verified || false 
                },
                fullData: d
            }));
        }

        if (propertyQuery.data) {
            propertyQuery.data.forEach((p: any) => results.push({
                id: p.id,
                serialNumber: p.registry_number ? `${p.registry_number}/${p.registry_count || ''}` : '2024/P-New',
                inclusionBook: p.registry_book_type || 'ج',
                date: p.inclusion_date || new Date().toISOString(),
                parties: (p.parties_names || 'بدون اسم').split('-'),
                cinShort: (p.parties_cin || '0000').slice(-4),
                adouls: ['العدل بناني', 'العدل الفاسي'],
                adoulsEmails: ['benani.adl@justice.ma', 'fassi.adl@justice.ma'],
                category: 'property',
                status: { 
                    signed: !!p.document_url, 
                    sealed: p.is_verified || false, 
                    archived: p.is_archived || false, 
                    locked: p.is_verified || false 
                },
                fullData: p
            }));
        }

        if (inheritanceQuery.data) {
            inheritanceQuery.data.forEach((i: any) => results.push({
                id: i.id,
                serialNumber: i.registry_number ? `${i.registry_number}/${i.registry_count || ''}` : '2024/H-New',
                inclusionBook: i.registry_book_type || 'د',
                date: i.inclusion_date || new Date().toISOString(),
                parties: [i.deceased_name || 'المتوفى', 'الورثة'],
                cinShort: (i.applicants_cin || '0000').slice(-4),
                adouls: ['العدل بناني', 'العدل الفاسي'],
                adoulsEmails: ['benani.adl@justice.ma', 'fassi.adl@justice.ma'],
                category: 'inheritance',
                status: { 
                    signed: !!i.document_url, 
                    sealed: i.is_verified || false, 
                    archived: i.is_archived || false, 
                    locked: i.is_verified || false 
                },
                fullData: i
            }));
        }

        if (miscQuery.data) {
            miscQuery.data.forEach((m: any) => results.push({
                id: m.id,
                serialNumber: m.registry_number ? `${m.registry_number}/${m.registry_count || ''}` : '2024/X-New',
                inclusionBook: 'هـ',
                date: m.inclusion_date || new Date().toISOString(),
                parties: (m.applicants_names || 'طالب الوثيقة').split(','),
                cinShort: (m.applicants_cin || '0000').slice(-4),
                adouls: ['العدل بناني', 'العدل الفاسي'],
                adoulsEmails: ['benani.adl@justice.ma', 'fassi.adl@justice.ma'],
                category: 'misc',
                status: { 
                    signed: !!m.document_url, 
                    sealed: m.is_verified || false, 
                    archived: m.is_archived || false, 
                    locked: m.is_verified || false 
                },
                fullData: m
            }));
        }

        // Apply Search Filter locally and sort by date (newest first)
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return results.filter(deed => {
            const matchesCategory = selectedCategory === 'all' || deed.category === selectedCategory;
            const matchesSearch = searchQuery === '' || 
                deed.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                deed.parties.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesSearch;
        });
    }, [marriageQuery.data, divorceQuery.data, propertyQuery.data, inheritanceQuery.data, miscQuery.data, savedRasmsQuery.data, selectedCategory, searchQuery]);

    // � Auto-select deed if ID is in the URL (using detailed fetch for precision)


    // �🔄 Fetch full detail for saved rasms when selected
    //🔄 Fetch full detail for saved rasms when selected
    useEffect(() => {
        if ((import.meta as any).env?.DEV && selectedDeed) {
            if (rasmDetailQuery.isLoading) {
                console.log('[rasmDetailQuery] Loading for id:', selectedDeed.id);
            } else if (rasmDetailQuery.error) {
                console.error('[rasmDetailQuery] Error for id:', selectedDeed.id, 'error:', (rasmDetailQuery.error as any).message);
            } else if (rasmDetailQuery.data) {
                console.log('[rasmDetailQuery] Success, attachments:', (rasmDetailQuery.data as any).attachments?.length);
            }
        }
    }, [rasmDetailQuery.isLoading, rasmDetailQuery.error, rasmDetailQuery.data, selectedDeed]);

    const clearCanvas = () => {
        const canvas = sigCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    };

    const sha256Hex = async (dataUrl: string) => {
        try {
            const base64 = dataUrl.split(',')[1] || '';
            const binary = window.atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const digest = await crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(digest))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
        } catch {
            return null;
        }
    };

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

    const disconnectTablet = async () => {
        const tablet = tabletRef.current;
        const reportHandler = reportHandlerRef.current;
        const usbInterface = usbInterfaceRef.current;
        const wgss = (window as any).WacomGSS;
        const isStuReady = !!wgss?.STU?.isServiceReady?.();
        const p = wgss?.STU ? new wgss.STU.Protocol() : null;

        try {
            if (reportHandler?.stopReporting) {
                await reportHandler.stopReporting();
            }
        } catch {
            // ignore
        } finally {
            reportHandlerRef.current = null;
        }

        try {
            if (isStuReady) {
                await clearTabletScreen(tablet);
            }
        } catch {
            // ignore
        }

        try {
            if (isStuReady && tablet && p?.InkingMode) {
                await tablet.setInkingMode(p.InkingMode.InkingMode_Off);
            }
        } catch {
            // ignore
        }

        try {
            if (isStuReady && tablet?.disconnect) {
                await tablet.disconnect();
            }
        } catch {
            // ignore
        }

        try {
            if (isStuReady && usbInterface?.disconnect) {
                await usbInterface.disconnect();
            }
        } catch {
            // ignore
        } finally {
            usbInterfaceRef.current = null;
        }

        try {
            if (wgss?.STU && typeof wgss.STU.close === 'function') {
                wgss.STU.close();
            }
        } catch {
            // ignore
        } finally {
            try {
                if (wgss) wgss.STU = null;
            } catch {
                // ignore
            }
        }

        tabletRef.current = null;
        setTabletInstance(null);
        setConnectedDeviceInfo(null);
        capabilityRef.current = null;
        inkThresholdRef.current = null;
        penDataRef.current = [];
    };

    const closeSignatureSession = async () => {
        if (closingSessionRef.current) return closingSessionRef.current;
        const task = (async () => {
            try {
                await disconnectTablet();

                // Give the service/OS a moment to release the exclusive USB handle.
                await new Promise((resolve) => setTimeout(resolve, 300));
            } finally {
                setIsCapturing(false);
                setActiveAdoulForSig(null);
                setStuStatus('SEARCHING');
                setHardwareError(null);
                setProbedPort(null);
            }
        })();

        closingSessionRef.current = task.finally(() => {
            closingSessionRef.current = null;
        });
        return closingSessionRef.current;
    };

    // Best-effort synchronous release for unload/refresh (do not rely on awaited Promises).
    const forceReleaseSync = () => {
        try {
            const wgss = (window as any).WacomGSS;

            try {
                tabletRef.current?.endCapture?.();
            } catch {
                // ignore
            }

            try {
                tabletRef.current?.setClearScreen?.();
            } catch {
                // ignore
            }

            try {
                tabletRef.current?.disconnect?.();
            } catch {
                // ignore
            }

            try {
                usbInterfaceRef.current?.disconnect?.();
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
            reportHandlerRef.current = null;
            usbInterfaceRef.current = null;
        }
    };

    // Ensure the device/session is released on refresh/navigation.
    useEffect(() => {
        // Best-effort: send a release signal that survives unload.
        // This complements local JS cleanup, which is not always awaited on browser refresh.
        const warmupSigCaptX = async () => {
            const wgss = (window as any).WacomGSS;
            if (!wgss?.STUConstructor) return;

            let host: string = 'localhost';
            try {
                host = window.localStorage.getItem('wacomSigCaptXHost') || 'localhost';
            } catch {
                // ignore
            }

            try {
                if (wgss?.STU && typeof wgss.STU.close === 'function') {
                    wgss.STU.close();
                }
            } catch {
                // ignore
            }

            try {
                wgss.STU = null;
            } catch {
                // ignore
            }

            try {
                wgss.STU = new wgss.STUConstructor(9000, host);
            } catch {
                return;
            }

            for (let i = 0; i < 6; i++) {
                try {
                    if (wgss?.STU?.isServiceReady?.()) break;
                } catch {
                    // ignore
                }
                await new Promise((r) => setTimeout(r, 500));
            }

            try {
                await wgss?.STU?.getUsbDevices?.();
            } catch {
                // ignore
            }
        };

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

        void warmupSigCaptX();

        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            void closeSignatureSession();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Calculate Counts for Dashboard
    const stats = useMemo(() => {
        const categories: Category[] = ['marriage', 'divorce', 'property', 'inheritance', 'misc'];
        const summary: Record<string, { signed: number; unsigned: number; archived: number }> = {};
        
        categories.forEach(cat => {
            const catDeeds = allDeeds.filter(d => d.category === cat);
            summary[cat] = {
                signed: catDeeds.filter(d => d.status.signed).length,
                unsigned: catDeeds.filter(d => !d.status.signed).length,
                archived: catDeeds.filter(d => d.status.archived).length
            };
        });
        return summary;
    }, [allDeeds]);

    // --- Helpers ---
    const mapWacomErrorToArabic = (err: any) => {
        const msg = String(err?.message ?? err ?? '').toLowerCase();
        if (msg.includes('timeout')) {
            return 'المنفذ 9000 لا يستجيب (Timeout). يرجى تشغيل خدمة SigCaptX/Device Control App ثم إعادة المحاولة.';
        }
        if (msg.includes('not_connected_error') || msg.includes('not connected')) {
            return 'الجهاز مقفول/��حجوز من تطبيق آخر. أغلق أي برنامج يستخدم جهاز Wacom، ثم افصل/أعد توصيل USB وأعد المحاولة.';
        }
        if (msg.includes('no stu devices')) {
            return 'لم يتم العثور على جهاز STU متصل عبر USB.';
        }
        return 'خطأ في التواصل مع جهاز التوقيع: ' + (err?.message || String(err));
    };

    const searchForSTUDevice = async (adoul: 'adoul1' | 'adoul2') => {
        // Always start from a clean slate (idempotent; safe if already closed)
        await closeSignatureSession();

        setIsCapturing(true);
        setActiveAdoulForSig(adoul);
        setStuStatus('SEARCHING');
        setHardwareError(null);
        setProbedPort(9000);
        clearCanvas();

        // Helper to wait for the service (Poll for SigCaptX readiness)
        const waitForService = (wgss: any, retries: number): Promise<boolean> => {
            return new Promise((resolve) => {
                let count = 0;
                const check = () => {
                    if (wgss && wgss.STU && wgss.STU.isServiceReady()) {
                        resolve(true);
                    } else if (count < retries) {
                        count++;
                        setTimeout(check, 1000); // Wait 1 second between polls
                    } else {
                        resolve(false);
                    }
                };
                check();
            });
        };

        const wgss = (window as any).WacomGSS;
        
        if (!wgss || !wgss.STU) {
            setStuStatus('ERROR');
            setHardwareError('لم يتم تحميل مكتبة Wacom. يرجى التأكد من تحميل wgssStuSdk.js.');
            return;
        }

        // Use the LOCAL SDK (public/demobuttons/wgssStuSdk.js) like PortCheck.
        // We do NOT depend on loading wgssSigCaptX.js from the service.
        const tryConnect = async (host: string) => {
            const currentWgss = (window as any).WacomGSS;

            // Cleanup previous websocket if any
            if (currentWgss?.STU?.close) {
                try {
                    currentWgss.STU.close();
                } catch {
                    // ignore
                }
            }

            if (!currentWgss?.STUConstructor) return false;

            console.log(`PortCheck: Trying SigCaptX at ${host}:9000...`);
            currentWgss.STU = new currentWgss.STUConstructor(9000, host);

            const isReady = await waitForService(currentWgss, 10);
            if (!isReady) return false;

            const dcaReady = await currentWgss.STU.isDCAReady().catch(() => false);
            console.log(`PortCheck: WebService ready=${isReady}, DCA ready=${dcaReady} on ${host}`);

            try {
                window.localStorage.setItem('wacomSigCaptXHost', host);
            } catch {
                // ignore
            }

            return true;
        };

        try {
            let preferredHost: string | null = null;
            try {
                preferredHost = window.localStorage.getItem('wacomSigCaptXHost');
            } catch {
                preferredHost = null;
            }

            const hostsToTry = preferredHost
                ? [preferredHost, preferredHost === 'localhost' ? '127.0.0.1' : 'localhost']
                : ['localhost', '127.0.0.1'];

            let isReady = false;
            for (const host of hostsToTry) {
                isReady = await tryConnect(host);
                if (isReady) break;
            }

            if (!isReady) {
                setStuStatus('ERROR');
                setHardwareError('فشل تشخيص الاتصال. خدمة Wacom SigCaptX لا تستجيب على 127.0.0.1 أو localhost. يرجى التأكد من تشغيل "STU SigCaptX Service" وتثبيت "Device Control App".');
                return;
            }

            // Once ready, we must use the WacomGSS object that was initialized in tryConnect
            const activeWgss = (window as any).WacomGSS;
            const getUsbDevicesWithRetry = async (attempt: number): Promise<any[]> => {
                try {
                    const list = await activeWgss.STU.getUsbDevices();
                    if (Array.isArray(list) && list.length > 0) return list;
                } catch {
                    // continue
                }
                if (attempt >= 2) return [];
                await new Promise((r) => setTimeout(r, 500));
                return getUsbDevicesWithRetry(attempt + 1);
            };

            const devices = await getUsbDevicesWithRetry(0);
            if (!devices || devices.length === 0) {
                setStuStatus('ERROR');
                setHardwareError('تم العثور على الخدمة بنجاح، لكن لم يتم العثور على جهاز STU متصل عبر USB.');
                return;
            }

            const WACOM_VENDOR_ID = 0x056a;
            const targetProductId = activeWgss.STU?.ProductId?.ProductId_540;
            const candidate =
                devices.find((d: any) => d?.idVendor === WACOM_VENDOR_ID && d?.idProduct === targetProductId) ||
                devices.find((d: any) => String(d?.model || d?.name || '').toUpperCase().includes('STU-540'));

            if (!candidate) {
                setStuStatus('ERROR');
                setHardwareError('تم العثور على جهاز STU، لكن ليس من نوع STU-540. الموديل المكتشف: ' + (devices[0]?.model || 'غير معروف'));
                return;
            }

            const isSupported = await activeWgss.STU.isSupportedUsbDevice(candidate.idVendor, candidate.idProduct);
            if (!isSupported) {
                setStuStatus('ERROR');
                setHardwareError('الجهاز المكتشف غير مدعوم من خدمة SigCaptX الحالية.');
                return;
            }

            const doConnect = async (attempt: number): Promise<void> => {
                try {
                    const intf = new activeWgss.STU.UsbInterface();
                    await intf.Constructor();
                    usbInterfaceRef.current = intf;

                    // Connect to the device
                    await intf.connect(candidate, true);
                    await new Promise((r) => setTimeout(r, 250));

                    const tablet = new activeWgss.STU.Tablet();
                    await tablet.Constructor(intf, null, null);
                    tabletRef.current = tablet;
                    setTabletInstance(tablet);

                    const capability = await tablet.getCapability();
                    const p = new activeWgss.STU.Protocol();
                    capabilityRef.current = capability;

                    const info = await tablet.getInformation().catch(() => null);
                    const productId = await tablet.getProductId().catch(() => null);
                    setConnectedDeviceInfo({
                        idVendor: candidate.idVendor,
                        idProduct: candidate.idProduct ?? productId ?? undefined,
                        model: info?.modelName || info?.model || 'STU-540',
                        serialNumber: info?.serialNumber || info?.serial || undefined,
                    });

                    const inkThreshold = await tablet.getInkThreshold().catch(() => null);
                    inkThresholdRef.current = inkThreshold;

                    await clearTabletScreen(tablet);
                    setStuStatus('CONNECTED');

                    // Set pen mode for STU-540
                    await tablet.setPenDataOptionMode(p.PenDataOptionMode.PenDataOptionMode_TimeCountSequence);
                    await tablet.setInkingMode(p.InkingMode.InkingMode_On);

                    const reportHandler = new activeWgss.STU.ProtocolHelper.ReportHandler();
                    reportHandlerRef.current = reportHandler;
                    penDataRef.current = [];

                    let isDown = false;
                    let lastPoint = { x: 0, y: 0 };
                    const distance = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);

                    const penData = (report: any) => {
                const canvas = sigCanvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (!canvas || !ctx) return;

                const cap = capabilityRef.current;
                const tabletMaxX = cap?.tabletMaxX ?? 10800;
                const tabletMaxY = cap?.tabletMaxY ?? 6480;
                const nextPoint = {
                    x: Math.round((canvas.width * report.x) / tabletMaxX),
                    y: Math.round((canvas.height * report.y) / tabletMaxY),
                };

                const thr = inkThresholdRef.current;
                const onMark = thr?.onPressureMark ?? 1;
                const offMark = thr?.offPressureMark ?? 0;
                const pressure = report.pressure ?? 0;
                const isDown2 = isDown ? !(pressure <= offMark) : pressure > onMark;

                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;

                if (!isDown && isDown2) {
                    lastPoint = nextPoint;
                }

                if ((isDown2 && distance(lastPoint, nextPoint) > 2) || (isDown && !isDown2)) {
                    ctx.beginPath();
                    ctx.moveTo(lastPoint.x, lastPoint.y);
                    ctx.lineTo(nextPoint.x, nextPoint.y);
                    ctx.stroke();
                    ctx.closePath();
                    lastPoint = nextPoint;
                }

                isDown = isDown2;
                penDataRef.current.push(report);
                    };

                    reportHandler.onReportPenData = penData;
                    reportHandler.onReportPenDataOption = penData;
                    reportHandler.onReportPenDataTimeCountSequence = penData;

                    await reportHandler.startReporting(tablet, true);
                    setStuStatus('CAPTURING');
                } catch (e: any) {
                    const msg = String(e?.message ?? e ?? '');
                    if (
                        attempt < 2 &&
                        (msg.includes('not_connected_error') || msg.includes('not_connected') || msg.includes('instance not found'))
                    ) {
                        await disconnectTablet();
                        await new Promise((r) => setTimeout(r, 1500));
                        return doConnect(attempt + 1);
                    }
                    throw e;
                }
            };

            await doConnect(0);

        } catch (err: any) {
            console.error("SDK Error:", err);
            setStuStatus('ERROR');
            setHardwareError(mapWacomErrorToArabic(err));
            await disconnectTablet();
        }
    };

    const handleSign = (adoul: 'adoul1' | 'adoul2') => {
        if (settings.wacomEnabled) {
            searchForSTUDevice(adoul);
        } else {
            setSignatureStatus(prev => ({ ...prev, [adoul]: true }));
        }
    };

    const confirmSTUSignature = async () => {
        const canvas = sigCanvasRef.current;
        if (!canvas || !activeAdoulForSig) return;

        const dataUrl = canvas.toDataURL('image/png');
        const hash = await sha256Hex(dataUrl);

        if (activeAdoulForSig === 'adoul1') {
            setAdoul1Signature(dataUrl);
            if (hash) setAdoul1BioHash(hash);
        } else {
            setAdoul2Signature(dataUrl);
            if (hash) setAdoul2BioHash(hash);
        }

        setSignatureStatus(prev => ({ ...prev, [activeAdoulForSig]: true }));
        setStuStatus('SAVED');

        await disconnectTablet();
        setIsCapturing(false);
        setActiveAdoulForSig(null);
    };

    const cancelCapture = async () => {
        await disconnectTablet();
        setIsCapturing(false);
        setActiveAdoulForSig(null);
        setStuStatus('SEARCHING');
        setHardwareError(null);
    };

    const toggleLayer = (layer: ViewLayer) => {
        setActiveLayer(layer);
    };

    useEffect(() => {
        if (signatureStatus.adoul1 && signatureStatus.adoul2) {
            setShowSuccess(true);
        }
    }, [signatureStatus]);

    useEffect(() => {
        // Signatures are bound to the currently selected deed (in-memory).
        // When switching deeds, reset the signature slots.
        if (!selectedDeed) return;
        if (isCapturing) return;

        setSignatureStatus({ adoul1: false, adoul2: false });
        setAdoul1Signature(null);
        setAdoul2Signature(null);
        setAdoul1BioHash(null);
        setAdoul2BioHash(null);
        setShowSuccess(false);
        // Clear previous document when switching deeds to ensure fresh fetch
        setSelectedDocument(null);
    }, [selectedDeed?.id]);

    useEffect(() => {
        return () => {
            disconnectTablet();
            // Global SDK cleanup to release service connection
            const wgss = (window as any).WacomGSS;
            if (wgss && wgss.STU && typeof wgss.STU.close === 'function') {
                try { wgss.STU.close(); } catch(e) {}
            }
        };
    }, []);

    // --- Sub-Components ---

    // 1. Dashboard View
    const DashboardView = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {[
                { key: 'property', label: 'رسوم الأملاك', icon: LayoutGrid, gradient: 'from-[#003d80] via-[#0056b3] to-[#003d80]' },
                { key: 'marriage', label: 'رسوم الزواج', icon: HeartPulse, gradient: 'from-[#005f38] via-[#008751] to-[#005f38]' },
                { key: 'divorce', label: 'رسوم الطلاق', icon: ScrollText, gradient: 'from-[#800000] via-[#c41e3a] to-[#800000]' },
                { key: 'inheritance', label: 'رسوم التركات', icon: BookOpen, gradient: 'from-[#1a1a1a] via-[#4a4a4a] to-[#1a1a1a]' },
                { key: 'misc', label: 'باقي الوثائق', icon: FolderArchive, gradient: 'from-[#b8860b] via-[#d4af37] to-[#b8860b]' },
            ].map((cat) => (
                <button 
                    key={cat.key}
                    onClick={() => { setSelectedCategory(cat.key as Category); toggleLayer('archive'); }}
                    className="group relative bg-[#0a0f1e] border-t-2 border-b-2 border-[#d4af37]/40 p-8 rounded-[1.5rem] hover:scale-[1.02] transition-all text-right overflow-hidden shadow-2xl"
                >
                    <div className={`absolute top-0 left-0 right-0 h-12 bg-gradient-to-r ${cat.gradient} opacity-20`}></div>
                    <div className="relative z-10 space-y-4">
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-white text-2xl shadow-lg ring-2 ring-[#d4af37]/50`}>
                           <cat.icon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-black text-white">{cat.label}</h3>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400">الموقعة: <span className="text-emerald-400">{stats[cat.key]?.signed || 0}</span></p>
                            <p className="text-[11px] font-bold text-slate-400">لم تُخاطب: <span className="text-red-400">{stats[cat.key]?.unsigned || 0}</span></p>
                            <p className="text-[11px] font-bold text-slate-400">المؤرشفة: <span className="text-blue-400">{stats[cat.key]?.archived || 0}</span></p>
                        </div>
                        <div className="pt-4 flex items-center justify-between border-t border-white/5">
                            <span className="text-[10px] font-black uppercase text-[#d4af37] tracking-tighter">فتح المستندات</span>
                            <ChevronLeft className="w-4 h-4 text-[#d4af37] group-hover:-translate-x-1 transition-all" />
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );

    // 9️⃣ بطاقة ملخص عائمة (Floating Summary Card)
    const FloatingSummaryCard = ({ deed }: { deed: DeedRecord }) => (
        <div className="absolute top-0 right-0 z-50 w-64 p-5 bg-slate-900/95 backdrop-blur-3xl border border-blue-500/30 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300 pointer-events-none text-right">
             <div className="space-y-4">
                 <div className="flex justify-between items-center border-b border-white/5 pb-2">
                     <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                         deed.category === 'property' ? 'bg-blue-500/20 text-blue-400' : 
                         deed.category === 'marriage' ? 'bg-emerald-500/20 text-emerald-400' : 
                         deed.category === 'divorce' ? 'bg-rose-500/20 text-rose-400' :
                         'bg-[#d4af37]/20 text-[#d4af37]'
                     }`}>
                         {deed.category === 'property' ? 'عقار' : deed.category === 'marriage' ? 'زواج' : deed.category === 'divorce' ? 'طلاق' : 'مختلفات'}
                     </span>
                     <h5 className="text-xs font-black text-slate-500 uppercase">ملخص الرسم</h5>
                 </div>
                 <div className="space-y-2">
                     <div className="flex justify-between items-center">
                         <CheckCircle className={`w-3 h-3 ${deed.status.signed ? 'text-emerald-400' : 'text-slate-600'}`} />
                         <span className="text-[11px] text-slate-300 font-bold">ح��لة التوقيع</span>
                     </div>
                     <div className="flex justify-between items-center">
                         <Stamp className={`w-3 h-3 ${deed.status.sealed ? 'text-blue-400' : 'text-slate-600'}`} />
                         <span className="text-[11px] text-slate-300 font-bold">حالة الخطاب</span>
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-[10px] text-amber-400 font-bold">4 ملفات</span>
                         <span className="text-[11px] text-slate-300 font-bold">عدد المرفقات</span>
                     </div>
                 </div>
                 <div className="pt-2 flex justify-center">
                    <span className="text-[9px] font-black text-blue-500 animate-pulse">انقر للتفاصيل الكاملة</span>
                 </div>
             </div>
        </div>
    );

    // 2. Archive View (Card-based list)
    const ArchiveView = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Search & Filter Bar */}
            <div className="flex flex-wrap gap-4 items-center bg-white/5 p-4 rounded-3xl border border-white/10">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                        type="text"
                        placeholder="البحث بالرسم، الأطراف، البطاقة الوطنية، أو السند..."
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-300 font-bold border border-white/5 flex items-center gap-2">
                        <Filter className="w-4 h-4" /> تصفية
                    </button>
                    <select 
                        className="px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white font-bold outline-none"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as any)}
                    >
                        <option value="all">كل الأقسام</option>
                        <option value="marriage">الزواج</option>
                        <option value="divorce">الطلاق</option>
                        <option value="property">الأملاك</option>
                        <option value="inheritance">التركات</option>
                        <option value="misc">باقي الوثائق</option>
                    </select>
                </div>
            </div>

            {/* Smart Cards Grid (Feature 7: Limit elements) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allDeeds.length > 0 ? allDeeds.slice(0, settings.cardsPerPage).map((deed) => (
                    <div 
                        key={`${deed.category}-${deed.id}`}
                        onMouseEnter={() => setHoveredDeedId(deed.id)}
                        onMouseLeave={() => setHoveredDeedId(null)}
                        className="group bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 hover:border-[#d4af37]/50 transition-all hover:shadow-2xl hover:shadow-[#d4af37]/5 cursor-pointer relative overflow-hidden"
                        onClick={() => { setSelectedDeed(deed); setShowDetailPanel(true); }}
                    >
                        {/* Status Strip */}
                        <div className={`absolute top-0 right-0 w-1.5 h-full ${deed.status.archived ? 'bg-blue-500' : deed.status.sealed ? 'bg-[#008751]' : 'bg-[#d4af37]'}`}></div>
                        
                        {/* Feature 9: Floating Card on Hover */}
                        {hoveredDeedId === deed.id && <FloatingSummaryCard deed={deed} />}

                        <div className="flex justify-between items-start mb-6">
                            <div className="text-right">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {deed.category === 'property' ? 'عقار' : deed.category === 'marriage' ? 'زواج' : deed.category === 'divorce' ? 'طلاق' : 'مختلفات'}
                                </span>
                                <h4 className="text-xl font-black text-white mt-1">{deed.serialNumber}</h4>
                            </div>
                            <div className="flex gap-1">
                                {deed.status.signed && <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg"><FileDigit className="w-4 h-4" /></div>}
                                {deed.status.sealed && <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg"><Stamp className="w-4 h-4" /></div>}
                                {deed.status.locked && <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg"><Lock className="w-4 h-4" /></div>}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1 text-right">
                                <p className="text-[12px] font-bold text-slate-400">الأطراف الأساسية:</p>
                                <p className="text-sm font-black text-white truncate">{deed.parties.join(' - ')}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">رقم البطاقة</p>
                                    <p className="text-xs font-black text-slate-300">****{deed.cinShort}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">سجل البيانات</p>
                                    <p className="text-xs font-black text-slate-300">{deed.inclusionBook}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                             <div className="flex -space-x-2 space-x-reverse">
                                 <div className="w-8 h-8 rounded-full bg-[#003d80] border border-[#d4af37]/30 flex items-center justify-center text-[10px] text-white">ع1</div>
                                 <div className="w-8 h-8 rounded-full bg-[#005f38] border border-[#d4af37]/30 flex items-center justify-center text-[10px] text-white">ع2</div>
                             </div>
                             <button className="flex items-center gap-2 text-xs font-black text-[#d4af37] hover:text-white transition-colors">
                                عرض التفاصيل <ChevronLeft className="w-4 h-4" />
                             </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <FolderArchive className="w-20 h-20 mx-auto text-slate-800" />
                        <p className="text-slate-500 font-black text-xl">لا توجد رسوم في هذا القسم حالياً</p>
                    </div>
                )}
            </div>

            {/* Pagination / Load More (Feature 7) */}
            <div className="flex justify-center pt-8">
                 <button className="px-12 py-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-slate-400 font-black text-sm transition-all hover:text-white">
                     عرض المزيد من الرسوم
                 </button>
            </div>
        </div>
    );

    // 3. Detail Slide Panel (Layer 3 overlay - Feature 7: Tabs inside)
    const DetailSlidePanel = () => (
        <div className={`fixed inset-y-0 left-0 w-full max-w-2xl bg-[#0f172a] shadow-[-20px_0_60px_rgba(0,0,0,0.5)] z-[1100] transform transition-transform duration-500 ease-out p-1 flex ${showDetailPanel ? 'translate-x-0' : '-translate-x-full'}`}>
             <div className="flex-1 bg-[#020617] m-1 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden">
                {/* Panel Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <button onClick={() => setShowDetailPanel(false)} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <ArrowRight className="w-6 h-6" />
                    </button>
                    <div className="text-right">
                        <h3 className="text-2xl font-black text-white">تفاصيل الرسم {selectedDeed?.serialNumber}</h3>
                         <div className="flex items-center justify-end gap-2 mt-1">
                             {selectedDeed?.status.locked && <span className="flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded cursor-help" title="لا يمكن التعديل بعد الخطاب"><Lock className="w-3 h-3" /> نسخة مقفلة</span>}
                             <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded">ID: {selectedDeed?.id}</span>
                         </div>
                    </div>
                    
                    {/* Backup Button to Legacy Signature */}
                    <button 
                        onClick={() => navigate(`/ready-for-signature/${selectedDeed?.id}`, { state: location.state })}
                        className="mr-auto ml-4 px-6 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl font-black text-xs hover:bg-amber-500/20 transition-all flex items-center gap-2"
                        title="Back to Legacy Signature Page"
                    >
                        <Settings className="w-4 h-4" />
                        الواجهة القديمة (احتياطية)
                    </button>
                </div>

                {/* Layered Tabs inside Details (Feature 7) */}
                <div className="flex bg-white/5 border-b border-white/5 p-2 gap-2">
                    {[
                        { id: 'info', icon: Info, label: 'البيانات' },
                        { id: 'parties', icon: Users, label: 'الأطراف' },
                        { id: 'docs', icon: FolderArchive, label: 'المرفقات' },
                        { id: 'logs', icon: History, label: 'السجلات' },
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveDetailTab(tab.id as any)}
                            className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs ${activeDetailTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:bg-white/5'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Tabs */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-10">
                     {activeDetailTab === 'info' && (
                        <div className="space-y-12 animate-in fade-in duration-300">
                             <div className="space-y-6">
                                <h4 className="flex items-center gap-3 justify-end text-blue-400 font-black tracking-widest text-sm border-b border-blue-500/10 pb-3">
                                    أولاً: بيانات التضمين الإداري <History className="w-5 h-5" />
                                </h4>
                                <div className="grid grid-cols-2 gap-8 text-right">
                                    <div>
                                        <p className="text-[12px] text-slate-500 font-bold mb-1">العدد وصحيفة التحرير</p>
                                        <p className="text-lg font-black text-white">{selectedDeed?.serialNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-[12px] text-slate-500 font-bold mb-1">تاريخ تلقي الرسم</p>
                                        <p className="text-lg font-black text-white">{selectedDeed?.date ? new Date(selectedDeed.date).toLocaleDateString('ar-MA') : '---'}</p>
                                    </div>
                                </div>
                             </div>

                             <div className="space-y-6">
                                <h4 className="flex items-center gap-3 justify-end text-blue-400 font-black tracking-widest text-sm border-b border-blue-500/10 pb-3">
                                    ثانياً: بيانات السجل والمجلد <LayoutGrid className="w-5 h-5" />
                                </h4>
                                <div className="bg-white/5 p-6 rounded-3xl text-right">
                                    <p className="text-slate-300 font-bold leading-relaxed">تـم تضمين هذا الرسم تحت كناشة رقم {selectedDeed?.inclusionBook} وفق الضوابط القانونية المعمول بها في خطة العدالة.</p>
                                </div>
                             </div>

                             {/* Feature 5: Smart Archiving Metadata */}
                             {selectedDeed?.status.sealed && (
                                <div className="space-y-6 bg-blue-500/5 p-6 rounded-[2rem] border border-blue-500/10">
                                    <h4 className="flex items-center gap-3 justify-end text-emerald-400 font-black text-sm">بيانات الخطاب والأرشفة <CheckCircle className="w-5 h-5" /></h4>
                                    <div className="grid grid-cols-2 gap-4 text-right">
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold">تاريخ الخطاب</p>
                                            <p className="text-xs font-black text-white">{selectedDeed.metadata?.sealedAt}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold">المستخدم المسؤل</p>
                                            <p className="text-xs font-black text-white">{selectedDeed.metadata?.sealedBy}</p>
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>
                     )}

                     {activeDetailTab === 'parties' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {selectedDeed?.parties.map((p, i) => (
                                <div key={i} className="bg-white/5 p-6 rounded-3xl flex items-center justify-between border border-white/5">
                                    <span className="text-slate-500 font-bold text-xs">{i === 0 ? 'الطرف الأول' : 'الطرف الثاني'}</span>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-white">{p}</p>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">CIN: EE12345{i}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                     )}

                     {activeDetailTab === 'docs' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             <div className="p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-emerald-400 transition-all cursor-pointer">
                                 <Download className="w-5 h-5" />
                                 <span className="font-black text-sm">نسخة التوقيع المعتمدة (Original)</span>
                                 <FileDigit className="w-6 h-6" />
                             </div>
                             {selectedDeed?.status.sealed && (
                                <div className="p-4 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between text-blue-400 transition-all cursor-pointer">
                                    <Download className="w-5 h-5" />
                                    <span className="font-black text-sm">نسخة ما بعد الخطاب (Sealed Copy)</span>
                                    <Stamp className="w-6 h-6" />
                                </div>
                             )}
                        </div>
                     )}

                     {activeDetailTab === 'logs' && (
                        <div className="space-y-4 animate-in fade-in duration-300 text-right">
                            {[
                                { t: '2024-05-12 09:00', act: 'إنشاء مسودة الرسم', u: 'العدل بناني' },
                                { t: '2024-05-12 14:20', act: 'إتمام التوقيع الرقمي', u: 'العدل الفاسي' },
                                { t: '2024-05-14 10:30', act: 'إضافة خطاب القاضي والأ��شفة', u: 'المستخدم الرئيس' },
                            ].map((log, i) => (
                                <div key={i} className="p-4 border-r-2 border-slate-700 bg-white/5 space-y-1">
                                    <p className="text-xs text-blue-400 font-black">{log.act}</p>
                                    <p className="text-[10px] text-slate-500 font-bold">{log.t} | بواسطة: {log.u}</p>
                                </div>
                            ))}
                        </div>
                     )}
                </div>

                {/* Floating Action Bar */}
                <div className="p-8 bg-slate-900/50 border-t border-white/5 flex gap-4">
                    <button 
                        disabled={selectedDeed?.status.locked}
                        onClick={() => { setShowDetailPanel(false); toggleLayer('signing'); }} 
                        className={`flex-1 py-5 rounded-[1.8rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl transition-all ${selectedDeed?.status.locked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/10'}`}
                    >
                        {selectedDeed?.status.locked ? <Lock className="w-5 h-5" /> : <PenTool className="w-5 h-5" />}
                        {selectedDeed?.status.locked ? 'الرسم مقفل نهائياً' : 'تجهيز للتوقيع العدلي'}
                    </button>
                    <button className="p-5 bg-white/5 text-slate-300 rounded-[1.8rem] border border-white/10 hover:bg-white/10 transition-all">
                        <Archive className="w-6 h-6" />
                    </button>
                </div>
             </div>
        </div>
    );

    // 4. Notary Document Viewer (Feature 10: Real Preview)
    const NotaryDocumentViewer = (props: any) => {
        const { deed, selectedDocument: propSelectedDoc } = props;
        const isSavedRasm = deed.inclusionBook === 'أدـاري';
        // Force Rasm mode if we have a document from AuditHub navigation or property selection
        const forceRasmMode = isSavedRasm || !!propSelectedDoc || (!!navigationAuditedDraftDataUrl) || (!!navigationAuditedDraftUrl);
        
        // Use fullData from selection if available (instant), otherwise fallback to the query for freshest detail
        const detail = forceRasmMode ? (rasmDetailQuery?.data || deed?.fullData || props.selectedDocument?.fullData) : null;
        const data = (detail as any)?.payload || {};
        
        const [isSecured, setIsSecured] = useState(false);
        const [secureHash, setSecureHash] = useState('');
        const [qrDataUrl, setQrDataUrl] = useState('');
        const [showQR, setShowQR] = useState(false);
        const [docObjectUrl, setDocObjectUrl] = useState<string | null>(null);

        // Memoized logic for determining which document to display
        const displayDoc = useMemo(() => {
            if ((import.meta as any).env?.DEV && rasmDetailQuery.error) {
                console.error('[NotaryDocumentViewer] rasmDetailQuery error:', (rasmDetailQuery.error as any).message || rasmDetailQuery.error);
            }
            
            if (!forceRasmMode) return null;
            
            // Priority Logics...
            console.log('[displayDoc] Computing displayDoc with forceRasmMode:', forceRasmMode);
        const logStartTime = Date.now();
        
        if (!forceRasmMode) {
            console.log('[displayDoc] Returning null: forceRasmMode is false');
            return null;
        }

        console.log('[displayDoc] ===== START CALCULATION =====');
        
        // 🥇 PRIORITY 0: If parent already determined the selectedDocument, use it!
        if (propSelectedDoc) {
            const url = propSelectedDoc.url || propSelectedDoc.fileUrl || propSelectedDoc.file_url;
            console.log('[displayDoc] ✅ PATH 0: Using propSelectedDoc:', { id: propSelectedDoc.id, hasUrl: !!url });
            if (url) {
                return { ...propSelectedDoc, fileUrl: addCacheBuster(normalizeDocUrl(url)), url: addCacheBuster(normalizeDocUrl(url)) };
            }
            if (propSelectedDoc.textContent || propSelectedDoc.draft) {
                return { ...propSelectedDoc, kind: 'rasmHtml' as const, textContent: propSelectedDoc.textContent || propSelectedDoc.draft };
            }
        }

        console.log('[displayDoc] navigationDraft exists?', !!navigationDraft);
        console.log('[displayDoc] navigationAuditedDraftUrl exists?', !!navigationAuditedDraftUrl);
        console.log('[displayDoc] navigationAuditedDraftDataUrl exists?', !!navigationAuditedDraftDataUrl);
        console.log('[displayDoc] seededFromNavigation?', seededFromNavigation);

        // 🥇 PRIORITY 0: If navigating from AuditHub with an in-memory DOCX data URL, use it first
        // Base64 data: URLs have no caching issues and render immediately
        const navDataUrl = normalizeDocUrl(navigationAuditedDraftDataUrl);
        console.log('[displayDoc] navDataUrl:', navDataUrl);
        if (navDataUrl?.startsWith('data:')) {
            console.log('[displayDoc] ✅ PATH 1: Using data: URL (base64 - no cache issues)');
            return {
                id: 'audit_draft_from_nav_data',
                fileUrl: navDataUrl,
                url: navDataUrl,
                category: 'audit_draft',
            };
        }

        // 🥇 PRIORITY 0: If navigating from AuditHub, use the actual DOCX file URL with cache buster
        // This is THE ACTUAL DOCUMENT, not text injection - always prefer this!
        const navUrl = normalizeDocUrl(navigationAuditedDraftUrl);
        console.log('[displayDoc] navUrl raw:', navigationAuditedDraftUrl);
        console.log('[displayDoc] navUrl normalized:', navUrl);
        if (navUrl) {
            const bustedUrl = addCacheBuster(navUrl);
            console.log('[displayDoc] ✅ PATH 2: Using actual DOCX file with cache buster:', bustedUrl);
            return { 
                id: 'audit_draft_from_nav', 
                fileUrl: bustedUrl, 
                url: bustedUrl,
                category: 'audit_draft'
            };
        }

        // 🥈 PRIORITY 1: Only if NO real document URLs exist, fall back to text-based draft
        // Text injection is a fallback, not the primary method
        if (seededFromNavigation) {
            const navDraft = toNonEmptyString(navigationDraft);
            console.log('[displayDoc] seededFromNavigation, navDraft:', navDraft?.substring(0, 50));
            if (navDraft && !isLikelyCssDump(navDraft)) {
                console.log('[displayDoc] ✅ PATH 3: Using nav draft (text-based FALLBACK)');
                return { id: 'draft_from_nav', kind: 'rasmHtml' as const, textContent: navDraft };
            }
        }
        
        console.log('[displayDoc] ⚠️ No navigation URLs or text, checking database...');

            // If no navigation data, we need detail to continue
            if (!detail) {
                console.log('[displayDoc] No detail yet, returning null');
                return null;
            }

            const payload = (detail as any).payload || {};
            const attachments = (detail as any).attachments || [];
            console.log('[displayDoc] detail has', attachments.length, 'attachments');

            // Helper to get valid URL from attachment
            const getValidUrl = (a: any): string | null => {
                const candidates = [a?.fileUrl, a?.url, a?.file_url];
                for (const c of candidates) {
                    const normalized = normalizeDocUrl(c);
                    if (normalized) {
                        // Add cache buster to force fresh download from server
                        return addCacheBuster(normalized);
                    }
                }
                return null;
            };

            // 🥇 Priority 1: Any uploaded DOCX file (renders via URL mode = reliable)
            // Check for audit_draft first (what AuditHub uploads after finalization)
            const auditedAttachment = attachments.find((a: any) => (a.category || '').toLowerCase() === 'audit_draft');
            const auditedUrl = getValidUrl(auditedAttachment);
            if (auditedUrl) {
                return { ...(auditedAttachment || { id: 'audit_draft' }), fileUrl: auditedUrl, url: auditedUrl };
            }

            // Primary attachment from agent/judge
            const primary = attachments.find((a: any) => 
                (a.category || '').toLowerCase() === 'primary_attachment'
            );
            const primaryUrl = getValidUrl(primary);
            if (primaryUrl) {
                return { ...primary, fileUrl: primaryUrl };
            }

            // Judge-managed attachment
            const judgeManaged = attachments.find((a: any) => 
                (a.category || '').toLowerCase() === 'judge_attachment' || 
                (a.category || '').toLowerCase() === 'judge_primary'
            );
            const judgeUrl = getValidUrl(judgeManaged);
            if (judgeUrl) {
                return { ...judgeManaged, fileUrl: judgeUrl };
            }

            // Any other DOCX in attachments with valid URL
            const anyDoc = attachments.find((a: any) => {
                const isDocx = ((a.fileName || a.file_name || '').toLowerCase().endsWith('.docx'));
                return isDocx && getValidUrl(a);
            });
            if (anyDoc) {
                return { ...anyDoc, fileUrl: getValidUrl(anyDoc) };
            }

            // 🥈 Priority 2: Text-based draft - use RasmDocxPreview for stability (same as AuditHub)
            const persistedDraft = toNonEmptyString((rasmDetailQuery?.data as any)?.payload?.draft);
            const selectedDraft = toNonEmptyString((deed.fullData as any)?.payload?.draft);
            const navDraft = navigationDraft;
            const contentDraft = toNonEmptyString((deed as any)?.content); // fallback to raw content if exists
            const effectiveDraft = persistedDraft || selectedDraft || navDraft || contentDraft;

            console.log('[displayDoc] Text draft search: persistedDraft=' + !!persistedDraft + ', selectedDraft=' + !!selectedDraft + ', navDraft=' + !!navDraft);

            if (effectiveDraft && !isLikelyCssDump(effectiveDraft)) {
                console.log('[displayDoc] Returning text draft (rasmHtml)');
                return { id: 'draft', kind: 'rasmHtml' as const, textContent: effectiveDraft };
            }

            // 📜 Priority 3: Original Smart Template (Generated HTML) - use RasmDocxPreview like AuditHub
            const rawHtml = (payload.rasmHtml || (detail as any).rasmHtml);
            if (rawHtml) {
                const templateText = toNonEmptyString(stripHtmlToPlainText(String(rawHtml || '')));
                if (templateText) {
                    console.log('[displayDoc] Returning rasmHtml template');
                    return { id: 'smart', kind: 'rasmHtml' as const, rasmHtml: rawHtml, textContent: templateText };
                }
            }

            console.log('[displayDoc] Returning null: no document source found');
            return null;
        }, [
            forceRasmMode,
            detail,
            deed.fullData,
            navigationDraft,
            (deed as any).content,
            navigationAuditedDraftDataUrl,
            navigationAuditedDraftUrl,
            rasmDetailQuery.data,
            seededFromNavigation,
            propSelectedDoc, // Added prop dependency
        ]);

        useEffect(() => {
            // cleanup previous
            if (docObjectUrl) URL.revokeObjectURL(docObjectUrl);

            const rawUrl = (displayDoc as any)?.url || (displayDoc as any)?.fileUrl;
            if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('data:')) {
                const blobUrl = dataUrlToBlobUrl(rawUrl);
                setDocObjectUrl(blobUrl);
                return () => {
                   if (blobUrl) URL.revokeObjectURL(blobUrl);
                };
            }

            setDocObjectUrl(null);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [displayDoc]);

        useEffect(() => {
            if (!(import.meta as any).env?.DEV) return;
            // eslint-disable-next-line no-console
            console.log('[NotaryDocumentViewer-displayDoc] Final displayDoc value:', displayDoc);
        }, [displayDoc]);

        const categoryLabels: Record<string, string> = {
            marriage: 'رسم زواج شرعي',
            divorce: 'رسم طلاق اتفاقي',
            property: 'رسم ملكية عقارية',
            inheritance: 'رسم إراثة شرعية',
            misc: 'وثيقة عدلية عامة'
        };

        const handleSecureSeal = async () => {
            setIsSecured(true);
            
            // 🔒 Generate Sovereign Hash (Unique Document Fingerprint)
            const payload = JSON.stringify({
                id: deed.id,
                serialNumber: deed.serialNumber,
                category: deed.category,
                inclusionBook: deed.inclusionBook,
                date: deed.date,
                timestamp: Date.now()
            });

            // Simulate SHA-256 Hash Generation for UI
            const mockHash = 'SHA256-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            setSecureHash(mockHash);

            try {
                // 📡 Real QR Code Generation
                // Payload includes encrypted-like sovereign link
                const secureLink = `https://moj.gov.ma/verify/deed/${deed.id}?h=${mockHash}`;
                const qrUrl = await QRCode.toDataURL(secureLink, {
                    width: 256,
                    margin: 1,
                    color: {
                        dark: '#0f172a', // slate-900
                        light: '#ffffff'
                    }
                });
                setQrDataUrl(qrUrl);
            } catch (err) {
                console.error('QR Generation Failed:', err);
            }
            
            // Effect: Simulated processing delay for the Sovereign Seal
            setTimeout(() => {
                setShowQR(true);
            }, 1200);
        };

        const isModernDoc = !!((displayDoc as any)?.url || (displayDoc as any)?.fileUrl);

        // UI for Legacy Records (manual HTML) vs Modern Documents (WordPreview)
        // Unified UI structure ensures consistent theme, watermarks, and headers for both modes.
        if (forceRasmMode && displayDoc && isModernDoc) {
            console.log('[NotaryDocumentViewer] Rendering consolidated A4 for DOCX - displayDoc present');
            return (
                <>
                <div className="flex flex-col gap-10 w-full items-center justify-center animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20 relative">
                    {/* 🛡️ Sovereign Overlay for Word Preview */}
                    {isSecured && showQR && qrDataUrl && (
                        <div className="fixed top-1/2 left-1/4 -translate-y-1/2 z-[40] pointer-events-none animate-in fade-in zoom-in duration-1000">
                             <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2rem] border-2 border-slate-900 shadow-2xl flex flex-col items-center gap-4">
                                <img src={qrDataUrl} alt="QR" className="w-48 h-48 drop-shadow-sm" />
                                <div className="text-center">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Fingerprint Hash</div>
                                    <div className="text-xs font-mono bg-slate-100 px-3 py-1 rounded-full text-slate-600 border border-slate-200">{secureHash}</div>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* 📄 Real Word Preview */}
                    <div className={`relative transition-all duration-1000 ${isSecured ? 'scale-[0.98]' : ''}`} style={{ width: '100%' }}>
                         {displayDoc ? (
                             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
                                {(() => {
                                    const rawUrl = (displayDoc as any)?.url || (displayDoc as any)?.fileUrl;
                                    const url = docObjectUrl || rawUrl;
                                    const textContent = (displayDoc as any)?.textContent;
                                    console.log('🔹 Rendering displayDoc:', {
                                        hasUrl: !!url,
                                        hasObjectUrl: !!docObjectUrl,
                                        hasTextContent: !!textContent,
                                        url,
                                        textContentLength: textContent?.length,
                                        displayDoc
                                    });
                                    
                                    if (url) {
                                        return <WordPreview
                                            key={`url-${url}`}
                                            url={url}
                                            isDarkMode={settings.darkMode}
                                            editable={false}
                                        />;
                                    } else if (textContent) {
                                        return <WordPreview
                                            key={`draft-${textContent.length}`}
                                            textContent={textContent}
                                            isDarkMode={settings.darkMode}
                                            editable={false}
                                        />;
                                    } else {
                                        console.error('🔴 displayDoc exists but has neither url nor textContent:', displayDoc);
                                        return <div className="text-red-500 p-4">Error: Document has no renderable content</div>;
                                    }
                                })()}
                             </div>
                         ) : detail ? (
                             <div className="flex flex-col items-center justify-center p-20 text-slate-400 italic font-black text-2xl">
                                 لا يوجد مستند للعرض
                             </div>
                         ) : (
                             <div className="flex flex-col items-center justify-center p-20 text-blue-400/50 italic font-black text-2xl animate-pulse">
                                جارِ استخراج البيانات المؤمنة من الخزنة الرقمية...
                             </div>
                         )}
                    </div>

                    {/* Overlay: Signature Marks for Adoul 1 & 2 */}
                    <div className="absolute top-1/2 left-0 right-0 h-0 flex justify-between px-20 pointer-events-none">
                         <div className={`transition-all duration-500 transform ${signatureStatus.adoul1 ? 'scale-100 opacity-100' : 'scale-150 opacity-0'}`}>
                             <div className="w-40 h-40 border-4 border-emerald-500 rounded-full flex items-center justify-center -rotate-12 bg-white/30 backdrop-blur-sm shadow-2xl">
                                 <span className="text-emerald-500 font-caveat text-4xl">Signed V1</span>
                             </div>
                         </div>
                         <div className={`transition-all duration-500 transform ${signatureStatus.adoul2 ? 'scale-100 opacity-100' : 'scale-150 opacity-0'}`}>
                             <div className="w-40 h-40 border-4 border-blue-500 rounded-full flex items-center justify-center rotate-12 bg-white/30 backdrop-blur-sm shadow-2xl">
                                 <span className="text-blue-500 font-caveat text-4xl">Signed V2</span>
                             </div>
                         </div>
                    </div>
                </div>

                {/* 🛡️ Sovereign Global Controls (Unified) */}
                <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] border border-slate-200 shadow-2xl flex items-center justify-between gap-10 sticky bottom-6 z-50 w-full max-w-7xl mx-auto print:hidden">
                    <div className="flex items-center gap-6">
                        <ShieldCheck className="w-10 h-10 text-[#1f3c88]" />
                        <div className="text-right">
                            <h3 className="text-xl font-black text-slate-900 leading-none mb-1">محطة الأمن السيادي الذكية</h3>
                            <p className="text-slate-500 text-[10px] font-bold">تأمين الوثيقة العدلية وفق بروتوكولات وزارة العدل المغربية</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        {!isSecured ? (
                            <button onClick={handleSecureSeal} className="bg-[#1f3c88] text-white px-10 py-5 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-lg active:scale-95">
                                تفعيل الختم السيادي (Seal)
                            </button>
                        ) : (
                            <div className="flex gap-4 animate-in slide-in-from-right-2">
                                <button onClick={() => window.print()} className="border-2 border-slate-900 text-slate-900 px-8 py-4 rounded-2xl font-black hover:bg-slate-50">
                                    طباعة الرسم السيادي
                                </button>
                                <button onClick={() => handleSaveDeed(deed.id, 'sending')} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-emerald-700 shadow-xl">
                                    الإرسال النهائي للمحكمة
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                </>
            );
        } // End of isModernDoc if

        /* 🥇 Case B: Legacy Moroccan Record UI (Manual HTML or Text) 
           This path remains the gold standard for traditional deeds */
        return (
            <div className="flex flex-col gap-10 w-full items-center justify-center animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">
                <div 
                    id="printed-document"
                    className={`bg-white text-slate-950 p-[15mm] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] rounded-sm w-[210mm] min-h-[297mm] font-amiri leading-[1.6] relative border-[1px] border-slate-200 overflow-auto transition-all duration-1000 print:shadow-none print:border-none print:m-0 ${isSecured ? 'ring-8 ring-blue-50 ring-offset-0 border-blue-200' : ''}`}
                    style={{ boxSizing: 'border-box' }}
                >
                    
                    {/* 🛡️ Sovereign Watermark Layer */}
                    {settings.enableWatermark && (
                        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none transition-all duration-1000 ${isSecured ? 'opacity-[0.05]' : 'opacity-0'}`}>
                             <div className="rotate-45 text-8xl font-black border-[12px] border-slate-900 p-16 uppercase tracking-[1.5rem] whitespace-nowrap">
                                نسخة أصلية مؤمنة
                             </div>
                        </div>
                    )}

                    {/* Background Kingdom Shield (Faint) */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
                         <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Coat_of_arms_of_Morocco.svg/1200px-Coat_of_arms_of_Morocco.svg.png" className="w-[70%] h-auto max-w-md" alt="" />
                    </div>

                    {/* Official Kingdom Header */}
                    <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-6">
                        <div className="text-center font-black text-[11px] space-y-1 text-slate-700">
                            <p className="text-slate-950 text-xs">المملكة المغربية</p>
                            <p>وزارة العدل</p>
                            <p>محكمة الاستئناف بفاس</p>
                            <p>مكتب العدول المنتدبين</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Coat_of_arms_of_Morocco.svg/1200px-Coat_of_arms_of_Morocco.svg.png" 
                                alt="Morocco Coat" 
                                className="h-20 w-auto mb-2 drop-shadow-sm"
                            />
                            <h2 className="text-2xl font-black underline decoration-double underline-offset-8 mt-2 text-[#1f3c88] tracking-tight">{categoryLabels[deed.category]}</h2>
                        </div>
                        <div className="text-center font-black text-[11px] space-y-1 text-slate-700">
                            <p>كناشة التضمين: <span className="text-slate-950 bg-slate-100 px-2 py-0.5 rounded">{deed.inclusionBook}</span></p>
                            <p>الرقم الترتيبي: <span className="text-slate-950 bg-slate-100 px-2 py-0.5 rounded">{deed.serialNumber}</span></p>
                            <p>تاريخ الإدراج: <span className="text-slate-950 font-mono italic">{new Date(deed.date).toLocaleDateString('ar-MA')}</span></p>
                        </div>
                    </div>

                    {/* Document Body (Sovereign Script) */}
                    <div className="text-right space-y-6 relative z-10">
                        <div className="text-center font-black text-2xl tracking-[0.3rem] mb-6 text-slate-900">الحمد لله وحده</div>
                        
                        <p className="text-lg">
                            <span className="font-black underline underline-offset-4 ml-2">بمقتضاه:</span>
                            بناءً على طلب الأطراف المسجلين بدفتر المحاضر، فقد حضر لدى العدلين الموقعين أدناه، من تم التعرف عليهما قانوناً وبالهوية الصحيحة، للإشهاد على ما يلي:
                        </p>

                        <div className={`p-6 rounded-xl border-2 border-slate-100 space-y-3 transition-colors duration-700 shadow-sm ${isSecured ? 'bg-blue-50/10 border-blue-100' : 'bg-slate-50/50'}`}>
                            {deed.category === 'marriage' && (
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="flex items-start gap-4">
                                        <div className="w-2 h-2 rounded-full bg-[#1f3c88] mt-[8px]"></div>
                                        <p className="flex-1 text-lg font-medium"><span className="font-black ml-2 underline decoration-blue-200 underline-offset-4">الزوج:</span> السيد <span className="font-black text-blue-900">{data.husband_name}</span>، الحامل لبطاقة التعريف الوطنية رقم <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{data.husband_cin}</span>، والمقيم بـ {data.husband_residence || 'العنوان المسجل بالبطاقة'}.</p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-2 h-2 rounded-full bg-[#1f3c88] mt-[8px]"></div>
                                        <p className="flex-1 text-lg font-medium"><span className="font-black ml-2 underline decoration-blue-200 underline-offset-4">الزوجة:</span> السيدة <span className="font-black text-blue-900">{data.wife_name}</span>، الحاملة لبطاقة التعريف الوطنية رقم <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{data.wife_cin}</span>، والمقيمة بـ {data.wife_residence || 'العنوان المسجل بالبطاقة'}.</p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-2 h-2 rounded-full bg-purple-600 mt-[8px]"></div>
                                        <p className="flex-1 text-lg font-medium"><span className="font-black ml-2 underline decoration-purple-200 underline-offset-4">الصداق الشرعي:</span> المتفق عليه هو مبلغ <span className="font-black text-purple-900">{data.dowry_amount || '...'}</span> درهم مغربي، {data.dowry_prepaid === 'yes' ? 'معجل النقد بالكامل' : 'متفق عليه بين الطرفين'}.</p>
                                    </div>
                                </div>
                            )}

                            {deed.category === 'property' && (
                                <div className="space-y-3">
                                    <p className="text-lg font-medium"><span className="font-black ml-2 underline decoration-blue-200 underline-offset-4">الأطراف المتعاقدة:</span> <span className="font-black text-slate-900">{data.parties_names}</span>، عريفين بـ <span className="font-mono">{data.parties_cin}</span>.</p>
                                    <p className="text-lg font-medium"><span className="font-black ml-2 underline decoration-blue-200 underline-offset-4">الموضوع العقاري:</span> تفويت العقار المسمى "<span className="font-black text-blue-900">{data.property_name || '... '}</span>" الكائن بـ {data.property_location || '... '}.</p>
                                    <p className="text-lg font-medium"><span className="font-black ml-2 underline decoration-blue-200 underline-offset-4">الم��احة الإجمالية:</span> تقدر بـ <span className="font-black bg-slate-100 px-2 rounded">{data.property_area_m2 || '... '}</span> متراً مربعاً وفق التصميم الطبوغرافي.</p>
                                    <p className="text-lg font-medium"><span className="font-black ml-2 underline decoration-blue-200 underline-offset-4">الثمن الإجمالي:</span> تم الاتفاق على مبلغ <span className="font-black text-green-700 bg-green-50 px-3 py-1 rounded-lg border border-green-100">{data.amount || '... '}</span> درهم مغربي.</p>
                                </div>
                            )}

                            {deed.category === 'divorce' && (
                                <div className="space-y-3">
                                    <p className="text-lg font-medium"><span className="font-black ml-2 underline decoration-red-200 underline-offset-4">المفارقون:</span> السيد <span className="font-black text-slate-900">{data.husband_name}</span> والسيدة <span className="font-black text-slate-900">{data.wife_name}</span>.</p>
                                    <p className="text-lg font-medium"><span className="font-black ml-2 underline decoration-red-200 underline-offset-4">نوع الطلاق:</span> <span className="font-black text-red-900">{data.divorce_type === 'agreement' ? 'طلاق بالاتفاق' : 'طلاق خلع'}</span>، مسجل تحت عدد <span className="font-mono">{data.court_order_number || '...'}</span>.</p>
                                    <p className="text-lg font-medium font-amiri leading-relaxed">{data.divorce_terms || 'التفاصيل والالتزامات المتبادلة مدرجة بملف النازلة.'}</p>
                                </div>
                            )}

                            {deed.category === 'inheritance' && (
                                <div className="space-y-3">
                                    <p className="text-lg font-medium"><span className="font-black ml-2 underline decoration-amber-200 underline-offset-4">الهالك:</span> المرحوم <span className="font-black text-slate-900">{data.deceased_name}</span>، المتوفى بتاريخ <span className="font-mono">{data.death_date}</span>.</p>
                                    <p className="text-lg font-medium"><span className="font-black ml-2 underline decoration-amber-200 underline-offset-4">الورثة المستحقون:</span> {data.heirs_list || '... '}.</p>
                                    <p className="text-lg font-medium"><span className="font-black ml-2 underline decoration-amber-200 underline-offset-4">الحصر الشرعي:</span> انحصر إرثه في ذراية شرعية ثابتة بمقتضى رسم الإراثة عدد {data.inheritance_doc_number}.</p>
                                </div>
                            )}

                            {deed.category === 'misc' && (
                                <div className="space-y-3">
                                    <h4 className="text-xl font-bold text-slate-800 border-b pb-2 mb-2">موضوع الإشهاد:</h4>
                                    <p className="text-lg font-medium font-amiri leading-relaxed">{data.content || '... '}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex flex-col gap-8">
                            <p className="text-[16px] italic leading-relaxed text-slate-800 border-r-4 border-blue-600 pr-6 bg-slate-50/50 p-4 rounded-xl shadow-inner font-medium font-amiri">
                                وإثباتاً لما ذكر، حرر هذا الرسم الذي يتضمن تلقي العدلين الموقعين للتصريحات والشهادات الواردة فيه، بعد التأكد التام من أهلية الأطراف وصحة هويتهم، وتم تدوينه أصولاً في السجلات العدلية المخص��ة بمحرر السجل العدلي بفاس.
                            </p>

                            {/* Official Signing Compartment */}
                            <div className="w-full flex justify-end">
                                <div className="w-[450px] bg-slate-50/30 p-6 rounded-[2rem] border border-slate-200/50 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 -mr-8 -mt-8 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
                                    <div className="grid grid-cols-2 gap-6 items-end relative z-10">
                                        <div className="text-center w-full">
                                            <p className="text-[11px] font-black text-[#1f3c88] mb-3 underline underline-offset-4 decoration-blue-200 lowercase">العدل المبرم الأول</p>
                                            <div className={`h-32 border-2 border-dashed rounded-2xl flex items-center justify-center transition-all duration-700 overflow-hidden bg-white/90 ${adoul1Signature ? 'border-blue-400 shadow-xl' : 'border-slate-300'}`}>
                                                {adoul1Signature ? (
                                                    <img src={adoul1Signature} alt="Adoul 1" className="h-full w-full object-contain p-2 hover:scale-110 transition-transform rotate-1" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                                        <PenTool className="w-6 h-6 opacity-30" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Auth Seal L1</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-center w-full">
                                            <p className="text-[11px] font-black text-[#1f3c88] mb-3 underline underline-offset-4 decoration-blue-200 lowercase">العدل المبرم الثاني</p>
                                            <div className={`h-32 border-2 border-dashed rounded-2xl flex items-center justify-center transition-all duration-700 overflow-hidden bg-white/90 ${adoul2Signature ? 'border-blue-400 shadow-xl' : 'border-slate-300'}`}>
                                                {adoul2Signature ? (
                                                    <img src={adoul2Signature} alt="Adoul 2" className="h-full w-full object-contain p-2 hover:scale-110 transition-transform -rotate-1" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                                        <PenTool className="w-6 h-6 opacity-30" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Auth Seal L2</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-center opacity-[0.10]">
                                        <Stamp className="w-12 h-12 text-slate-900 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 🔐 Secure Smart Footer (الشريط التوثيقي الذكي السيادي) */}
                    {settings.showSmartFooter && (
                        <div className="mt-8 border-t-2 border-slate-100 pt-6 font-sans">
                            <div className="grid grid-cols-3 gap-1 border-2 border-[#1f3c88]/10 rounded-2xl overflow-hidden shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)] bg-white text-right">
                                
                                {/* Unit 1: Inclusion Reference */}
                                <div className="p-4 border-l-2 border-slate-50 bg-[#1f3c88]/[0.02] flex flex-col gap-2 relative group transition-all duration-500 hover:bg-blue-50/50">
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#1f3c88]"></div>
                                    <h4 className="text-[10px] font-black text-[#1f3c88] flex items-center gap-2 border-b border-blue-100 pb-1 mb-1">
                                        <Hash className="w-3 h-3" /> مرجع التضمين المعتمد
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-1.5 text-[11px] font-bold text-slate-700">
                                        <span className="text-slate-400">سجل:</span> <span className="text-[#1f3c88]">{deed.fullData?.payload?.witnessesData?.notaryRegister || deed.inclusionBook}</span>
                                        <span className="text-slate-400">العدد:</span> <span className="text-[#1f3c88]">{deed.serialNumber}</span>
                                        <span className="text-slate-400">الصفحة:</span> <span className="text-[#1f3c88]">{deed.fullData?.payload?.witnessesData?.notaryPage || '---'}</span>
                                    </div>
                                    <div className="text-[9px] text-[#1f3c88]/60 font-black mt-1 flex items-center gap-2">
                                        <Globe className="w-2.5 h-2.5" /> توثيق {deed.fullData?.payload?.witnessesData?.notaryCity || 'فاس'}
                                    </div>
                                </div>

                                {/* Unit 2: Adouls Metadata */}
                                <div className="p-4 border-l-2 border-slate-50 bg-slate-50/30 flex flex-col gap-2 transition-all duration-500 hover:bg-slate-50">
                                    <h4 className="text-[10px] font-black text-slate-500 flex items-center gap-2 border-b border-slate-200 pb-1 mb-1">
                                        <UserCheck className="w-3 h-3" /> العدول المبرمون
                                    </h4>
                                    <div className="space-y-2">
                                        {[0, 1].map((idx) => (
                                            <div key={idx} className="flex flex-col gap-0">
                                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                                                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                    {deed.adouls[idx]}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-1 pt-1 border-t border-slate-100 flex items-center gap-2 text-[9px] text-slate-500 font-black">
                                        <Server className="w-2.5 h-2.5" /> البيانات الجهوية
                                    </div>
                                </div>

                                {/* Unit 3: Verification (The Sovereign Gateway) */}
                                <div className="p-4 bg-slate-950 text-white flex flex-col items-center justify-center gap-2 relative overflow-hidden group">
                                    {/* Pulse effect background */}
                                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>

                                    {showQR ? (
                                        <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-700 relative z-10">
                                            <div className="bg-white p-1 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform overflow-hidden">
                                                {qrDataUrl ? (
                                                    <img src={qrDataUrl} alt="Secure QR" className="w-16 h-16" />
                                                ) : (
                                                    <QrCode className="w-16 h-16 text-slate-950" />
                                                )}
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-[8px] font-mono tracking-widest text-[#6A1B9A] font-black">{secureHash}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-2 relative z-10">
                                            <ShieldCheck className="w-8 h-8 text-blue-500 mx-auto opacity-50" />
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Awaiting Seal</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 🚀 Secure Sovereign Controls (محطة الأمن السيادي) */}
                <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[3.5rem] border-2 border-slate-200 shadow-[0_30px_100px_rgba(0,0,0,0.1)] flex items-center justify-between gap-10 sticky bottom-10 z-50 max-w-7xl mx-auto ring-8 ring-white/50 print:hidden">
                    <div className="flex items-center gap-8">
                        <div className="w-16 h-16 bg-[#1f3c88] rounded-3xl flex items-center justify-center shadow-lg shadow-blue-900/20 rotate-3">
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">محطة الأمن السيادي الذكية</h3>
                            <p className="text-slate-500 text-sm font-bold">تأمين الوثيقة العدلية وفق بروتوكولات وزارة العدل المغربية</p>
                        </div>
                    </div>

                    <div className="flex gap-5 items-center">
                        {!isSecured ? (
                            <button 
                                onClick={handleSecureSeal}
                                className="flex items-center gap-4 bg-gradient-to-r from-[#1f3c88] to-[#2a4eab] text-white px-12 py-6 rounded-[2.5rem] font-black text-xl hover:shadow-[0_20px_40px_rgba(31,60,136,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 group"
                            >
                                <Lock className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                                <span>تفعيل الختم السيادي (Secure Seal)</span>
                            </button>
                        ) : (
                            <div className="flex gap-5 animate-in slide-in-from-right-4 duration-500">
                                <button 
                                    onClick={() => window.print()}
                                    className="flex items-center gap-4 bg-white border-4 border-slate-900 text-slate-900 px-10 py-6 rounded-[2.5rem] font-black text-xl hover:bg-slate-50 hover:shadow-xl transition-all active:scale-95"
                                >
                                    <Printer className="w-7 h-7" />
                                    <span>طباعة الرسم السيادي</span>
                                </button>
                                <button 
                                    onClick={() => handleSaveDeed(deed.id, 'sending')}
                                    className="flex items-center gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-12 py-6 rounded-[2.5rem] font-black text-xl hover:shadow-[0_20px_40px_rgba(16,185,129,0.3)] hover:scale-105 transition-all active:scale-95 group"
                                >
                                    <Send className="w-7 h-7 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                                    <span>الإرسال النهائي للمحكمة</span>
                                </button>
                            </div>
                        )}
                        <div className="w-[1px] h-12 bg-slate-200 mx-4"></div>
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <span className={`text-[10px] font-black mb-1 ${isSecured ? 'text-green-600' : 'text-slate-400'}`}>Seal</span>
                                <div className={`w-4 h-4 rounded-full border-2 ${isSecured ? 'bg-green-500 border-green-200 shadow-[0_0_10px_#10b981]' : 'bg-slate-200 border-white'}`}></div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black mb-1 text-slate-400">Sync</span>
                                <div className="w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const SettingsView = () => (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-left-4 duration-700 pb-20">
             
             {/* Part 1: Display & Default Sort */}
             <div className="bg-white border border-slate-200 p-10 rounded-[3rem] space-y-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#6A1B9A]/5 rounded-bl-[100px]"></div>
                <h4 className="flex items-center gap-3 justify-end text-blue-600 font-black text-lg">⚙️ إعدادات العرض المنطقي <SlidersHorizontal className="w-6 h-6 text-[#6A1B9A]" /></h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="space-y-4 text-right">
                        <p className="text-slate-500 text-sm font-black">عدد البطاقات في الصفحة</p>
                        <div className="flex gap-2 justify-end">
                            {[4, 6, 8].map(n => (
                                <button key={n} onClick={() => setSettings(s=>({...s, cardsPerPage: n}))} className={`px-4 py-2 rounded-xl font-bold border transition-all ${settings.cardsPerPage === n ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{n}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4 text-right">
                        <p className="text-slate-500 text-sm font-black">طريقة العرض الافتراضية</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setSettings(s=>({...s, displayMode: 'cards'}))} className={`p-4 rounded-xl border transition-all ${settings.displayMode === 'cards' ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}><LayoutGrid className="w-5 h-5" /></button>
                            <button onClick={() => setSettings(s=>({...s, displayMode: 'dense'}))} className={`p-4 rounded-xl border transition-all ${settings.displayMode === 'dense' ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}><Monitor className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <div className="space-y-4 text-right">
                        <p className="text-slate-500 text-sm font-black">الترتيب التلقائي</p>
                        <select className="bg-slate-50 text-slate-800 border border-slate-200 p-3 rounded-xl w-full text-right outline-none font-bold cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                            <option>حسب تاريخ الإدراج</option>
                            <option>حسب الرقم التسلسلي</option>
                        </select>
                    </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Visual Identity (🎨) */}
                 <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] space-y-8 shadow-sm">
                    <h4 className="flex items-center gap-3 justify-end text-blue-600 font-black text-sm">🎨 إعدادات الهوية البصرية <Palette className="w-5 h-5 text-[#6A1B9A]" /></h4>
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <input type="color" value={settings.primaryColor} onChange={e=>setSettings(s=>({...s, primaryColor: e.target.value}))} className="w-12 h-6 bg-transparent border-none p-0 cursor-pointer" />
                            <span className="text-slate-500 text-xs font-bold">اللون الرئيسي للمنصة</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            </div>
                            <span className="text-slate-500 text-xs font-bold">نمط ألوان التنبيهات</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <button onClick={()=>setSettings(s=>({...s, darkMode: !s.darkMode}))} className="w-12 h-6 bg-slate-200 rounded-full relative"><div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.darkMode ? 'right-1 bg-blue-600' : 'left-1 bg-slate-400'}`}></div></button>
                            <span className="text-slate-900 text-xs font-black italic">تفعيل الوضع الداكن (Dark Mode)</span>
                        </div>
                    </div>
                 </div>

                 {/* Signature (🖊) */}
                 <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] space-y-8 shadow-sm">
                    <h4 className="flex items-center gap-3 justify-end text-blue-600 font-black text-sm">🖊 إعدادات التوقيع الإلكتروني <PenTool className="w-5 h-5 text-[#6A1B9A]" /></h4>
                    <div className="space-y-4">
                         {[
                            { id: 'wacomEnabled', label: 'تفعيل الربط مع جهاز STU-540' },
                            { id: 'savePngCopy', label: 'حفظ نسخة PNG منفصلة للتوقيع' },
                            { id: 'comparePrevSig', label: 'تفعيل مقارنة التوقيع السابق' },
                            { id: 'clarityAlert', label: 'تنبيه عند ضعف وضوح التوقيع' },
                         ].map(item => (
                            <div key={item.id} className="flex items-center justify-between">
                                <button onClick={()=>setSettings(s=>({...s, [item.id]: !(s as any)[item.id]}))} className={`w-10 h-5 rounded-full relative flex items-center px-1 transition-colors ${ (settings as any)[item.id] ? 'bg-blue-600' : 'bg-slate-200'}`}><div className={`w-3 h-3 bg-white rounded-full transition-all ${ (settings as any)[item.id] ? 'translate-x-5' : 'translate-x-0'}`}></div></button>
                                <span className="text-slate-500 text-xs font-bold">{item.label}</span>
                            </div>
                         ))}
                    </div>
                 </div>

                 {/* Security (🔐) */}
                 <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] space-y-8 shadow-sm">
                    <h4 className="flex items-center gap-3 justify-end text-rose-600 font-black text-sm">🔐 إعدادات الحماية والأمان <ShieldAlert className="w-5 h-5 text-[#6A1B9A]" /></h4>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
                            <Lock className="w-4 h-4 text-rose-500" />
                            <span className="text-rose-600 text-xs font-black">منع الحذف النهائي للرسوم</span>
                        </div>
                        <div className="flex items-center justify-between">
                             <button className="w-10 h-5 bg-slate-200 rounded-full"></button>
                             <span className="text-slate-500 text-xs font-bold italic">المصادقة الثنائية (2FA)</span>
                        </div>
                        <button className="w-full py-3 bg-slate-50 rounded-xl text-xs font-black text-slate-600 flex items-center justify-between px-4 hover:bg-slate-100 transition-all border border-slate-200">
                             <ArrowRight className="w-3 h-3" /> مراجعة سجل الحركات (Log System)
                        </button>
                    </div>
                 </div>

                 {/* Alerts (⏳) */}
                 <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] space-y-8 shadow-sm">
                    <h4 className="flex items-center gap-3 justify-end text-amber-600 font-black text-sm">⏳ إعدادات التنبيهات <Bell className="w-5 h-5 text-[#6A1B9A]" /></h4>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                             <input type="number" value={settings.delayThreshold} onChange={e=>setSettings(s=>({...s, delayThreshold: parseInt(e.target.value)}))} className="w-12 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                             <span className="text-slate-500 text-xs font-bold">تنبيه التأخير (أيام)</span>
                        </div>
                        <div className="flex items-center justify-between">
                             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                             <span className="text-slate-400 text-xs font-bold italic">تنبيه عند وجود رسم غير مخاطب</span>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                             <FileWarning className="w-4 h-4 text-amber-600" />
                             <span className="text-amber-600 text-[10px] font-black">تنبيه نقص المرفقات الأساسية</span>
                        </div>
                    </div>
                 </div>
             </div>
             
             <div className="flex justify-center pt-8">
                 <button className="px-20 py-6 bg-blue-600 text-white rounded-[3rem] font-black text-2xl shadow-2xl shadow-blue-600/30 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-6">
                     <Key className="w-8 h-8 opacity-50" />
                     حفظ كافة الإعدادات والسياسات
                 </button>
             </div>
        </div>
    );

    // --- Main Layout Render ---
    return (
        <div className={`min-h-screen ${settings.darkMode ? 'bg-[#f8fafc]' : 'bg-slate-50'} text-slate-800 font-amiri p-4 sm:p-8 overflow-x-hidden relative`}>
            {/* Background decorative elements - Softened for better contrast */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-[#6A1B9A]/5 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto space-y-12">
                
                {/* 1. LAYER 1: GLOBAL HEADER & NAV */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 pb-8 border-b-2 border-blue-100 relative">
                    <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
                    <div className="text-center md:text-right space-y-2">
                        <div className="flex items-center justify-center md:justify-end gap-3 text-blue-600 font-black text-[12px] uppercase tracking-[0.4em]">
                            <Server className="w-5 h-5" />
                            Secure Signing Vault
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter drop-shadow-sm">
                             رواق التوقيع <span className="text-blue-600">العدلي المتطور</span>
                        </h1>
                        <p className="text-slate-500 font-black flex items-center justify-center md:justify-end gap-2 text-sm italic">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> نظام الأرشفة الذكية والمصادقة المزدوجة
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {activeLayer !== 'dashboard' && (
                            <button 
                                onClick={() => toggleLayer('dashboard')} 
                                className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] flex items-center gap-3 shadow-lg shadow-blue-600/20 transition-all font-black text-sm"
                            >
                                <LayoutGrid className="w-5 h-5 text-white/70" /> المركز الرئيسي
                            </button>
                        )}
                        <button 
                            onClick={() => toggleLayer('settings')}
                            className={`p-4 rounded-[1.5rem] transition-all border ${activeLayer === 'settings' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white hover:bg-slate-50 text-[#6A1B9A] border-slate-200'}`}
                        >
                            <Settings className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* 2. LAYER 2: CONTENT AREA */}
                <main className="min-h-[600px]">
                    {activeLayer === 'dashboard' && <DashboardView />}
                    {activeLayer === 'archive' && <ArchiveView />}
                    {activeLayer === 'settings' && <SettingsView />}
                    
                    {activeLayer === 'signing' && (
                        <div className="grid grid-cols-12 gap-8 animate-in fade-in zoom-in duration-700">
                             {/* Signing logic remains as high-fidelity dual signature slots */}
                             <div className="col-span-12 lg:col-span-8 space-y-6">
                                <div className="bg-white rounded-[3rem] border border-slate-200 p-4 relative overflow-visible shadow-2xl min-h-[850px] flex flex-col items-center">
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-[#6A1B9A] to-blue-600 z-10"></div>
                                    
                                    {selectedDeed ? (
                                        <div className="w-full h-full overflow-y-auto no-scrollbar p-4 md:p-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                                            {/* 
                                                CRITICAL: Prioritize NotaryDocumentViewer for its rich features (Signatures, QR, Moroccan Theme)
                                                even if a direct selectedDocument exists. It will internalize the document for rendering.
                                            */}
                                            <div className="w-full space-y-6">
                                                <NotaryDocumentViewer deed={selectedDeed} selectedDocument={selectedDocument} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 opacity-40">
                                            {oneDeedQuery.isLoading ? (
                                                <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <FileCheck className="w-56 h-56 mx-auto text-slate-300" />
                                            )}
                                            <div className="space-y-3">
                                                <h3 className="text-4xl font-black text-slate-400 italic">
                                                    {oneDeedQuery.isLoading ? 'جاري تحميل المستند...' : 'معاينة الرسم المعتمد نهائياً'}
                                                </h3>
                                                <p className="text-xl text-slate-500 font-bold">
                                                    {oneDeedQuery.isLoading ? 'يرجى الانتظار بينما نقوم بجلب البيانات من الخزنة الرقمية' : 'يرجى اختيار رسم من الأرشيف للمعالجة'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-12 flex gap-4 backdrop-blur-xl bg-white/80 p-4 rounded-[2rem] border border-slate-200 shadow-2xl">
                                        <button className="p-5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition-all shadow-sm"><Printer className="w-6 h-6" /></button>
                                        <button className="p-5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition-all shadow-sm"><Download className="w-6 h-6" /></button>
                                        <div className="w-px bg-slate-200 mx-2"></div>
                                        <button onClick={() => setShowDetailPanel(true)} className="p-5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white transition-all shadow-xl shadow-blue-500/20"><SlidersHorizontal className="w-6 h-6" /></button>
                                    </div>
                                </div>
                             </div>

                             <div className="col-span-12 lg:col-span-4 space-y-6">
                                <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-[2.5rem] p-8 shadow-sm text-right">
                                    <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-6">اكتمال نصاب التوقع الرقمي</h4>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-2xl font-black text-slate-900">{(signatureStatus.adoul1 ? 1 : 0) + (signatureStatus.adoul2 ? 1 : 0)} / 2</span>
                                        </div>
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-1">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 ease-out" 
                                            style={{ width: `${(signatureStatus.adoul1 && signatureStatus.adoul2) ? 100 : (signatureStatus.adoul1 || signatureStatus.adoul2) ? 50 : 0}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Slot 1 */}
                                <div className={`p-8 rounded-[1.5rem] border-t-2 border-b-2 transition-all duration-700 overflow-hidden relative ${signatureStatus.adoul1 ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                                    <div className={`absolute top-0 left-0 right-0 h-1  ${signatureStatus.adoul1 ? 'bg-gradient-to-r from-[#005f38] via-[#008751] to-[#005f38]' : 'bg-gradient-to-r from-[#003d80] via-[#0056b3] to-[#003d80]'}`}></div>
                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div className="space-y-1 text-right">
                                            <h3 className="text-2xl font-black text-white tracking-tight">العدل الأول</h3>
                                            <p className="text-slate-400 text-sm font-bold">بصمة المصادقة الزرقاء</p>
                                        </div>
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ring-2 ring-[#d4af37]/30 ${signatureStatus.adoul1 ? 'bg-[#008751] text-white shadow-xl rotate-12' : 'bg-[#0056b3] text-white'}`}>
                                            <UserCheck className="w-7 h-7" />
                                        </div>
                                    </div>
                                    {signatureStatus.adoul1 ? (
                                        <div className="space-y-4 animate-in fade-in zoom-in duration-500 text-center">
                                            <div className="py-6 border-b border-t border-[#d4af37]/30 bg-white/5 relative">
                                                <div className="font-caveat text-5xl text-emerald-400 -rotate-2 select-none">Confirmed</div>
                                            </div>
                                            <div className="text-[#008751] text-sm font-black flex items-center justify-center gap-2">
                                                <CheckCircle className="w-4 h-4" /> تـم التوقيع بالأخضر المعتمد
                                            </div>
                                            {adoul1BioHash && (
                                                <div className="text-[10px] text-slate-400 font-bold">
                                                    Biometric Hash (SHA-256):
                                                    <span className="font-mono text-slate-300 block mt-1 break-all">{adoul1BioHash}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleSign('adoul1')}
                                            className="w-full py-6 bg-gradient-to-r from-[#003d80] to-[#0056b3] border border-[#d4af37]/30 rounded-[1rem] text-white font-black text-xl flex items-center justify-center gap-4 transition-all hover:brightness-110 active:scale-95 group shadow-lg"
                                        >
                                            <PenTool className="w-7 h-7 text-white" />
                                            بصمة العدل الأول
                                        </button>
                                    )}
                                </div>

                                {/* Slot 2 */}
                                <div className={`p-8 rounded-[1.5rem] border-t-2 border-b-2 transition-all duration-700 overflow-hidden relative ${signatureStatus.adoul2 ? 'bg-[#005f38]/10 border-[#008751]/50' : 'bg-[#1a1a1a]/10 border-white/10'}`}>
                                    {signatureStatus.adoul2 && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#005f38] via-[#008751] to-[#005f38]"></div>}
                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div className="space-y-1 text-right">
                                            <h3 className="text-2xl font-black text-white tracking-tight">العدل الثاني</h3>
                                            <p className="text-slate-400 text-sm font-bold">بصمة التأكيد الخضراء</p>
                                        </div>
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ring-2 ring-[#d4af37]/30 ${signatureStatus.adoul2 ? 'bg-[#008751] text-white shadow-xl -rotate-12' : 'bg-slate-800 text-slate-500'}`}>
                                            <UserCheck className="w-7 h-7" />
                                        </div>
                                    </div>
                                    {signatureStatus.adoul2 ? (
                                        <div className="space-y-4 animate-in fade-in zoom-in duration-500 text-center">
                                            <div className="py-6 border-b border-t border-[#d4af37]/30 bg-white/5 relative">
                                                <div className="font-caveat text-4xl text-emerald-400 rotate-1 select-none underline decoration-double">Verified</div>
                                            </div>
                                            <div className="text-[#008751] text-sm font-black flex items-center justify-center gap-2">
                                                <CheckCircle className="w-4 h-4" /> تـم التلقي بنـجاح
                                            </div>
                                            {adoul2BioHash && (
                                                <div className="text-[10px] text-slate-400 font-bold">
                                                    Biometric Hash (SHA-256):
                                                    <span className="font-mono text-slate-300 block mt-1 break-all">{adoul2BioHash}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button 
                                            disabled={!signatureStatus.adoul1}
                                            onClick={() => handleSign('adoul2')}
                                            className={`w-full py-6 rounded-[1rem] font-black text-xl flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 group shadow-lg ${!signatureStatus.adoul1 ? 'bg-slate-900/50 text-slate-600 cursor-not-allowed border-white/5' : 'bg-gradient-to-r from-[#005f38] to-[#008751] text-white border border-[#d4af37]/30'}`}
                                        >
                                            <PenTool className="w-7 h-7 text-white" />
                                            بصمة العدل الثاني
                                        </button>
                                    )}
                                </div>

                                <div className="pt-8 text-right">
                                    <button 
                                        disabled={!signatureStatus.adoul1 || !signatureStatus.adoul2}
                                        className={`w-full py-8 rounded-[1.5rem] font-black text-2xl flex items-center justify-center gap-5 transition-all shadow-2xl ${signatureStatus.adoul1 && signatureStatus.adoul2 ? 'bg-gradient-to-r from-[#b8860b] via-[#d4af37] to-[#b8860b] text-[#1e1e1e] hover:brightness-110' : 'bg-slate-900 border border-white/5 text-slate-700 cursor-not-allowed'}`}
                                    >
                                        <Lock className="w-8 h-8" />
                                        إغلاق الرسم وحفظه في الأرشيف
                                    </button>
                                    <p className="mt-4 text-[10px] text-center text-[#d4af37] font-black uppercase tracking-widest">Digital Notary Security - V2.1</p>
                                </div>
                             </div>
                        </div>
                    )}
                </main>

                {/* Status Bar Footer (Floating) */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-10 py-4 bg-slate-950/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-50 flex items-center gap-8">
                     <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Main Node: Online</span>
                      </div>
                      <div className="w-px h-6 bg-white/10"></div>
                      <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${stuStatus === 'ERROR' ? 'bg-rose-500' : stuStatus === 'SEARCHING' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">STU-540: {stuStatus}</span>
                      </div>
                      <div className="w-px h-6 bg-white/10"></div>
                      <div className="text-[11px] font-black text-slate-500">v2.1.2.6-PRO</div>
                </div>
            </div>

            {/* Detail Slide Panel Overlay */}
            <DetailSlidePanel />

            {/* Feature 11: STU-540 Hardware Interface Modal */}
            {isCapturing && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-[#1e1e1e] border-4 border-slate-700 w-full max-w-4xl rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(0,86,179,0.3)] flex flex-col md:flex-row h-[500px]">
                        
                        {/* Hardware Device Representation (Left Side) */}
                        <div className="w-full md:w-1/3 bg-slate-900 p-8 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-l border-slate-700">
                            <Monitor className={`w-24 h-24 mb-6 transition-all duration-1000 ${stuStatus === 'SEARCHING' ? 'text-blue-500 animate-pulse' : (stuStatus === 'CONNECTED' || stuStatus === 'CAPTURING' || stuStatus === 'SAVED') ? 'text-emerald-500 scale-110' : stuStatus === 'ERROR' ? 'text-rose-500' : 'text-slate-600'}`} />
                            <h3 className="text-xl font-black text-white mb-2">Wacom STU-540</h3>
                            <div className="flex items-center gap-2 mb-8">
                                <div className={`w-2 h-2 rounded-full ${stuStatus === 'SEARCHING' ? 'bg-amber-500 animate-ping' : stuStatus === 'ERROR' ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {stuStatus}
                                </span>
                            </div>
                            {stuStatus !== 'ERROR' ? (
                                <p className="text-xs text-slate-500 font-bold leading-relaxed px-4">
                                    الرقم التسلسلي:{' '}
                                    <span className="text-slate-300 font-mono">{connectedDeviceInfo?.serialNumber || '---'}</span>
                                    <br />
                                    Vendor/Product:{' '}
                                    <span className="text-slate-300 font-mono">
                                        {connectedDeviceInfo?.idVendor?.toString(16) || '---'} / {connectedDeviceInfo?.idProduct?.toString(16) || '---'}
                                    </span>
                                    <br />جودة الالتقاط: {settings.sigQuality.toUpperCase()}
                                </p>
                            ) : (
                                <p className="text-[10px] text-rose-400 font-black bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
                                    {hardwareError || 'خطأ في التعرف على الجهاز'}
                                </p>
                            )}
                        </div>

                        {/* Capture Engine (Right Side) */}
                        <div className="flex-1 bg-black/40 p-10 flex flex-col relative">
                            <button 
                                onClick={cancelCapture}
                                className="absolute top-6 left-6 p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {(stuStatus === 'CONNECTED' || stuStatus === 'CAPTURING') && (
                                <div className="absolute bottom-6 left-6 flex items-center gap-3 z-10">
                                    <button
                                        onClick={async () => {
                                            await clearTabletScreen(tabletRef.current);
                                            clearCanvas();
                                            penDataRef.current = [];
                                        }}
                                        className="px-6 py-2 bg-slate-800 text-white rounded-lg font-black hover:bg-slate-700 transition-all"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={confirmSTUSignature}
                                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-black hover:bg-emerald-500 transition-all"
                                    >
                                        OK
                                    </button>
                                </div>
                            )}

                            <div className="text-right flex-1 flex flex-col">
                                <span className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">Signature Capture Engine</span>
                                <h4 className="text-3xl font-black text-white mt-2 mb-10">التقاط بصمة العدل {activeAdoulForSig === 'adoul1' ? 'الأول' : 'الثاني'}</h4>

                                 <div className="flex-1 bg-white/5 border-2 border-dashed border-slate-700 rounded-3xl flex items-center justify-center relative group overflow-hidden">
                                      {stuStatus === 'SEARCHING' && (
                                          <div className="flex flex-col items-center gap-4 text-slate-500 animate-pulse">
                                              <Server className="w-12 h-12" />
                                              <p className="font-black">SEARCHING — جاري البحث عن جهاز STU-540...</p>
                                              {probedPort && (
                                                 <p className="text-[10px] uppercase font-black tracking-widest text-blue-500">Checking Port: {probedPort}</p>
                                              )}
                                          </div>
                                      )}

                                      {stuStatus === 'ERROR' && (
                                     <div className="flex flex-col items-center gap-6 text-center p-10 animate-in fade-in zoom-in duration-300">
                                         <AlertTriangle className="w-20 h-20 text-rose-500" />
                                         <div className="space-y-2">
                                             <p className="text-white text-xl font-black">فشل الاتصال بجهاز STU-540</p>
                                             <p className="text-slate-500 text-sm font-bold max-w-xs">{hardwareError}</p>
                                         </div>
                                         <button 
                                             onClick={() => activeAdoulForSig && searchForSTUDevice(activeAdoulForSig)}
                                             className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black hover:bg-white/10 transition-all flex items-center gap-3"
                                         >
                                             <Monitor className="w-5 h-5" /> إعادة محاولة البحث
                                         </button>
                                     </div>
                                 )}

                                {(stuStatus === 'CONNECTED' || stuStatus === 'CAPTURING') && (
                                     <div className="w-full h-full flex flex-col items-center justify-center relative">
                                         <div className="mb-4 text-[11px] font-black text-[#d4af37]">
                                             {stuStatus === 'CONNECTED' ? 'CONNECTED — تم الاتصال بالجهاز، ابدأ التوقيع الآن' : 'CAPTURING — يتم الآن التقاط التوقيع من الجهاز'}
                                         </div>
                                         <canvas 
                                             ref={sigCanvasRef}
                                             width={1080} 
                                             height={648}
                                             style={{ width: '100%', maxWidth: '800px', background: 'white' }}
                                             className="rounded-2xl shadow-2xl border-4 border-slate-300 aspect-[5/3]"
                                         />
                                         <p className="absolute bottom-4 text-[#d4af37] text-xs font-black italic">التوقيع جاري الآن على جهاز STU-540...</p>
                                     </div>
                                 )}

                                     {stuStatus === 'SAVED' && (
                                          <div className="text-emerald-400 flex flex-col items-center gap-4 animate-in zoom-in duration-500 p-8 text-center">
                                              <CheckCircle className="w-16 h-16" />
                                              <p className="text-2xl font-black">SAVED — تـم التقاط التوقيع بنـجاح</p>
                                              <div className="text-[11px] text-slate-400 font-bold max-w-xl">
                                                  Biometric Hash (SHA-256):
                                                  <span className="font-mono text-slate-200 block mt-2 break-all">
                                                      {(activeAdoulForSig === 'adoul1' ? adoul1BioHash : adoul2BioHash) || '---'}
                                                  </span>
                                              </div>
                                          </div>
                                      )}
                                 </div>

                                <div className="mt-8 flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="flex gap-2">
                                        <div className="px-3 py-1 bg-blue-500 text-[10px] font-black rounded text-white">{stuStatus}</div>
                                        <div className="px-3 py-1 bg-slate-800 text-[10px] font-black rounded text-slate-500">SHA-256</div>
                                    </div>

                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Biometric Encryption: Active (SHA-256)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Final Success Celebration Modal */}
            {showSuccess && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-8 bg-[#020617]/95 backdrop-blur-3xl animate-in fade-in duration-700">
                    <div className="max-w-2xl bg-white/5 border border-white/10 p-16 rounded-[4rem] text-center space-y-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px]"></div>
                        <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 animate-bounce">
                            <ShieldCheck className="w-16 h-16 text-white" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-5xl font-black text-white italic">تم التوقيع والأرشفة بنجاح</h2>
                            <p className="text-2xl text-slate-400 leading-relaxed">تم ربط نسخة ما بعد الخطاب وحفظ سجل الحركات في قاعدة البيانات الرئيسية.</p>
                        </div>
                        <button 
                            onClick={() => { setShowSuccess(false); toggleLayer('archive'); }}
                            className="px-16 py-6 bg-emerald-600 hover:bg-emerald-50 text-white hover:text-emerald-900 rounded-full font-black text-2xl transition-all shadow-xl shadow-emerald-500/20"
                        >
                            العودة إلى السجل العام
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
