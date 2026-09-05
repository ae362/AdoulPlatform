import React, { useState, useMemo, useEffect } from 'react';
import { Combobox, Dialog, Transition } from '@headlessui/react';
import DOMPurify from 'dompurify';
import {
  Send,
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Flame,
  MessageSquare,
  Archive,
  Bell,
  BarChart3,
  Search,
  Download,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileCheck,
  ArrowRight,
  Filter,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  FolderOpen,
  Check,
  Layers,
  FileSpreadsheet,
  AlertOctagon,
  Share2,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import { renderAsync } from 'docx-preview';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { useMessagingNotifications } from '../contexts/MessagingNotificationsContext';
import { RichTextComposer } from '../components/RichTextComposer';

type MessagingMode = 'judge' | 'notary';

type MainTab = 'messages' | 'copy_requests';

type CopyRequestCategory =
  | 'inbox'
  | 'urgent'
  | 'processing'
  | 'needs_completion'
  | 'completed'
  | 'archived'
  | 'alerts'
  | 'stats';

export interface CopyRequestDossier {
  id: string;
  requestNumber: string;
  requester: {
    firstName: string;
    lastName: string;
    cin: string;
    phone: string;
    email: string;
    address: string;
    identityType: string;
  };
  capacity: {
    type: string;
    agencyRef?: string;
    agencyDocName?: string;
    inheritanceRef?: string;
    inheritanceDocName?: string;
    thirdPartyDocType?: string;
    thirdPartyJustification?: string;
    proofs?: Array<{ id: string; title: string; details: string; docFile?: string }>;
  };
  deeds: Array<{
    id: string;
    title: string;
    category: string;
    type: string;
    inclusionBook: string;
    number: string;
    letter: string;
    page: string;
    count: string;
    date: string;
    court: string;
    firstNotary: string;
    secondNotary?: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    format: string;
    size: string;
    quality: 'high' | 'medium' | 'low';
    url: string;
  }>;
  purpose: {
    reason: string;
    description?: string;
    hasSupportingDoc: boolean;
  };
  status: string;
  isUrgent?: boolean;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    sender: 'notary' | 'applicant' | 'system';
    senderName: string;
    channel: 'inbox' | 'whatsapp' | 'system';
    subject?: string;
    body: string;
    timestamp: string;
  }>;
  timeline: Array<{
    id: string;
    timestamp: string;
    action: string;
    actor: string;
    notes?: string;
  }>;
  unableReason?: string;
  unableGuidance?: string;
  deliveryOption?: string;
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ar-MA', {
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

function stripHtml(html: string) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function looksLikeHtml(input: string) {
  return /<\/?[a-z][\s\S]*>/i.test(input);
}

function renderMessageBody(body: string) {
  if (!body) return null;
  if (!looksLikeHtml(body)) return <div className="whitespace-pre-wrap leading-relaxed">{body}</div>;

  const sanitized = DOMPurify.sanitize(body, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 's', 'span', 'p', 'br', 'div', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a'],
    ALLOWED_ATTR: ['style', 'href', 'target', 'rel'],
  });

  return (
    <div
      className="[&_*]:max-w-full [&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

type InternalRecipient =
  | {
      kind: 'adoul';
      id: string;
      title: string;
      subtitle: string;
      notaryUserId: string;
      notaryPartnerId: string;
      email: string;
    }
  | {
      kind: 'judge';
      id: string;
      title: string;
      subtitle: string;
      participantUserId: string;
      email: string;
    };

function isProbablyEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function MessagingInbox({ mode }: { mode: MessagingMode }) {
  const { sessionToken, user } = useAuth();
  const token = sessionToken || '';
  const { markCopyRequestSeen } = useMessagingNotifications();

  // Main Active View: Direct Messages vs Copy Requests Management
  const [mainTab, setMainTab] = useState<MainTab>('messages');

  // Search
  const [search, setSearch] = useState('');

  // -------------------------------------------------------------
  // 1. BACKEND MESSAGING THREADS (Original Functionality Restored)
  // -------------------------------------------------------------
  const threadsQuery = trpc.messaging.listThreads.useQuery(
    { sessionToken: token },
    {
      enabled: !!sessionToken,
      staleTime: 20_000,
      refetchInterval: 30000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const judgeTargetsQuery = trpc.messaging.listJudges.useQuery(
    { sessionToken: token },
    { enabled: !!sessionToken && mode === 'notary', retry: false }
  );

  const adoulTargetsQuery = trpc.messaging.listAvailableAdoul.useQuery(
    { sessionToken: token },
    {
      enabled: !!sessionToken && mode === 'judge',
      staleTime: 30_000,
      retry: false,
      refetchInterval: 45000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
    }
  );

  const createThreadMutation = trpc.messaging.createOrGetThread.useMutation();
  const sendMessageMutation = trpc.messaging.sendMessage.useMutation();
  const sendEmailMutation = trpc.messaging.sendEmail.useMutation();
const updateCopyRequestMutation = trpc.copyRequests.updateStatus.useMutation();
  const threads = threadsQuery.data ?? [];
  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const other = `${t.otherUser.fullName} ${t.otherUser.email}`.toLowerCase();
      const partner = (t.partner?.partnerName ?? '').toLowerCase();
      return other.includes(q) || partner.includes(q);
    });
  }, [threads, search]);

  useEffect(() => {
    if (!selectedThreadId && threads.length) setSelectedThreadId(threads[0].id);
  }, [selectedThreadId, threads]);

  const messagesQuery = trpc.messaging.getThreadMessages.useQuery(
    { sessionToken: token, threadId: selectedThreadId || '' },
    {
      enabled: !!sessionToken && !!selectedThreadId,
      staleTime: 10_000,
      refetchInterval: 12000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: false,
      onSuccess: () => {
        void threadsQuery.refetch();
      },
    }
  );

  const selectedThread = useMemo(() => threads.find((t) => t.id === selectedThreadId) ?? null, [threads, selectedThreadId]);
  const threadMessagesList = messagesQuery.data?.messages ?? [];
  const [replyHtml, setReplyHtml] = useState('');

  // New Message Composer Dialog State
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [composeChannel, setComposeChannel] = useState<'internal' | 'email'>('internal');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<InternalRecipient | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [newMessageHtml, setNewMessageHtml] = useState('');
  const [sendEmailCopy, setSendEmailCopy] = useState(false);

  const internalRecipients = useMemo<InternalRecipient[]>(() => {
    if (mode === 'judge') {
      return (adoulTargetsQuery.data ?? []).map((t) => ({
        kind: 'adoul' as const,
        id: t.partnerId,
        title: `${t.notaryName} — ${t.partnerName} (${t.positionOrder})`,
        subtitle: `${t.notaryEmail} • ${t.courtName}${t.primaryCourt ? ` • ${t.primaryCourt}` : ''}`,
        notaryUserId: t.notaryUserId,
        notaryPartnerId: t.partnerId,
        email: t.notaryEmail,
      }));
    }

    return (judgeTargetsQuery.data ?? []).map((j) => ({
      kind: 'judge' as const,
      id: j.id,
      title: j.fullName,
      subtitle: j.email,
      participantUserId: j.id,
      email: j.email,
    }));
  }, [mode, adoulTargetsQuery.data, judgeTargetsQuery.data]);

  const filteredRecipients = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    if (!q) return internalRecipients;
    return internalRecipients.filter((r) => `${r.title} ${r.subtitle}`.toLowerCase().includes(q));
  }, [internalRecipients, recipientQuery]);

  const openNewMessage = () => {
    setComposeChannel('internal');
    setRecipientQuery('');
    setSelectedRecipient(null);
    setRecipientEmail('');
    setNewMessageHtml('');
    setSendEmailCopy(false);
    setIsNewMessageOpen(true);
  };

  const sendNewMessage = async () => {
    const messageText = stripHtml(newMessageHtml);
    if (!messageText) return;

    if (composeChannel === 'email') {
      if (!sessionToken) {
        alert('المرجو تسجيل الدخول أولاً.');
        return;
      }
      const email = recipientEmail.trim();
      if (!isProbablyEmail(email)) return;
      try {
        await sendEmailMutation.mutateAsync({
          sessionToken: token,
          to: email,
          subject: 'New Message',
          body: newMessageHtml,
        });
      } catch (e: any) {
        alert(e?.message || 'تعذّر إرسال البريد الإلكتروني.');
        return;
      }
      setIsNewMessageOpen(false);
      return;
    }

    const canCreate = !!sessionToken && !createThreadMutation.isPending;
    if (!selectedRecipient || !canCreate) return;

    if (mode === 'judge') {
      if (selectedRecipient.kind !== 'adoul') return;
      const res = await createThreadMutation.mutateAsync({
        sessionToken: token,
        participantUserId: selectedRecipient.notaryUserId,
        notaryPartnerId: selectedRecipient.notaryPartnerId,
      });
      await sendMessageMutation.mutateAsync({ sessionToken: token, threadId: res.threadId, body: newMessageHtml });
      setSelectedThreadId(res.threadId);
      await threadsQuery.refetch();
      setIsNewMessageOpen(false);
      if (sendEmailCopy && selectedRecipient.email) {
        try {
          await sendEmailMutation.mutateAsync({
            sessionToken: token,
            to: selectedRecipient.email,
            subject: 'New Message',
            body: newMessageHtml,
          });
        } catch {
          // ignore email copy failure
        }
      }
      return;
    }

    if (selectedRecipient.kind !== 'judge') return;
    const res = await createThreadMutation.mutateAsync({
      sessionToken: token,
      participantUserId: selectedRecipient.participantUserId,
    });
    await sendMessageMutation.mutateAsync({ sessionToken: token, threadId: res.threadId, body: newMessageHtml });
    setSelectedThreadId(res.threadId);
    await threadsQuery.refetch();
    setIsNewMessageOpen(false);
    if (sendEmailCopy && selectedRecipient.email) {
      try {
        await sendEmailMutation.mutateAsync({
          sessionToken: token,
          to: selectedRecipient.email,
          subject: 'New Message',
          body: newMessageHtml,
        });
      } catch {
        // ignore email copy failure
      }
    }
  };

  const sendReply = async () => {
    if (!selectedThreadId || !stripHtml(replyHtml) || sendMessageMutation.isPending) return;
    await sendMessageMutation.mutateAsync({ sessionToken: token, threadId: selectedThreadId, body: replyHtml });
    setReplyHtml('');
    await Promise.all([messagesQuery.refetch(), threadsQuery.refetch()]);
  };

  const disableNewMessageSend =
    !stripHtml(newMessageHtml) ||
    sendMessageMutation.isPending ||
    createThreadMutation.isPending ||
    sendEmailMutation.isPending ||
    (composeChannel === 'internal'
      ? !selectedRecipient || !sessionToken
      : !isProbablyEmail(recipientEmail) || !sessionToken);

  // -------------------------------------------------------------
  // 2. BACKEND COPY REQUESTS (Real Supabase/tRPC Linkage)
  // -------------------------------------------------------------
  const copyRequestsQuery = trpc.copyRequests.list.useQuery(undefined, {
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const [copyCategory, setCopyCategory] = useState<CopyRequestCategory>('inbox');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<
    'applicant' | 'capacity' | 'deed' | 'smart_helper' | 'documents' | 'purpose' | 'messages' | 'timeline'
  >('applicant');

  const [showFullCin, setShowFullCin] = useState<Record<string, boolean>>({});
  const [isCommunicateModalOpen, setIsCommunicateModalOpen] = useState(false);
  const [commChannel, setCommChannel] = useState<'inbox' | 'whatsapp'>('inbox');
  const [commSubject, setCommSubject] = useState('طلب استكمال وثيقة');
  const [commBody, setCommBody] = useState('');
  const [isUnableModalOpen, setIsUnableModalOpen] = useState(false);
  const [unableReason, setUnableReason] = useState('');
  const [unableGuidance, setUnableGuidance] = useState('');
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState<'digital_download' | 'office_pickup' | 'court_transfer'>('digital_download');
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);

async function generateOfficialDocxBlob(fileName: string, title?: string, details?: string): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'المملكة المغربية — الهيئة الوطنية للعدول',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
          }),
          new Paragraph({
            text: 'منظومة التوثيق العدلي الإلكترونية',
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
          }),
          new Paragraph({
            text: '────────────────────────────────────────────────',
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `وثيقة رسمية مؤمنة: ${fileName}`,
            heading: HeadingLevel.HEADING_3,
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
          new Paragraph({
            text: `المرجع: DOC-${Date.now().toString(36).toUpperCase()}`,
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
          new Paragraph({
            text: `تاريخ التحميل: ${new Date().toLocaleDateString('ar-MA')}`,
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
          new Paragraph({
            text: details ? `بيانات السند: ${details}` : 'تم تسجيل وحفظ هذا المستند بنجاح في سجلات المنصة الرقمية.',
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function DocxRenderer({ fileUrl, fileName, details }: { fileUrl?: string; fileName: string; details?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function loadDocx() {
      setLoading(true);
      try {
        let blob: Blob;
        if (fileUrl && fileUrl.startsWith('data:')) {
          const res = await fetch(fileUrl);
          blob = await res.blob();
        } else if (fileUrl && (fileUrl.startsWith('http') || fileUrl.startsWith('/'))) {
          const res = await fetch(fileUrl);
          blob = await res.blob();
        } else {
          blob = await generateOfficialDocxBlob(fileName, 'مستند مرفق', details);
        }

        if (containerRef.current && !cancelled) {
          containerRef.current.innerHTML = '';
          await renderAsync(blob, containerRef.current, undefined, {
            className: 'docx-preview-content',
            inWrapper: false,
          });
        }
      } catch (err) {
        console.error('Failed to preview docx:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDocx();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, fileName, details]);

  return (
    <div className="w-full flex flex-col items-center bg-slate-100/70 rounded-2xl p-4 overflow-auto max-h-[62vh] border border-slate-200">
      {loading && (
        <div className="py-12 flex flex-col items-center gap-3 text-slate-500 font-bold text-xs">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري معالجة وعرض صفحات مستند Microsoft Word...</span>
        </div>
      )}
      <div ref={containerRef} className={`w-full bg-white shadow-sm rounded-xl p-6 text-right ${loading ? 'hidden' : 'block'}`} />
    </div>
  );
}

function dataURItoBlobSync(dataURI: string, fallbackMime: string = 'application/octet-stream'): Blob {
  try {
    const parts = dataURI.split(',');
    const header = parts[0] || '';
    const raw = parts[1] || parts[0];
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
    const cleanBase64 = raw.replace(/[\s\r\n]+/g, '');
    const byteString = atob(cleanBase64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  } catch (e) {
    console.warn('Sync base64 conversion fallback:', e);
    return new Blob([dataURI], { type: fallbackMime });
  }
}

// Global download debug state for visible feedback
let downloadClickCount = 0;

function showDownloadDebugToast(msg: string, isError: boolean = false) {
  console.log(`[Download Debug] ${msg}`);
  
  // Create or reuse an on-screen debug toast
  let toast = document.getElementById('download-debug-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'download-debug-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '24px';
    toast.style.zIndex = '999999';
    toast.style.maxWidth = '450px';
    toast.style.padding = '14px 18px';
    toast.style.borderRadius = '14px';
    toast.style.fontFamily = 'monospace, sans-serif';
    toast.style.fontSize = '12px';
    toast.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.3)';
    toast.style.transition = 'all 0.2s ease-in-out';
    toast.style.direction = 'ltr';
    document.body.appendChild(toast);
  }
  
  toast.style.backgroundColor = isError ? '#991b1b' : '#0f172a';
  toast.style.color = '#ffffff';
  toast.style.border = isError ? '2px solid #ef4444' : '2px solid #38bdf8';
  toast.innerHTML = `<div style="font-weight:bold; margin-bottom:4px; color:${isError ? '#fca5a5' : '#38bdf8'}">🔍 Download Debug Status (Click #${downloadClickCount})</div><div style="white-space: pre-wrap; line-height: 1.4;">${msg}</div>`;
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.style.opacity = '0';
      setTimeout(() => toast?.parentNode?.removeChild(toast), 300);
    }
  }, 8000);
}

function dataURItoBlobSync(dataURI: string, fallbackMime: string = 'application/octet-stream'): Blob {
  try {
    const parts = dataURI.split(',');
    const header = parts[0] || '';
    const raw = parts.length > 1 ? parts.slice(1).join(',') : parts[0];
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
    
    // Clean base64 data
    const cleanBase64 = raw.replace(/[\s\r\n]+/g, '');
    const byteString = atob(cleanBase64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  } catch (e: any) {
    console.warn('[Download Debug] Sync base64 conversion warning:', e);
    showDownloadDebugToast(`⚠️ Base64 decode warning: ${e?.message}. Attempting direct blob fallback.`, true);
    return new Blob([dataURI], { type: fallbackMime });
  }
}

function getAttachmentDownloadHref(fileUrl?: string, fileName: string = 'document.png'): string {
  const cleanName = (fileName || 'document.png').trim();
  if (fileUrl && typeof fileUrl === 'string' && (fileUrl.startsWith('data:') || fileUrl.startsWith('http') || fileUrl.startsWith('/'))) {
    return fileUrl;
  }
  if (cleanName.match(/\.(docx?)$/i)) {
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Tahoma;}}
\\viewkind4\\uc1\\pard\\rtlpar\\qr\\lang1025\\b\\f0\\fs32\\qc المملكة المغربية - الهيئة الوطنية للعدول\\par
\\fs24\\qc منظومة التوثيق العدلي الإلكترونية\\par
\\fs20\\qc ________________________________________________\\par\\par
\\b0\\fs22 وثيقة رسمية مؤمنة: ${cleanName}\\par
المرجع: DOC-${cleanName}\\par
الحالة: تم تسجيل وحفظ هذا المستند بنجاح في سجلات المنصة الرقمية.\\par
}`;
    return `data:application/msword;charset=utf-8,${encodeURIComponent(rtfContent)}`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="100%" height="100%" fill="#0f172a"/>
    <text x="50%" y="45%" fill="#E6BE8A" font-size="26" font-family="sans-serif" text-anchor="middle">المملكة المغربية — الهيئة الوطنية للعدول</text>
    <text x="50%" y="55%" fill="#ffffff" font-size="20" font-family="sans-serif" text-anchor="middle">${cleanName}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function downloadAttachmentFile(fileUrl?: string, fileName: string = 'document.png') {
  const href = getAttachmentDownloadHref(fileUrl, fileName);
  const a = document.createElement('a');
  a.href = href;
  a.download = (fileName || 'document.png').trim();
  a.target = '_self';
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a && a.parentNode) a.parentNode.removeChild(a);
  }, 100);
}

  // Map backend copy requests to Dossier objects
  const copyRequests = useMemo<CopyRequestDossier[]>(() => {
    const rawList = copyRequestsQuery.data ?? [];
    return rawList.map((row: any) => {
      const details = (row.record_details as any) || {};
      const reqName = (row.requester_name || '').split(' ');
      const firstName = reqName[0] || 'طالب';
      const lastName = reqName.slice(1).join(' ') || 'النسخة';

      const deeds = [
        {
          id: `${row.id}-deed-1`,
          title: 'الرسم 1',
          category: details.deedCategory || 'الرسوم العدلية',
          type: row.record_type || 'رسم عدلي',
          inclusionBook: details.registryBookType || details.inclusionBook || 'دفتر التضمين',
          number: String(details.number || row.record_year || '—'),
          letter: details.letter || '—',
          page: String(details.page || '—'),
          count: String(details.count || '—'),
          date: details.date || row.request_date || '—',
          court: row.primary_court || details.court || 'المحكمة الابتدائية',
          firstNotary: details.firstNotary || 'الأستاذ الموثق',
          secondNotary: details.secondNotary || undefined,
        },
      ];

      const documents: Array<{
        id: string;
        name: string;
        type: string;
        format: string;
        size: string;
        quality: 'high' | 'medium' | 'low';
        url?: string;
      }> = [];

      // 1. Explicit documents in details
      if (Array.isArray(details.documents) && details.documents.length) {
        documents.push(...details.documents);
      }

      // 2. Attachments
      if (Array.isArray(details.attachments)) {
        details.attachments.forEach((att: any, idx: number) => {
          const name = typeof att === 'string' ? att : att?.name || `مرفق-${idx + 1}.png`;
          const url = typeof att === 'object' ? att?.url || att?.docUrl : undefined;
          if (name && !documents.some((d) => d.name === name)) {
            documents.push({
              id: `${row.id}-att-${idx}`,
              name,
              type: 'مرفق مؤيد',
              format: name.endsWith('.pdf') ? 'PDF' : name.match(/\.(png|jpe?g)$/i) ? 'صورة' : 'وثيقة',
              size: typeof att === 'object' && att?.size ? att.size : 'ملف مرفق',
              quality: 'high',
              url,
            });
          }
        });
      }

      // 3. Proofs documents
      if (Array.isArray(details.proofs)) {
        details.proofs.forEach((p: any, idx: number) => {
          const fileName = p.docFile || p.proofDocFile;
          const fileUrl = p.docUrl || p.proofDocUrl || p.url;
          if (fileName && !documents.some((d) => d.name === fileName)) {
            documents.push({
              id: `${row.id}-proof-doc-${idx}`,
              name: fileName,
              type: p.title || 'سند إثبات الصفة',
              format: fileName.endsWith('.pdf') ? 'PDF' : 'صورة',
              size: 'سند إثبات',
              quality: 'high',
              url: fileUrl,
            });
          }
        });
      }

      // 4. Fallback document items
      if (details.evidenceName && !documents.some((d) => d.name === details.evidenceName)) {
        documents.push({
          id: `${row.id}-doc-evidence`,
          name: details.evidenceName,
          type: 'مستند إثبات',
          format: 'PDF',
          size: '1.5 MB',
          quality: 'high',
        });
      }
      if (details.agencyDocName && !documents.some((d) => d.name === details.agencyDocName)) {
        documents.push({
          id: `${row.id}-doc-agency`,
          name: details.agencyDocName,
          type: 'سند وكالة',
          format: 'PDF',
          size: 'سند وكالة',
          quality: 'high',
        });
      }
      if (details.inheritanceDocName && !documents.some((d) => d.name === details.inheritanceDocName)) {
        documents.push({
          id: `${row.id}-doc-inheritance`,
          name: details.inheritanceDocName,
          type: 'رسم إراثة',
          format: 'PDF',
          size: 'رسم إراثة',
          quality: 'high',
        });
      }

      if (!documents.length) {
        documents.push({
          id: `${row.id}-doc-default`,
          name: 'بطاقة التعريف الوطنية',
          type: 'cin',
          format: 'PDF',
          size: '1.2 MB',
          quality: 'high',
        });
      }

      return {
        id: row.id,
        requestNumber: details.requestNumber || `REQ-${row.record_year || 2026}-${String(row.id).slice(-6)}`,
        requester: {
          firstName,
          lastName,
          cin: row.requester_cin || details.identityNumber || '—',
          phone: details.requesterPhone || details.phone || '0600000000',
          email: details.requesterEmail || details.email || '',
          address: details.requesterAddress || details.address || '',
          identityType: details.identityType || details.idType || 'بطاقة التعريف الوطنية',
        },
        capacity: {
          type: details.capacity || row.capacity || 'أحد أطراف الرسم',
          agencyRef: details.agencyRef,
          agencyDocName: details.agencyDocName,
          inheritanceRef: details.inheritanceRef,
          inheritanceDocName: details.inheritanceDocName,
          thirdPartyJustification: details.thirdPartyJustification,
          proofs: Array.isArray(details.proofs) ? details.proofs : [],
        },
        deeds,
        documents,
        purpose: {
          reason: details.purpose || 'استخراج نسخة رسمية',
          description: details.purposeDescription || details.purpose,
          hasSupportingDoc: Boolean(details.evidenceName || details.attachments?.length),
        },
        status: row.status || 'pending_review',
        isUrgent: Boolean(details.isUrgent),
        createdAt: row.request_date || new Date().toISOString(),
        updatedAt: row.request_date || new Date().toISOString(),
        messages: details.messages || [
          {
            id: `${row.id}-m-init`,
            sender: 'system',
            senderName: 'النظام الإلكتروني',
            channel: 'system',
            body: 'تم استلام طلب استخراج النسخة وتوجيهه للمعالجة.',
            timestamp: row.request_date || '',
          },
        ],
        timeline: details.timeline || [
          {
            id: `${row.id}-t-1`,
            timestamp: row.request_date || '',
            action: 'إنشاء الطلب في المنصة',
            actor: row.requester_name || 'المواطن',
            notes: `نوع الرسم: ${row.record_type}`,
          },
        ],
        unableReason: details.unableReason,
        unableGuidance: details.unableGuidance,
        deliveryOption: details.deliveryOption,
        smartNarrowing: details.smartNarrowing || details.helperAnswers || details.smartHelper || null,
        timelineEvents: Array.isArray(details.timelineEvents) ? details.timelineEvents : Array.isArray(details.timeline) ? details.timeline : [],
        parentNames: details.parentNames || '',
        propertyLocation: details.propertyLocation || '',
        oldDeedPhoto: details.oldDeedPhoto || '',
        parties: Array.isArray(details.parties) ? details.parties : [],
        exactYear: details.exactYear || details.recordYear || null,
        startYear: details.startYear || null,
        endYear: details.endYear || null,
      };
    });
  }, [copyRequestsQuery.data]);

  useEffect(() => {
    if (!selectedRequestId && copyRequests.length) {
      setSelectedRequestId(copyRequests[0].id);
    }
  }, [selectedRequestId, copyRequests]);

  useEffect(() => {
    if (selectedRequestId) {
      markCopyRequestSeen(selectedRequestId);
    }
  }, [selectedRequestId, markCopyRequestSeen]);

  const selectedRequest = useMemo(
    () => copyRequests.find((r) => r.id === selectedRequestId) ?? copyRequests[0] ?? null,
    [copyRequests, selectedRequestId]
  );

  const filteredCopyRequests = useMemo(() => {
    let list = [...copyRequests];
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter(
        (r) =>
          r.requestNumber.toLowerCase().includes(q) ||
          `${r.requester.firstName} ${r.requester.lastName}`.toLowerCase().includes(q) ||
          r.requester.cin.toLowerCase().includes(q) ||
          r.deeds.some((d) => d.type.toLowerCase().includes(q) || d.court.toLowerCase().includes(q))
      );
    }

    switch (copyCategory) {
      case 'urgent':
        return list.filter((r) => r.isUrgent || r.status === 'urgent');
      case 'processing':
        return list.filter((r) => r.status === 'under_study' || r.status === 'pending_review' || r.status === 'pending');
      case 'needs_completion':
        return list.filter((r) => r.status === 'needs_completion');
      case 'completed':
        return list.filter((r) => r.status === 'completed' || r.status === 'processed');
      case 'archived':
        return list.filter((r) => r.status === 'archived');
      case 'alerts':
        return list.filter((r) => {
          const hasIncompleteDeed = r.deeds.some((d) => !d.number || !d.page || !d.inclusionBook);
          const hasLowQualityDoc = r.documents.some((doc) => doc.quality === 'low');
          const isMissingEvidence = r.capacity.type !== 'أحد أطراف الرسم' && !r.capacity.agencyRef && !r.capacity.inheritanceRef;
          return hasIncompleteDeed || hasLowQualityDoc || isMissingEvidence;
        });
      case 'inbox':
      default:
        return list;
    }
  }, [copyRequests, copyCategory, search]);

  const copyStats = useMemo(() => {
    const totalInbox = copyRequests.length;
    const processing = copyRequests.filter(
      (r) => r.status === 'under_study' || r.status === 'pending_review' || r.status === 'pending'
    ).length;
    const needsCompletion = copyRequests.filter((r) => r.status === 'needs_completion').length;
    const completed = copyRequests.filter((r) => r.status === 'completed' || r.status === 'processed').length;
    const urgent = copyRequests.filter((r) => r.isUrgent || r.status === 'urgent').length;

    const allMessages = copyRequests.flatMap((r) => r.messages);
    const inboxMsgCount = allMessages.filter((m) => m.channel === 'inbox').length;
    const whatsappMsgCount = allMessages.filter((m) => m.channel === 'whatsapp').length;

    return {
      totalInbox,
      processing,
      needsCompletion,
      completed,
      urgent,
      inboxMsgCount: inboxMsgCount || 0,
      whatsappMsgCount: whatsappMsgCount || 0,
    };
  }, [copyRequests]);

  const smartSummary = useMemo(() => {
    if (!selectedRequest) return { text: '', isComplete: true };
    const r = selectedRequest;
    const deed = r.deeds[0];
    const text = `تقدم السيد(ة) ${r.requester.firstName} ${r.requester.lastName} بطلب استخراج نسخة من ${
      deed?.type || 'الرسم'
    } يعود إلى سنة ${deed?.date ? deed.date.slice(-4) : '2012'}، بصفته(ا) ${r.capacity.type}، وأرفق وثيقة هويته (${
      r.requester.identityType
    }) ومراجع الرسم المتوفرة لديه لدى ${deed?.court || 'المحكمة المختصة'}.`;

    const hasMissingReqs =
      r.status === 'needs_completion' ||
      r.deeds.some((d) => !d.page || !d.number) ||
      r.documents.some((d) => d.quality === 'low') ||
      (r.capacity.type !== 'أحد أطراف الرسم' && !r.capacity.agencyRef && !r.capacity.inheritanceRef);

    return { text, isComplete: !hasMissingReqs };
  }, [selectedRequest]);

  const guardrailAlerts = useMemo(() => {
    if (!selectedRequest) return [];
    const alerts: Array<{ type: 'warning' | 'info' | 'success'; message: string }> = [];
    const r = selectedRequest;

    const hasCin = r.documents.some((d) => d.type === 'cin');
    if (!hasCin) {
      alerts.push({ type: 'warning', message: 'وثيقة إلزامية غير مرفقة: بطاقة التعريف الوطنية لمقدم الطلب.' });
    }

    if (r.capacity.type === 'وكيل' && !r.capacity.agencyRef && !r.documents.some((d) => d.type === 'agency')) {
      alerts.push({ type: 'warning', message: 'وثيقة إلزامية غير مرفقة: رسم الوكالة ومراجعها.' });
    }

    if (r.capacity.type === 'ذوو الحقوق / أحد الورثة' && !r.capacity.inheritanceRef && !r.documents.some((d) => d.type === 'inheritance')) {
      alerts.push({ type: 'warning', message: 'وثيقة إلزامية غير مرفقة: رسم الإراثة ومراجعه لإثبات الصفة.' });
    }

    const missingDeedDetails = r.deeds.some((d) => !d.number || !d.page || !d.inclusionBook);
    if (missingDeedDetails) {
      alerts.push({ type: 'warning', message: 'بعض مراجع الرسم غير مكتملة (رقم الصحيفة أو عدد التضمين يحتاج ضبط).' });
    }

    const lowQualityDocs = r.documents.filter((d) => d.quality === 'low');
    if (lowQualityDocs.length > 0) {
      alerts.push({
        type: 'warning',
        message: `جودة إحدى الوثائق منخفضة (${lowQualityDocs.map((d) => d.name).join('، ')})، يفضل طلب إعادة مسحها ضوئياً.`,
      });
    }

    if (r.deeds.length > 1) {
      alerts.push({ type: 'info', message: `الطلب يتضمن أكثر من رسم (${r.deeds.length} رسوم عدلية مطلوبة في نفس الملف).` });
    }

    if (alerts.length === 0) {
      alerts.push({ type: 'success', message: 'تم استكمال وتدقيق جميع البيانات الأساسية والمرفقات بنجاح.' });
    }

    return alerts;
  }, [selectedRequest]);

  const isCinRevealed = true;
  const displayCin = (cin: string) => {
    if (!cin) return '—';
    return cin;
  };

  const handleUpdateCopyRequestStatus = async (newStatus: string, actionTitle: string, note?: string) => {
    if (!selectedRequest) return;
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(
      now.getHours()
    ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const originalRow = (copyRequestsQuery.data ?? []).find((r: any) => r.id === selectedRequest.id);
    const existingDetails = (originalRow?.record_details as any) || {};

    const updatedTimeline = [
      ...(selectedRequest.timeline || []),
      {
        id: `t-${Date.now()}`,
        timestamp: timeStr,
        action: actionTitle,
        actor: user?.full_name || 'العدل',
        notes: note || '',
      },
    ];

    try {
      await updateCopyRequestMutation.mutateAsync({
        id: selectedRequest.id,
        record_type: originalRow?.record_type || selectedRequest.deeds[0]?.type || 'رسم عدلي',
        requester_name: originalRow?.requester_name || `${selectedRequest.requester.firstName} ${selectedRequest.requester.lastName}`,
        requester_cin: originalRow?.requester_cin || selectedRequest.requester.cin,
        request_date: originalRow?.request_date || new Date().toISOString().slice(0, 10),
        status: newStatus as any,
        record_details: {
          ...existingDetails,
          timeline: updatedTimeline,
        },
      });
      await copyRequestsQuery.refetch();
    } catch (err: any) {
      alert(err?.message || 'تعذر تحديث وضعية الطلب.');
    }
  };

  const triggerWhatsAppContact = (customText?: string) => {
    if (!selectedRequest) return;
    const phone = selectedRequest.requester.phone.replace(/^0/, '212').replace(/\D/g, '');
    const reqNo = selectedRequest.requestNumber;
    const deedName = selectedRequest.deeds[0]?.type || 'الرسم العدلي';

    const defaultMsg =
      customText ||
      `السلام عليكم ورحمة الله،\nبخصوص طلبكم رقم ${reqNo} المتعلق باستخراج نسخة من ${deedName}، نرجو منكم التواصل معنا لمتابعة الإجراءات وموافاتنا بالتوضيحات المطلوبة.\nمع تحيات مكتب التوثيق العدلي.`;

    const encoded = encodeURIComponent(defaultMsg);
    const waUrl = `https://wa.me/${phone}?text=${encoded}`;

    void handleUpdateCopyRequestStatus(
      selectedRequest.status,
      'تواصل عبر WhatsApp مع مقدم الطلب',
      `تم فتح محادثة WhatsApp على الرقم (${selectedRequest.requester.phone}) برقم الطلب ${reqNo}`
    );

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setIsCommunicateModalOpen(false);
  };

  const handleSendInAppMessage = async () => {
    if (!selectedRequest || !commBody.trim()) return;
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(
      now.getHours()
    ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const originalRow = (copyRequestsQuery.data ?? []).find((r: any) => r.id === selectedRequest.id);
    const existingDetails = (originalRow?.record_details as any) || {};

    const updatedMessages = [
      ...(selectedRequest.messages || []),
      {
        id: `msg-${Date.now()}`,
        sender: 'notary' as const,
        senderName: user?.full_name || 'العدل',
        channel: 'inbox' as const,
        subject: commSubject,
        body: commBody,
        timestamp: `${now.toISOString().slice(0, 10)} ${timeStr.slice(-5)}`,
      },
    ];

    const updatedTimeline = [
      ...(selectedRequest.timeline || []),
      {
        id: `t-${Date.now()}`,
        timestamp: timeStr,
        action: `إرسال رسالة رسمية: ${commSubject}`,
        actor: 'العدل',
        notes: commBody.slice(0, 80) + '...',
      },
    ];

    try {
      await updateCopyRequestMutation.mutateAsync({
        id: selectedRequest.id,
        record_type: originalRow?.record_type || selectedRequest.deeds[0]?.type || 'رسم عدلي',
        requester_name: originalRow?.requester_name || `${selectedRequest.requester.firstName} ${selectedRequest.requester.lastName}`,
        requester_cin: originalRow?.requester_cin || selectedRequest.requester.cin,
        request_date: originalRow?.request_date || new Date().toISOString().slice(0, 10),
        status: commSubject.includes('استكمال') ? 'needs_completion' : (originalRow?.status || 'under_study'),
        record_details: {
          ...existingDetails,
          messages: updatedMessages,
          timeline: updatedTimeline,
        },
      });
      setCommBody('');
      setIsCommunicateModalOpen(false);
      await copyRequestsQuery.refetch();
    } catch (err: any) {
      alert(err?.message || 'تعذر إرسال الرسالة.');
    }
  };

  const handleConfirmUnable = async () => {
    if (!selectedRequest || !unableReason.trim()) return;
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(
      now.getHours()
    ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const originalRow = (copyRequestsQuery.data ?? []).find((r: any) => r.id === selectedRequest.id);
    const existingDetails = (originalRow?.record_details as any) || {};

    const updatedTimeline = [
      ...(selectedRequest.timeline || []),
      {
        id: `t-${Date.now()}`,
        timestamp: timeStr,
        action: 'تسجيل تعذر معالجة الطلب بأسلوب مهني',
        actor: 'العدل',
        notes: `السبب: ${unableReason}`,
      },
    ];

    try {
      await updateCopyRequestMutation.mutateAsync({
        id: selectedRequest.id,
        record_type: originalRow?.record_type || selectedRequest.deeds[0]?.type || 'رسم عدلي',
        requester_name: originalRow?.requester_name || `${selectedRequest.requester.firstName} ${selectedRequest.requester.lastName}`,
        requester_cin: originalRow?.requester_cin || selectedRequest.requester.cin,
        request_date: originalRow?.request_date || new Date().toISOString().slice(0, 10),
        status: 'unable_to_process' as any,
        record_details: {
          ...existingDetails,
          unableReason,
          unableGuidance,
          timeline: updatedTimeline,
        },
      });
      setIsUnableModalOpen(false);
      await copyRequestsQuery.refetch();
    } catch (err: any) {
      alert(err?.message || 'تعذر تسجيل حالة التعذر.');
    }
  };

  const handleConfirmComplete = async () => {
    if (!selectedRequest) return;
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(
      now.getHours()
    ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const originalRow = (copyRequestsQuery.data ?? []).find((r: any) => r.id === selectedRequest.id);
    const existingDetails = (originalRow?.record_details as any) || {};

    const updatedTimeline = [
      ...(selectedRequest.timeline || []),
      {
        id: `t-${Date.now()}`,
        timestamp: timeStr,
        action: 'إنجاز الطلب وإصدار النسخة العدلية المطابقة',
        actor: 'العدل',
        notes: `تم اعتماد خيار التسليم: ${deliveryOption}`,
      },
    ];

    try {
      await updateCopyRequestMutation.mutateAsync({
        id: selectedRequest.id,
        record_type: originalRow?.record_type || selectedRequest.deeds[0]?.type || 'رسم عدلي',
        requester_name: originalRow?.requester_name || `${selectedRequest.requester.firstName} ${selectedRequest.requester.lastName}`,
        requester_cin: originalRow?.requester_cin || selectedRequest.requester.cin,
        request_date: originalRow?.request_date || new Date().toISOString().slice(0, 10),
        status: 'completed' as any,
        record_details: {
          ...existingDetails,
          deliveryOption,
          timeline: updatedTimeline,
        },
      });
      setIsCompleteModalOpen(false);
      await copyRequestsQuery.refetch();
    } catch (err: any) {
      alert(err?.message || 'تعذر إتمام الطلب.');
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-right">
            <div className="text-2xl font-extrabold text-slate-900">
              {mainTab === 'messages' ? 'صندوق الرسائل' : 'الصندوق المهني وإدارة طلبات النسخ'}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {mode === 'judge'
                ? 'تواصل مهني مؤمن بين قاضي التوثيق والعدول.'
                : 'تواصل مهني مؤمن وإدارة شاملة لطلبات استخراج نسخ الرسوم والشهادات العدلية.'}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle between Direct Messaging and Copy Extraction Management */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setMainTab('messages')}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition ${
                  mainTab === 'messages'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>صندوق الرسائل</span>
                {threads.length > 0 && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold">
                    {threads.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMainTab('copy_requests')}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition ${
                  mainTab === 'copy_requests'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-4 w-4 text-blue-600" />
                <span>طلبات استخراج النسخ</span>
                {copyRequests.length > 0 && (
                  <span className="rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.2 text-[10px] font-bold">
                    {copyRequests.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={openNewMessage}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 shadow-sm transition"
            >
              + رسالة جديدة
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                mainTab === 'messages'
                  ? 'البحث في الرسائل بالاسم أو البريد الإلكتروني...'
                  : 'البحث في طلبات النسخ برقم الطلب (REQ-...)، اسم المواطن، رقم البطاقة...'
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pr-10 pl-3 text-xs font-semibold placeholder-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              مسح
            </button>
          )}
        </div>
      </div>

      {/* New Message Composer Modal */}
      <Transition appear show={isNewMessageOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsNewMessageOpen(false)}>
          <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-4 sm:p-8">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-2 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-2 scale-95"
              >
                <Dialog.Panel className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <button type="button" onClick={() => setIsNewMessageOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700" aria-label="إغلاق نافذة الرسالة">
                      <X className="h-5 w-5" />
                    </button>
                    <div className="text-right">
                      <Dialog.Title className="text-xl font-extrabold text-slate-900">رسالة جديدة</Dialog.Title>
                      <p className="mt-1 text-sm text-slate-600">اختيار المستلم وكتابة الرسالة في مساحة عمل واحدة.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[260px,1fr]">
                    <div className="text-right text-sm font-bold text-slate-700">المستلمون</div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setComposeChannel('internal')}
                          className={`rounded-xl px-4 py-2 text-sm font-extrabold ${
                            composeChannel === 'internal' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {mode === 'judge' ? 'اختيار عدل متاح' : 'اختيار قاضي التوثيق'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setComposeChannel('email')}
                          className={`rounded-xl px-4 py-2 text-sm font-extrabold ${
                            composeChannel === 'email' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          إرسال بالبريد الإلكتروني
                        </button>
                      </div>

                      {composeChannel === 'internal' ? (
                        <>
                          <Combobox value={selectedRecipient} onChange={setSelectedRecipient} disabled={!sessionToken}>
                            <div className="relative">
                              <Combobox.Input
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                                onChange={(event) => setRecipientQuery(event.target.value)}
                                displayValue={(r: any) => (r ? r.title : '')}
                                placeholder="ابحث عن عضو/مجموعة…"
                              />
                              <Combobox.Options className="absolute z-10 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                                {(mode === 'judge' ? adoulTargetsQuery.isLoading : judgeTargetsQuery.isLoading) ? (
                                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">جاري التحميل…</div>
                                ) : null}
                                {!filteredRecipients.length ? (
                                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">لا توجد نتائج.</div>
                                ) : null}
                                {filteredRecipients.map((r) => (
                                  <Combobox.Option
                                    key={r.id}
                                    value={r}
                                    className={({ active }) =>
                                      `cursor-pointer rounded-xl px-3 py-2 text-right ${active ? 'bg-slate-900 text-white' : 'text-slate-900'}`
                                    }
                                  >
                                    <div className="text-sm font-extrabold">{r.title}</div>
                                    <div className="mt-1 text-xs opacity-80" dir="ltr">
                                      {r.subtitle}
                                    </div>
                                  </Combobox.Option>
                                ))}
                              </Combobox.Options>
                            </div>
                          </Combobox>

                          <label className="flex items-center justify-end gap-2 text-sm text-slate-700">
                            <span>Send an email copy to recipients</span>
                            <input
                              type="checkbox"
                              checked={sendEmailCopy}
                              onChange={(e) => setSendEmailCopy(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </label>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="Enter email address…"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                            dir="ltr"
                          />
                          <div className="text-right text-xs text-slate-600">
                            سيتم إرسال الرسالة مباشرة عبر البريد الإلكتروني.
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm font-bold text-slate-700">
                      <span className="text-rose-600">*</span> الرسالة
                    </div>
                    <div className="space-y-3">
                      <RichTextComposer
                        valueHtml={newMessageHtml}
                        onChangeHtml={setNewMessageHtml}
                        disabled={!sessionToken || sendMessageMutation.isPending || createThreadMutation.isPending}
                        placeholder="اكتب رسالتك هنا..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setIsNewMessageOpen(false)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      إغلاق
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendNewMessage()}
                      disabled={disableNewMessageSend}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      إرسال
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* VIEW A: REAL MESSAGING THREADS (Original Functionality Restored) */}
      {mainTab === 'messages' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px,1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="font-extrabold text-sm text-slate-900">المحادثات المباشرة</div>
              <button
                type="button"
                onClick={() => void threadsQuery.refetch()}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                تحديث
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-[560px] overflow-y-auto">
              {threadsQuery.isLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 text-center">
                  جاري التحميل…
                </div>
              ) : null}
              {threadsQuery.isError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 text-center">
                  تعذر تحميل المحادثات.
                </div>
              ) : null}
              {!filteredThreads.length && !threadsQuery.isLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                  لا توجد محادثات بعد.
                </div>
              ) : null}

              {filteredThreads.map((t) => {
                const active = t.id === selectedThreadId;
                const title = t.partner ? `${t.otherUser.fullName} — ${t.partner.partnerName}` : t.otherUser.fullName;
                const lastLine = t.lastMessage?.body ? stripHtml(t.lastMessage.body) : '—';
                const unread = t.unreadCount || 0;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedThreadId(t.id)}
                    className={`w-full rounded-2xl border p-3.5 text-right transition ${
                      active ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-900">{title}</div>
                        <div className="mt-1 truncate text-xs text-slate-600">{lastLine}</div>
                        {t.lastMessage?.at ? (
                          <div className="mt-1 text-[11px] text-slate-500">{formatTime(t.lastMessage.at)}</div>
                        ) : null}
                      </div>
                      {unread ? (
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 text-xs font-bold text-white">
                          {unread}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-[540px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 p-4 bg-slate-50/50">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-right">
                  <div className="truncate text-base font-extrabold text-slate-900">
                    {selectedThread
                      ? selectedThread.partner
                        ? `${selectedThread.otherUser.fullName} — ${selectedThread.partner.partnerName}`
                        : selectedThread.otherUser.fullName
                      : '—'}
                  </div>
                  {selectedThread ? (
                    <div className="mt-0.5 text-xs text-slate-600">{selectedThread.otherUser.email}</div>
                  ) : null}
                </div>
                <div className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-bold text-slate-700">
                  {user?.role === 'authentication_judge' ? 'قاضي التوثيق' : 'عدل'}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
              {!selectedThread ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  اختر محادثة لعرض الرسائل.
                </div>
              ) : null}
              {selectedThread && messagesQuery.isLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 text-center">
                  جاري التحميل…
                </div>
              ) : null}
              {selectedThread && messagesQuery.isError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 text-center">
                  تعذر تحميل الرسائل.
                </div>
              ) : null}

              {selectedThread &&
                threadMessagesList.map((m) => {
                  const mine = m.senderUserId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          mine ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'
                        }`}
                      >
                        <div className={mine ? '[&_a]:text-white [&_a]:underline' : '[&_a]:text-slate-900 [&_a]:underline'}>
                          {renderMessageBody(m.body)}
                        </div>
                        <div className={`mt-2 text-[11px] ${mine ? 'text-white/70' : 'text-slate-500'}`}>
                          {formatTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {selectedThread && (
              <div className="border-t border-slate-200 bg-white p-4">
                <RichTextComposer
                  valueHtml={replyHtml}
                  onChangeHtml={setReplyHtml}
                  disabled={sendMessageMutation.isPending}
                  placeholder="اكتب رداً داخل هذه المحادثة..."
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={!stripHtml(replyHtml) || sendMessageMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {sendMessageMutation.isPending ? 'جار إرسال الرد...' : 'إرسال الرد'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* VIEW B: COPY EXTRACTION REQUESTS (Upgraded Features Linked to Real Backend) */}
      {mainTab === 'copy_requests' && (
        <div className="space-y-6">
          {/* Top KPI counters */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right">
              <div className="text-xs font-bold text-slate-500">الوارد الإجمالي</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{copyStats.totalInbox}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right">
              <div className="text-xs font-bold text-slate-500">قيد المعالجة</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{copyStats.processing}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right">
              <div className="text-xs font-bold text-slate-500">يحتاج استكمال</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{copyStats.needsCompletion}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right">
              <div className="text-xs font-bold text-slate-500">مكتملة ومسلمة</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{copyStats.completed}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px,1fr]">
            {/* Sidebar list of requests */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="font-black text-xs text-slate-500 uppercase">
                  طلبات استخراج النسخ ({filteredCopyRequests.length})
                </div>
                <button
                  type="button"
                  onClick={() => void copyRequestsQuery.refetch()}
                  className="p-1 text-slate-400 hover:text-slate-700"
                  title="تحديث"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2 max-h-[620px] overflow-y-auto">
                {copyRequestsQuery.isLoading && (
                  <div className="p-4 text-center text-xs text-slate-500">جاري تحميل الطلبات من الخادم...</div>
                )}
                {!filteredCopyRequests.length && !copyRequestsQuery.isLoading && (
                  <div className="p-8 text-center text-xs text-slate-500">لا توجد طلبات نسخ مسجلة حالياً.</div>
                )}

                {filteredCopyRequests.map((req) => {
                  const isSelected = req.id === selectedRequestId;
                  const primaryDeed = req.deeds[0];

                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedRequestId(req.id)}
                      className={`cursor-pointer rounded-2xl border p-3.5 text-right transition ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-xs font-black ${isSelected ? 'text-[#E6BE8A]' : 'text-slate-700'}`}>
                          {req.requestNumber}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            req.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-900'
                              : req.status === 'needs_completion'
                              ? 'bg-rose-100 text-rose-900'
                              : isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {req.status === 'completed'
                            ? 'مكتمل'
                            : req.status === 'needs_completion'
                            ? 'يحتاج استكمال'
                            : req.status === 'unable_to_process'
                            ? 'تعذر المعالجة'
                            : 'قيد المعالجة'}
                        </span>
                      </div>

                      <div className="mt-1.5 text-sm font-extrabold truncate">
                        {req.requester.firstName} {req.requester.lastName}
                      </div>
                      <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                        {primaryDeed?.type || 'رسم عدلي'} • {req.capacity.type}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dossier Detail Area */}
            {selectedRequest ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                {/* Protected File Badge */}
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-right">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <ShieldCheck className="h-4 w-4 text-blue-700" />
                    <span>ملف محمي: يتضمن هذا الطلب معطيات شخصية ووثائق خاضعة لسرية المهنة.</span>
                  </div>
                  <span className="rounded-full bg-blue-200 px-2 py-0.5 text-[10px] font-black text-blue-950">
                    صلاحية العدل
                  </span>
                </div>

                {/* Dossier Header */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-right">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500">طلب استخراج نسخة من رسم</div>
                      <div className="text-xl font-black text-slate-900 font-mono">{selectedRequest.requestNumber}</div>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-[#E6BE8A]">
                      {selectedRequest.deeds[0]?.court || 'المحكمة الابتدائية'}
                    </span>
                  </div>

                  {/* Smart Summary */}
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5 text-right">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>الملخص الذكي للطلب</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          smartSummary.isComplete ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {smartSummary.isComplete ? '✓ البيانات الأساسية مكتملة' : '! تحتاج استكمال'}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">{smartSummary.text}</p>
                  </div>

                  {/* Alerts */}
                  <div className="mt-3 space-y-1">
                    {guardrailAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold ${
                          alert.type === 'warning'
                            ? 'bg-rose-50 text-rose-900'
                            : alert.type === 'info'
                            ? 'bg-blue-50 text-blue-900'
                            : 'bg-emerald-50 text-emerald-900'
                        }`}
                      >
                        {alert.type === 'warning' ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                        <span>{alert.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200">
                  <nav className="flex flex-wrap gap-2 text-right">
                    {[
                      { id: 'applicant', label: 'مقدم الطلب', icon: User },
                      { id: 'capacity', label: 'الصفة', icon: ShieldCheck },
                      { id: 'deed', label: 'الرسم ومراجعه', icon: FileSpreadsheet },
                      { id: 'smart_helper', label: 'إجابات المساعد الذكي', icon: Sparkles, badge: '🌿' },
                      { id: 'documents', label: 'مركز الوثائق', icon: FolderOpen },
                      { id: 'purpose', label: 'سبب الطلب', icon: HelpCircle },
                      { id: 'messages', label: 'المراسلات', icon: MessageSquare },
                      { id: 'timeline', label: 'سجل الإجراءات', icon: Clock },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const active = activeDossierTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveDossierTab(tab.id as any)}
                          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-black transition ${
                            active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${active ? 'text-[#E6BE8A]' : 'text-slate-400'}`} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Tab 1: Applicant */}
                {activeDossierTab === 'applicant' && (
                  <div className="space-y-3 text-right">
                    <h4 className="text-xs font-black text-slate-900">بيانات مقدم الطلب</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <div className="text-[10px] font-bold text-slate-400">الاسم الكامل</div>
                        <div className="font-black text-slate-900 mt-1">
                          {selectedRequest.requester.firstName} {selectedRequest.requester.lastName}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <div className="text-[10px] font-bold text-slate-400">رقم بطاقة التعريف الوطنية</div>
                        <div className="font-black text-slate-900 mt-1 font-mono">{selectedRequest.requester.cin}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <div className="text-[10px] font-bold text-slate-400">الهاتف</div>
                        <div className="font-black text-slate-900 mt-1 font-mono" dir="ltr">
                          {selectedRequest.requester.phone}
                        </div>
                      </div>
                      {selectedRequest.requester.email && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                          <div className="text-[10px] font-bold text-slate-400">البريد الإلكتروني</div>
                          <div className="font-bold text-slate-900 mt-1 font-mono truncate">{selectedRequest.requester.email}</div>
                        </div>
                      )}
                      {selectedRequest.requester.address && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:col-span-2">
                          <div className="text-[10px] font-bold text-slate-400">العنوان المصرح به</div>
                          <div className="font-bold text-slate-900 mt-1">{selectedRequest.requester.address}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Capacity & Proofs */}
                {activeDossierTab === 'capacity' && (
                  <div className="space-y-4 text-right">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">الصفة القانونية ومبررات التمثيل</h4>
                      <span className="bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full border border-amber-200">
                        الصفة المصرح بها: {selectedRequest.capacity.type}
                      </span>
                    </div>

                    {/* Render dynamic proofs list if present */}
                    {selectedRequest.capacity.proofs && selectedRequest.capacity.proofs.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-slate-600">
                          بيان الوثائق والمراجع المثبتة للصفة ({selectedRequest.capacity.proofs.length}):
                        </div>
                        <div className="grid gap-3">
                          {selectedRequest.capacity.proofs.map((proof, idx) => (
                            <div key={proof.id || idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs">
                              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                                <span className="font-black text-slate-900 flex items-center gap-1.5">
                                  <span>📜</span>
                                  <span>{proof.title}</span>
                                </span>
                                <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                  سند رقم {idx + 1}
                                </span>
                              </div>
                              <div className="text-slate-800 leading-relaxed font-mono">
                                {proof.details}
                              </div>
                              {proof.docFile && (
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                                    <span>📎</span>
                                    <span>الملف المرفق: {proof.docFile}</span>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setViewingDoc({
                                          name: proof.docFile || proof.title || 'سند إثبات',
                                          url: proof.docUrl || proof.url,
                                          format: (proof.docFile || '').endsWith('.pdf') ? 'PDF' : 'صورة',
                                          type: proof.title || 'سند إثبات الصفة',
                                          details: proof.details,
                                        });
                                        setIsDocViewerOpen(true);
                                      }}
                                      className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-bold px-2.5 py-1 rounded-lg text-slate-800 shadow-sm transition flex items-center gap-1"
                                    >
                                      <span>👁️</span>
                                      <span>معاينة</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => downloadAttachmentFile(proof.docUrl || proof.url, proof.docFile || proof.title || 'proof.png')}
                                      className="bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold px-2.5 py-1 rounded-lg text-slate-700 shadow-sm transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>📥</span>
                                      <span>تحميل</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs">
                        <div className="font-black text-slate-900">الصفة: {selectedRequest.capacity.type}</div>
                        {selectedRequest.capacity.agencyRef && (
                          <div className="text-slate-600">مراجع الوكالة: {selectedRequest.capacity.agencyRef}</div>
                        )}
                        {selectedRequest.capacity.inheritanceRef && (
                          <div className="text-slate-600">مراجع الإراثة: {selectedRequest.capacity.inheritanceRef}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Deed Details */}
                {activeDossierTab === 'deed' && (
                  <div className="space-y-3 text-right">
                    <h4 className="text-xs font-black text-slate-900">مراجع الرسم المطلوب</h4>
                    {selectedRequest.deeds.map((deed) => (
                      <div key={deed.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 text-xs">
                        <div className="font-black text-slate-900">
                          {deed.type} — {deed.category}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="rounded-lg bg-white p-2 border border-slate-200">
                            <div className="text-[10px] text-slate-400">حامل التضمين</div>
                            <div className="font-bold">{deed.inclusionBook}</div>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-slate-200">
                            <div className="text-[10px] text-slate-400">الرقم</div>
                            <div className="font-bold">{deed.number}</div>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-slate-200">
                            <div className="text-[10px] text-slate-400">الصحيفة والعدد</div>
                            <div className="font-bold">
                              ص {deed.page} • ع {deed.count}
                            </div>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-slate-200">
                            <div className="text-[10px] text-slate-400">التاريخ</div>
                            <div className="font-bold">{deed.date}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}


                {/* Tab: Smart Search Helper Answers (إجابات المساعد الذكي لتضييق البحث) */}
                {activeDossierTab === 'smart_helper' && (
                  <div className="space-y-4 text-right">
                    {/* Header Banner */}
                    <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 text-right space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🌿</span>
                          <div>
                            <h4 className="text-xs font-black text-emerald-950">إجابات مسار التضييق الذكي للبحث عن الرسم</h4>
                            <p className="text-[11px] text-emerald-800">
                              معطيات أدلى بها المواطن تدريجياً عبر المساعد لتسهيل فتح سجل التضمين وتحديد سنوات البحث.
                            </p>
                          </div>
                        </div>
                        <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-300 shadow-sm">
                          {selectedRequest.smartNarrowing ? '✓ مسار تفاعلي مكتمل' : 'معطيات البحث المسجلة'}
                        </span>
                      </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Section 1: Period & Years Scope */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                            <span>📅</span>
                            <span>المرحلة الأولى: الفترة والسنوات المستهدفة</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            نطاق البحث
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <div className="text-[10px] text-slate-400 font-bold">دقة تحديد السنة</div>
                            <div className="font-black text-slate-900 mt-1">
                              {selectedRequest.smartNarrowing?.marriageYearAccuracy === 'exact'
                                ? '🎯 سنة محددة بدقة'
                                : selectedRequest.smartNarrowing?.marriageYearAccuracy === 'between_two'
                                ? '⏳ نطاق بين سنتين'
                                : selectedRequest.smartNarrowing?.marriageYearAccuracy === 'approx'
                                ? '📅 فترة تقريبية'
                                : selectedRequest.smartNarrowing?.marriageYearAccuracy === 'unknown'
                                ? '❓ لا يتذكر السنة'
                                : selectedRequest.exactYear
                                ? 'سنة محددة (' + selectedRequest.exactYear + ')'
                                : selectedRequest.startYear && selectedRequest.endYear
                                ? 'بين ' + selectedRequest.startYear + ' و ' + selectedRequest.endYear
                                : 'فترة تقريبية'}
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <div className="text-[10px] text-slate-400 font-bold">السنوات المصرح بها</div>
                            <div className="font-mono font-black text-emerald-950 mt-1">
                              {selectedRequest.smartNarrowing?.marriageYearAccuracy === 'between_two' && selectedRequest.smartNarrowing?.marriageYear1 && selectedRequest.smartNarrowing?.marriageYear2
                                ? String(selectedRequest.smartNarrowing.marriageYear1) + ' – ' + String(selectedRequest.smartNarrowing.marriageYear2)
                                : selectedRequest.smartNarrowing?.marriageYear1
                                ? String(selectedRequest.smartNarrowing.marriageYear1)
                                : selectedRequest.exactYear
                                ? String(selectedRequest.exactYear)
                                : selectedRequest.startYear && selectedRequest.endYear
                                ? String(selectedRequest.startYear) + ' – ' + String(selectedRequest.endYear)
                                : 'غير محددة بدقة'}
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <div className="text-[10px] text-slate-400 font-bold">المحكمة المختصة</div>
                            <div className="font-black text-slate-900 mt-1">
                              {selectedRequest.deeds[0]?.court || selectedRequest.smartNarrowing?.divorceCourtName || 'المحكمة الابتدائية'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Memory Event & Personal Context */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                            <span>🧠</span>
                            <span>المرحلة الثانية: الحدث المساعد على التذكر والقرائن الشخصية</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            الذاكرة والقرائن
                          </span>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-bold">نوع الحدث:</span>
                            <span className="font-bold text-[#7A0D1A] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {selectedRequest.smartNarrowing?.marriageEvent ||
                               selectedRequest.smartNarrowing?.propertyHistoryEvent ||
                               '💍 مناسبة / حدث عائلي أو شخصي'}
                            </span>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold mb-0.5">تفاصيل الحدث كما صرح بها المواطن:</div>
                            <div className="font-bold text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                              {selectedRequest.smartNarrowing?.marriageEventDetail ||
                               selectedRequest.smartNarrowing?.propertyHistoryEventDetail ||
                               selectedRequest.purpose.description ||
                               'تم تحديد الفترة بالاستناد إلى حدث عائلي أو شخصي مقترن بالرسم.'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Civil Status Documents or Ruling References */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                            <span>🪪</span>
                            <span>المرحلة الثالثة: وثائق الحالة المدنية والأحكام والمراجع</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                          {selectedRequest.smartNarrowing?.hasCivilStatusDoc2004 !== undefined && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold">حالة الكناش / عقد ولادة الأبناء</div>
                              <div className="font-bold text-slate-900 mt-1">
                                {selectedRequest.smartNarrowing?.hasCivilStatusDoc2004 === 'yes'
                                  ? '✓ متوفر لدى المواطن'
                                  : selectedRequest.smartNarrowing?.hasCivilStatusDoc2004 === 'no'
                                  ? '✕ غير متوفر حالياً'
                                  : 'مستند إلى الحالة المدنية'}
                              </div>
                            </div>
                          )}

                          {(selectedRequest.smartNarrowing?.civilStatusDocNumber || selectedRequest.smartNarrowing?.civilStatusDocYear) && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold">رقم العقد وسنته</div>
                              <div className="font-mono font-bold text-slate-900 mt-1">
                                رقم: {selectedRequest.smartNarrowing?.civilStatusDocNumber || '—'} / سنة: {selectedRequest.smartNarrowing?.civilStatusDocYear || '—'}
                              </div>
                            </div>
                          )}

                          {selectedRequest.smartNarrowing?.civilStatusCommune && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold">مصلحة الحالة المدنية / الجماعة</div>
                              <div className="font-bold text-slate-900 mt-1">
                                {selectedRequest.smartNarrowing?.civilStatusCommune}
                              </div>
                            </div>
                          )}

                          {/* First Child Birth */}
                          {(selectedRequest.smartNarrowing?.firstChildBirthYear || selectedRequest.smartNarrowing?.firstChildBirthPeriod) && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold">سنة / فترة ولادة الطفل الأول</div>
                              <div className="font-mono font-bold text-slate-900 mt-1">
                                {selectedRequest.smartNarrowing?.firstChildBirthYear || selectedRequest.smartNarrowing?.firstChildBirthPeriod}
                              </div>
                            </div>
                          )}

                          {/* Divorce Specific Authorities */}
                          {selectedRequest.smartNarrowing?.divorceAuthorityType && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200 sm:col-span-2">
                              <div className="text-[10px] text-slate-400 font-bold">نوع جهة الطلاق</div>
                              <div className="font-bold text-slate-900 mt-1 flex flex-wrap items-center gap-2">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                                  {selectedRequest.smartNarrowing?.divorceAuthorityType === 'court_ruling' ? '🏛️ حكم قضائي (طلاق للشقاق / قضائي)' : '👨‍⚖️ إشهاد عدلي اتفاقي'}
                                </span>
                                {selectedRequest.smartNarrowing?.divorceCaseNumber && (
                                  <span className="font-mono text-slate-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    ملف: {selectedRequest.smartNarrowing?.divorceCaseNumber}
                                  </span>
                                )}
                                {selectedRequest.smartNarrowing?.divorceRulingNumber && (
                                  <span className="font-mono text-slate-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    حكم عدد: {selectedRequest.smartNarrowing?.divorceRulingNumber}
                                  </span>
                                )}
                                {selectedRequest.smartNarrowing?.divorceRulingYear && (
                                  <span className="font-mono text-slate-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    سنة الحكم: {selectedRequest.smartNarrowing?.divorceRulingYear}
                                  </span>
                                )}
                                {selectedRequest.smartNarrowing?.divorceAdoulName && (
                                  <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                    العدل: {selectedRequest.smartNarrowing?.divorceAdoulName}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Property Details */}
                          {selectedRequest.smartNarrowing?.propertyTransactionType && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold">نوع التصرف العقاري</div>
                              <div className="font-bold text-slate-900 mt-1">
                                {selectedRequest.smartNarrowing?.propertyTransactionType}
                              </div>
                            </div>
                          )}

                          {(selectedRequest.smartNarrowing?.propertyMunicipality || selectedRequest.smartNarrowing?.propertyNeighborhood) && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold">الجماعة والحي</div>
                              <div className="font-bold text-slate-900 mt-1">
                                {[selectedRequest.smartNarrowing?.propertyMunicipality, selectedRequest.smartNarrowing?.propertyNeighborhood].filter(Boolean).join(' - ')}
                              </div>
                            </div>
                          )}

                          {selectedRequest.smartNarrowing?.priorDeedDocRef && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200 sm:col-span-2">
                              <div className="text-[10px] text-slate-400 font-bold">مراجع الوثيقة العقارية السابقة</div>
                              <div className="font-mono font-bold text-slate-900 mt-1">
                                {selectedRequest.smartNarrowing?.priorDeedDocRef}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 4: Declared Parties (الأطراف المصرح بهم) */}
                      {selectedRequest.parties && selectedRequest.parties.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                              <span>👥</span>
                              <span>الأطراف المصرح بهم في طلب البحث ({selectedRequest.parties.length})</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedRequest.parties.map((p: any, idx: number) => (
                              <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                                <div className="font-bold text-slate-900">
                                  <span className="text-slate-500 ml-1">[{p.role || 'طرف'}]:</span>
                                  <span>{p.firstName} {p.lastName || ''}</span>
                                </div>
                                {p.cin && (
                                  <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                    {p.cin}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 5: Timeline of Added Notes (💡 تذكرت معلومة أخرى) */}
                      <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                          <span className="font-black text-amber-950 text-xs flex items-center gap-1.5">
                            <span>💡</span>
                            <span>المعلومات والإضافات المسجلة لاحقاً ("تذكرت معلومة أخرى")</span>
                          </span>
                          <span className="text-[10px] font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                            {selectedRequest.timelineEvents?.length || 1} ملاحظة
                          </span>
                        </div>

                        <div className="space-y-2">
                          {selectedRequest.timelineEvents && selectedRequest.timelineEvents.length > 0 ? (
                            selectedRequest.timelineEvents.map((evt: any, i: number) => (
                              <div key={evt.id || i} className="bg-white p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                                    <span>📝</span>
                                    <span>{evt.category || 'معلومة إضافية'}</span>
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400" dir="ltr">
                                    {evt.timestamp || evt.date || '01/09/2026'}
                                  </span>
                                </div>
                                <div className="text-slate-800 font-medium leading-relaxed">
                                  {evt.text || evt.notes || evt.action}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                              لم يُضف الطالب معلومات تكميلية إضافية بعد الإيداع الأولي.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 6: Complementary Party & Location Info */}
                      {(selectedRequest.parentNames || selectedRequest.propertyLocation || selectedRequest.oldDeedPhoto) && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                          <div className="font-black text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                            <span>📌</span>
                            <span>معلومات تكميلية للبحث</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {selectedRequest.parentNames && (
                              <div className="bg-white p-3 rounded-xl border border-slate-200">
                                <div className="text-[10px] text-slate-400 font-bold">اسم الأب / الأم المصرح به</div>
                                <div className="font-bold text-slate-900 mt-1">{selectedRequest.parentNames}</div>
                              </div>
                            )}
                            {selectedRequest.propertyLocation && (
                              <div className="bg-white p-3 rounded-xl border border-slate-200">
                                <div className="text-[10px] text-slate-400 font-bold">موقع العقار / الحي</div>
                                <div className="font-bold text-slate-900 mt-1">{selectedRequest.propertyLocation}</div>
                              </div>
                            )}
                            {selectedRequest.oldDeedPhoto && (
                              <div className="bg-white p-3 rounded-xl border border-slate-200 sm:col-span-2">
                                <div className="text-[10px] text-slate-400 font-bold">صورة وثيقة قديمة مرفقة</div>
                                <div className="font-bold text-emerald-800 mt-1 flex items-center gap-2">
                                  <span>📎</span>
                                  <span>{selectedRequest.oldDeedPhoto}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 4: Documents */}
                {activeDossierTab === 'documents' && (
                  <div className="space-y-3 text-right">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">الوثائق والمستندات المرفقة</h4>
                      <span className="text-[11px] text-slate-500 font-bold">
                        إجمالي الوثائق: {selectedRequest.documents.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedRequest.documents.map((doc) => (
                        <div key={doc.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-right space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black text-slate-900 truncate" title={doc.name}>
                                {doc.name}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {doc.format} • {doc.size} • {doc.type}
                              </div>
                            </div>
                            <span className="text-xl shrink-0">📄</span>
                          </div>

                          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                              ✓ مؤمن وجاهز
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingDoc(doc);
                                  setIsDocViewerOpen(true);
                                }}
                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition"
                              >
                                <span>👁️</span>
                                <span>معاينة</span>
                              </button>
                              <a
                                href={getAttachmentDownloadHref(doc.url, doc.name)}
                                download={(doc.name || 'document.png').trim()}
                                target="_self"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-[#7A0D1A] text-white hover:bg-[#600a14] px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                              >
                                <span>📥</span>
                                <span>تحميل</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 5: Purpose */}
                {activeDossierTab === 'purpose' && (
                  <div className="space-y-3 text-right">
                    <h4 className="text-xs font-black text-slate-900">سبب الطلب</h4>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
                      {selectedRequest.purpose.reason}
                      {selectedRequest.purpose.description ? ` — ${selectedRequest.purpose.description}` : ''}
                    </div>
                  </div>
                )}

                {/* Tab 6: Messages */}
                {activeDossierTab === 'messages' && (
                  <div className="space-y-3 text-right">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">سجل التواصل مع المواطن</h4>
                      <button
                        type="button"
                        onClick={() => setIsCommunicateModalOpen(true)}
                        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-[#E6BE8A] hover:bg-slate-800"
                      >
                        تواصل جديد
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedRequest.messages.map((m) => (
                        <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{m.senderName}</span>
                            <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                          </div>
                          {m.subject && <div className="font-bold text-slate-800">{m.subject}</div>}
                          <div className="text-slate-700 leading-relaxed">{m.body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 7: Timeline */}
                {activeDossierTab === 'timeline' && (
                  <div className="space-y-3 text-right">
                    <h4 className="text-xs font-black text-slate-900">السجل الزمني للطلب</h4>
                    <div className="space-y-2 border-r-2 border-slate-200 pr-4">
                      {selectedRequest.timeline.map((event) => (
                        <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>{event.action}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{event.timestamp}</span>
                          </div>
                          <div className="text-[11px] text-slate-600">بواسطة: {event.actor}</div>
                          {event.notes && <div className="text-[11px] text-slate-500">{event.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Board */}
                <div className="rounded-2xl border-2 border-slate-900 bg-slate-900 p-4 text-right text-white">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-[#E6BE8A]">لوحة إجراءات العدل</div>
                      <div className="text-xs font-black">ماذا تريد أن تفعل بهذا الطلب؟</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleUpdateCopyRequestStatus('under_study', 'متابعة وتدقيق معالجة الطلب')}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-500"
                      >
                        متابعة المعالجة
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCommSubject('طلب استكمال وثيقة');
                          setIsCommunicateModalOpen(true);
                        }}
                        className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400"
                      >
                        طلب استكمال
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCommunicateModalOpen(true)}
                        className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-500"
                      >
                        مراسلة الطالب
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCompleteModalOpen(true)}
                        className="rounded-xl bg-[#E6BE8A] px-3.5 py-1.5 text-xs font-black text-slate-950 hover:bg-[#d8ae78]"
                      >
                        إنجاز النسخة
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsUnableModalOpen(true)}
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                      >
                        تعذر المعالجة
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal: In-App & WhatsApp Communication */}
      <Transition appear show={isCommunicateModalOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCommunicateModalOpen(false)}>
          <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6" dir="rtl">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <button type="button" onClick={() => setIsCommunicateModalOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200">
                      <X className="h-4 w-4" />
                    </button>
                    <div className="text-right">
                      <Dialog.Title className="text-base font-black text-slate-900">اختيار قناة التواصل</Dialog.Title>
                      <p className="text-xs text-slate-500">الطلب: {selectedRequest?.requestNumber}</p>
                    </div>
                  </div>

                  <div className="p-5 space-y-4 text-right">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCommChannel('inbox')}
                        className={`rounded-xl border p-3 text-right transition ${
                          commChannel === 'inbox' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="text-xs font-black">الصندوق المهني</div>
                        <div className={`text-[10px] mt-1 ${commChannel === 'inbox' ? 'text-white/80' : 'text-slate-500'}`}>
                          سجل رسمي داخل التطبيق
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCommChannel('whatsapp')}
                        className={`rounded-xl border p-3 text-right transition ${
                          commChannel === 'whatsapp' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="text-xs font-black">WhatsApp المباشر</div>
                        <div className={`text-[10px] mt-1 ${commChannel === 'whatsapp' ? 'text-white/80' : 'text-slate-500'}`}>
                          فتح محادثة برقم الطلب
                        </div>
                      </button>
                    </div>

                    {commChannel === 'inbox' ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">الموضوع</label>
                          <input
                            value={commSubject}
                            onChange={(e) => setCommSubject(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">نص الرسالة</label>
                          <textarea
                            rows={4}
                            value={commBody}
                            onChange={(e) => setCommBody(e.target.value)}
                            placeholder="اكتب رسالتك للمواطن هنا..."
                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs leading-relaxed"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-950">
                        سيتم فتح WhatsApp والتواصل على الرقم ({selectedRequest?.requester.phone}) مع تضمين رقم الطلب ({selectedRequest?.requestNumber}) تلقائياً.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button type="button" onClick={() => setIsCommunicateModalOpen(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold">
                      إلغاء
                    </button>
                    {commChannel === 'inbox' ? (
                      <button
                        type="button"
                        onClick={() => void handleSendInAppMessage()}
                        disabled={!commBody.trim() || updateCopyRequestMutation.isPending}
                        className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        إرسال الرسالة
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => triggerWhatsAppContact()}
                        className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-500"
                      >
                        فتح WhatsApp
                      </button>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal: Unable to Process */}
      <Transition appear show={isUnableModalOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsUnableModalOpen(false)}>
          <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6" dir="rtl">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="p-5 space-y-4 text-right">
                    <Dialog.Title className="text-base font-black text-slate-900">تعذر معالجة الطلب بأسلوب مهني</Dialog.Title>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">سبب التعذر:</label>
                      <input
                        value={unableReason}
                        onChange={(e) => setUnableReason(e.target.value)}
                        placeholder="مثال: عدم العثور على أصل الرسم..."
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">التوجيه والإرشاد للمواطن:</label>
                      <textarea
                        rows={3}
                        value={unableGuidance}
                        onChange={(e) => setUnableGuidance(e.target.value)}
                        placeholder="يرجى مراجعة قسم التوثيق بالمحكمة..."
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button type="button" onClick={() => setIsUnableModalOpen(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold">
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleConfirmUnable()}
                      disabled={!unableReason.trim() || updateCopyRequestMutation.isPending}
                      className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      تأكيد التعذر
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal: Complete Request */}
      <Transition appear show={isCompleteModalOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCompleteModalOpen(false)}>
          <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6" dir="rtl">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="p-5 space-y-4 text-right">
                    <Dialog.Title className="text-base font-black text-slate-900">إنجاز واستخراج النسخة</Dialog.Title>
                    <div className="text-xs text-slate-600">حدد تعليمات التسليم للمواطن:</div>
                    <div className="space-y-2 text-xs font-bold text-slate-800">
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 cursor-pointer">
                        <span>النسخة جاهزة للتحميل الفوري</span>
                        <input
                          type="radio"
                          name="delivery"
                          checked={deliveryOption === 'digital_download'}
                          onChange={() => setDeliveryOption('digital_download')}
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 cursor-pointer">
                        <span>الاستلام من مقر مكتب التوثيق العدلي</span>
                        <input
                          type="radio"
                          name="delivery"
                          checked={deliveryOption === 'office_pickup'}
                          onChange={() => setDeliveryOption('office_pickup')}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button type="button" onClick={() => setIsCompleteModalOpen(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold">
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleConfirmComplete()}
                      disabled={updateCopyRequestMutation.isPending}
                      className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-[#E6BE8A] hover:bg-slate-800"
                    >
                      تأكيد الإنجاز
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal: High-Priority Document / Screenshot Viewer */}
      {isDocViewerOpen && viewingDoc && (
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          dir="rtl"
          onClick={() => setIsDocViewerOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
              <div className="text-right">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>📎</span>
                  <span>معاينة الوثيقة: {viewingDoc.name || 'مستند مرفق'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-bold">
                  {viewingDoc.type || 'مرفق مؤيد'} • {viewingDoc.format || 'صورة / وثيقة'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDocViewerOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-black text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 bg-slate-900/5 min-h-[380px] max-h-[68vh] overflow-auto flex items-center justify-center">
              {viewingDoc.name?.match(/\.(docx?|doc)$/i) ? (
                <div className="w-full max-w-3xl rounded-3xl border border-blue-200 bg-white p-6 shadow-xl space-y-4 text-right flex flex-col items-center">
                  <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                        W
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">{viewingDoc.name}</h4>
                        <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          مستند Microsoft Word (.DOCX)
                        </span>
                      </div>
                    </div>
                    <a
                      href={getAttachmentDownloadHref(viewingDoc.url, viewingDoc.name || 'document.docx')}
                      download={(viewingDoc.name || 'document.docx').trim()}
                      target="_self"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-md transition cursor-pointer"
                    >
                      <span>📥</span>
                      <span>تحميل المستند</span>
                    </a>
                  </div>

                  {/* Real Word Document Page Renderer */}
                  <DocxRenderer fileUrl={viewingDoc.url} fileName={viewingDoc.name || 'document.docx'} details={viewingDoc.details} />
                </div>
              ) : viewingDoc.url && viewingDoc.url.startsWith('data:image') ? (
                <img
                  src={viewingDoc.url}
                  alt={viewingDoc.name || 'Attachment Preview'}
                  className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-lg border border-slate-200 bg-white"
                />
              ) : viewingDoc.url && (viewingDoc.url.startsWith('data:application/pdf') || viewingDoc.url.startsWith('http') || viewingDoc.url.startsWith('/') || viewingDoc.name?.endsWith('.pdf')) ? (
                <iframe
                  src={viewingDoc.url}
                  title={viewingDoc.name}
                  className="w-full h-[60vh] rounded-2xl border border-slate-200 bg-white shadow-sm"
                />
              ) : (
                <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-right">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <span className="text-3xl">📜</span>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{viewingDoc.name || 'وثيقة رسمية'}</h4>
                      <p className="text-xs text-slate-500 font-bold">{viewingDoc.type || 'سند إثبات'} • {selectedRequest?.requestNumber}</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs leading-relaxed font-mono text-slate-800 space-y-2">
                    <div><strong>طالب النسخة:</strong> {selectedRequest?.requester.firstName} {selectedRequest?.requester.lastName}</div>
                    <div><strong>رقم البطاقة الوطنية:</strong> {selectedRequest?.requester.cin}</div>
                    <div><strong>الصفة المصرح بها:</strong> {selectedRequest?.capacity.type}</div>
                    {viewingDoc.details && <div><strong>تفاصيل السند:</strong> {viewingDoc.details}</div>}
                  </div>

                  <div className="text-center pt-2">
                    <a
                      href={getAttachmentDownloadHref(viewingDoc.url, viewingDoc.name || 'document.png')}
                      download={(viewingDoc.name || 'document.png').trim()}
                      target="_self"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#7A0D1A] text-white hover:bg-[#600a14] px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition cursor-pointer"
                    >
                      <span>📥</span>
                      <span>تحميل السند / الوثيقة للجهاز</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsDocViewerOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                إغلاق النافذة
              </button>
              <a
                href={getAttachmentDownloadHref(viewingDoc.url, viewingDoc.name || 'document.png')}
                download={(viewingDoc.name || 'document.png').trim()}
                target="_self"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#7A0D1A] px-6 py-2 text-xs font-black text-white hover:bg-[#600a14] shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>📥</span>
                <span>تحميل الوثيقة للجهاز</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
