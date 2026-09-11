import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './index.css';
import './i18n';
import { trpc } from './trpc';
import { languages, navigation } from '../../shared';
import { DateWidget } from './modules/DateWidget';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { MessagingNotificationsProvider } from './contexts/MessagingNotificationsContext.tsx';
import { Login } from './components/auth/Login.tsx';
import { Register } from './components/auth/Register.tsx';
import { DashboardRouter } from './components/DashboardRouter';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Unauthorized } from './components/Unauthorized';
import { LandingPage } from './components/LandingPage';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { OrnateScrollBanner } from './components/common/OrnateScrollBanner';
import { getBackendHttpOrigin } from './utils/backendOrigin';

// Lazily-loaded application modules to eliminate initial bundle bloat (< 300 kB target)
const Dashboard = lazy(() => import('./modules/Dashboard').then((m: any) => ({ default: m.Dashboard || m.default })));
const NotariesModule = lazy(() => import('./modules/Notaries').then((m: any) => ({ default: m.NotariesModule || m.default })));
const NotaryDetails = lazy(() => import('./modules/NotaryDetails').then((m: any) => ({ default: m.NotaryDetails || m.default })));
const FeesModule = lazy(() => import('./modules/Fees').then((m: any) => ({ default: m.FeesModule || m.default })));
const IndexingModule = lazy(() => import('./modules/Indexing').then((m: any) => ({ default: m.IndexingModule || m.default })));
const FinalIndexing = lazy(() => import('./modules/Indexing').then((m: any) => ({ default: m.FinalIndexing || m.default })));
const OngoingIndexing = lazy(() => import('./modules/Indexing').then((m: any) => ({ default: m.OngoingIndexing || m.default })));
const CopyRequestsModule = lazy(() => import('./modules/CopyRequests').then((m: any) => ({ default: m.CopyRequestsModule || m.default })));
const ContractsModule = lazy(() => import('./modules/Contracts').then((m: any) => ({ default: m.ContractsModule || m.default })));
const LegalProceduresModule = lazy(() => import('./modules/LegalProcedures').then((m: any) => ({ default: m.LegalProceduresModule || m.default })));
const StatisticsModule = lazy(() => import('./modules/Statistics').then((m: any) => ({ default: m.StatisticsModule || m.default })));
const FilesMiscModule = lazy(() => import('./modules/FilesMisc').then((m: any) => ({ default: m.FilesMiscModule || m.default })));
const ContractTemplatesModule = lazy(() => import('./modules/ContractTemplates').then((m: any) => ({ default: m.ContractTemplatesModule || m.default })));
const RegistrationStampModule = lazy(() => import('./modules/RegistrationStamp').then((m: any) => ({ default: m.RegistrationStampModule || m.default })));
const SocietyMembersLogin = lazy(() => import('./modules/SocietyMembersLogin').then((m: any) => ({ default: m.SocietyMembersLogin || m.default })));
const MessagingInbox: React.ComponentType<any> = lazy(() => import('./modules/MessagingInbox').then((m: any) => ({ default: m.MessagingInbox || m.default })));
const WorkCertificatesModule = lazy(() => import('./modules/WorkCertificates').then((m: any) => ({ default: m.WorkCertificatesModule || m.default })));
const MarriagesModule = lazy(() => import('./modules/Marriages').then((m: any) => ({ default: m.MarriagesModule || m.default })));
const SubscriptionsModule = lazy(() => import('./modules/Subscriptions').then((m: any) => ({ default: m.SubscriptionsModule || m.default })));
const PublicSubCategoryPage = lazy(() => import('./modules/PublicSubCategoryPage').then((m: any) => ({ default: m.PublicSubCategoryPage || m.default })));
const ProfessionalProgramsPage = lazy(() => import('./modules/knowledge/professionalPrograms').then((m: any) => ({ default: m.ProfessionalProgramsPage || m.default })));
const AudiovisualLibraryPage = lazy(() => import('./modules/knowledge/audiovisualLibrary').then((m: any) => ({ default: m.AudiovisualLibraryPage || m.default })));
const DigitalArchivePage = lazy(() => import('./modules/knowledge/digitalArchive').then((m: any) => ({ default: m.DigitalArchivePage || m.default })));
const MeetingsDialoguesPage = lazy(() => import('./modules/knowledge/meetingsDialogues').then((m: any) => ({ default: m.MeetingsDialoguesPage || m.default })));
const SmartReminderPage = lazy(() => import('./modules/news/smartReminder').then((m: any) => ({ default: m.SmartReminderPage || m.default })));
const LegalNewsPage = lazy(() => import('./modules/news/legalNews').then((m: any) => ({ default: m.LegalNewsPage || m.default })));
const LegislativeChangesPage = lazy(() => import('./modules/news/legislativeChanges').then((m: any) => ({ default: m.LegislativeChangesPage || m.default })));
const NationalCouncilPortal = lazy(() => import('./modules/NationalCouncilPortal').then((m: any) => ({ default: m.NationalCouncilPortal || m.default })));
const NationalExecutiveRequests = lazy(() => import('./modules/NationalExecutiveRequests').then((m: any) => ({ default: m.NationalExecutiveRequests || m.default })));
const SearchArchiveManagement = lazy(() => import('./modules/SearchArchiveManagement').then((m: any) => ({ default: m.SearchArchiveManagement || m.default })));
const ExtractionManagement = lazy(() => import('./modules/ExtractionManagement').then((m: any) => ({ default: m.ExtractionManagement || m.default })));
const DailyLedgerModule = lazy(() => import('./modules/DailyLedger').then((m: any) => ({ default: m.DailyLedgerModule || m.default })));
const NotaryDashboard = lazy(() => import('./components/dashboards/NotaryDashboard').then((m: any) => ({ default: m.NotaryDashboard || m.default })));
const RemoteHearingJoin = lazy(() => import('./pages/RemoteHearingJoin').then((m: any) => ({ default: m.RemoteHearingJoin || m.default })));
const PublicCopyExtractionPage = lazy(() => import('./pages/PublicCopyExtractionPage').then((m: any) => ({ default: m.PublicCopyExtractionPage || m.default })));
const PublicSearchDeedsPage = lazy(() => import('./pages/PublicSearchDeedsPage').then((m: any) => ({ default: m.PublicSearchDeedsPage || m.default })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (failureCount >= 3) return false;
        const status = error?.data?.httpStatus ?? error?.status;
        if (typeof status === 'number' && status >= 400 && status < 500) return false;
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (failureCount >= 2) return false;
        const status = error?.data?.httpStatus ?? error?.status;
        if (typeof status === 'number' && status >= 400 && status < 500) return false;
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
  },
});
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBackendHttpOrigin()}/trpc`,
      headers() {
        try {
          const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
          return token ? { Authorization: `Bearer ${token}` } : {};
        } catch {
          return {};
        }
      },
      fetch: async (url, options) => {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
    }),
  ],
});

const JudgePortal = lazy(() => import('./modules/JudgePortal').then((m) => ({ default: m.JudgePortal || m.default })));
const SocietyPortal = lazy(() => import('./modules/SocietyPortal').then((m) => ({ default: m.SocietyPortal })));
const RegionalCouncilPortal = lazy(() =>
  import('./modules/RegionalCouncilPortal').then((m) => ({ default: m.RegionalCouncilPortal })),
);
const PersonalAnalyticsModule = lazy(() => import('./modules/PersonalAnalytics'));
const RemoteNotarialHearingModule = lazy(() => import('./modules/RemoteNotarialHearing/RemoteNotarialHearingModule'));
const ScientificPermissionPortal = lazy(() => import('./pages/Permissions/ScientificPermissionPortal'));
const MarriagePermissionPortal = lazy(() => import('./pages/Permissions/MarriagePermissionPortal'));
const JudicialFeesPermissionPortal = lazy(() => import('./pages/Permissions/JudicialFeesPermissionPortal'));
const IndividualReceptionPermissionPortal = lazy(() => import('./pages/Permissions/IndividualReceptionPermissionPortal'));
const NotaryNotificationsPage = lazy(() => import('./pages/Notary/NotaryNotificationsPage'));
const WorkCertificatePortal = lazy(() => import('./pages/Notary/WorkCertificatePortal'));
const OfficeMovementPortal = lazy(() => import('./pages/Notary/OfficeMovementPortal'));
const PresidentOfficePortal = lazy(() =>
  import('./modules/PresidentOfficePortal').then((m) => ({ default: m.PresidentOfficePortal })),
);
const CreatorPortal = lazy(() => import('./modules/CreatorPortal').then((m) => ({ default: m.CreatorPortal })));
const AuditHub = lazy(() => import('./modules/AuditHub').then((m) => ({ default: m.AuditHub })));
const ReadyForSignature = lazy(() =>
  import('./modules/ReadyForSignature').then((m) => ({ default: m.ReadyForSignature })),
);
const SovereignSignature = lazy(() =>
  import('./modules/SovereignSignature').then((m) => ({ default: m.SovereignSignature })),
);
const SavedDocumentsGallery = lazy(() =>
  import('./modules/SavedDocumentsGallery').then((m) => ({ default: m.SavedDocumentsGallery })),
);
const SavedDocumentViewer = lazy(() =>
  import('./modules/SavedDocumentViewer').then((m) => ({ default: m.SavedDocumentViewer })),
);
const NotarySigningPortal = lazy(() =>
  import('./pages/NotarySigningPortal/NotarySigningPortal').then((m) => ({ default: m.NotarySigningPortal })),
);
const NotarySignatureWorkarea = lazy(() =>
  import('./pages/NotarySigningPortal/NotarySignatureWorkarea').then((m) => ({ default: m.NotarySignatureWorkarea })),
);
const SignedRasmsPage = lazy(() =>
  import('./pages/SignedRasms/SignedRasmsPage').then((m) => ({ default: m.SignedRasmsPage })),
);
const SignedRasmViewer = lazy(() =>
  import('./pages/SignedRasms/SignedRasmViewer').then((m) => ({ default: m.SignedRasmViewer })),
);
const SecureArchivePage = lazy(() =>
  import('./pages/SecureArchive/SecureArchivePage').then((m) => ({ default: m.SecureArchivePage })),
);
const JudgeEndorsedDeeds = lazy(() =>
  import('./pages/SecureArchive/JudgeEndorsedDeeds').then((m) => ({ default: m.JudgeEndorsedDeeds })),
);
const VerificationPage = lazy(() =>
  import('./pages/SecureArchive/VerificationPage').then((m) => ({ default: m.VerificationPage })),
);
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

type ModuleKey =
  | 'dashboard'
  | 'indexing'
  | 'searchArchive'
  | 'finalIndexing'
  | 'ongoingIndexing'
  | 'copyRequests'
  | 'workCertificates'
  | 'notaries'
  | 'contracts'
  | 'legalProcedures'
  | 'fees'
  | 'auditHub'
  | 'signedRasms'
  | 'savedDocuments'
  | 'subscriptions'
  | 'statistics'
  | 'files'
  | 'contractTemplates'
  | 'misc'
  | 'registrationStamp'
  | 'messages'
  | 'notaryPortal'
  | 'personalAnalytics'
  | 'remoteNotarialHearing'
  | 'ledger'
  | 'nationalExecutiveRequests'
  | 'scientificPermission'
  | 'marriagePermission'
  | 'judicialFeesPermission'
  | 'individualReceptionPermission'
  | 'notaryNotifications'
  | 'workCertificatePortal'
  | 'officeMovementPortal';

const DASHBOARD_LABEL = 'لوحة التحكم';

const [
  NAV_COPY_REQUESTS,
  NAV_WORK_CERTIFICATES,
  NAV_NOTARIES,
  NAV_CONTRACTS,
  NAV_LEGAL_PROCEDURES,
  NAV_FEES,
  NAV_STATISTICS,
  NAV_FILES,
  NAV_CONTRACT_TEMPLATES,
  NAV_MISC,
  NAV_REGISTRATION_STAMP,
] = navigation;

const NationalRequestsManagement = lazy(() => import('./modules/NationalRequestsManagement').then((m: any) => ({ default: m.NationalRequestsManagement || m.default })));

const NAV_ITEMS: { key: ModuleKey | 'permissions' | 'administrative' | 'visitors'; label: string; icon: string; children?: { key: ModuleKey; label: string; icon: string }[] }[] = [
  { key: 'notaryPortal', label: 'لوحة التحكم الرئيسية', icon: '🏛️' },
  {
    key: 'administrative',
    label: 'الطلبات الادارية و المهنية',
    icon: '📂',
    children: [
      { key: 'dashboard', label: 'الطلبات المهنية الوطنية', icon: '⚖️' },
      { key: 'workCertificatePortal', label: 'طلبات شهادة العمل', icon: '💼' },
    ]
  },
  {
    key: 'visitors',
    label: 'طلبات المرتفقين',
    icon: '👥',
    children: [
      { key: 'searchArchive', label: 'طلبات البحث في النظائر وسجلات التضمين', icon: '🔍' },
      { key: 'finalIndexing', label: 'استخراج نسخ الشهادات/ العقود', icon: '🖨️' },
    ]
  },
  { 
    key: 'permissions', 
    label: 'الأذونات و الإشعارات القضائية', 
    icon: '⚖️',
    children: [
      { key: 'notaryNotifications', label: 'مركز الإشعارات القضائية', icon: '🔔' },
      { key: 'scientificPermission', label: 'طلب إذن بتلقي شهادة علمية/مثلية', icon: '🎓' },
      { key: 'marriagePermission', label: 'طلب الاذن بالزواج عبر بوابة العدل', icon: '💍' },
      { key: 'judicialFeesPermission', label: 'طلبات الإذن لاستخراج نسخ/نظائر الرسوم العدلية', icon: '📜' },
      { key: 'individualReceptionPermission', label: 'طلب الإذن بالتلقي الفردي / غير المتزامن', icon: '👤' },
      { key: 'officeMovementPortal', label: 'إشعار التوجه خارج مكتب التعيين', icon: '📍' },
    ]
  },
  { key: 'remoteNotarialHearing', label: 'خدمة التلقي العدلي عن بعد', icon: '🎥' },
  { key: 'personalAnalytics', label: 'الإحصائيات الشخصية التحليلية', icon: '🎯' },
  { key: 'ledger', label: 'سجل البيانات للعمليات الحسابية الالكتروني', icon: '📒' },
  /* { key: 'copyRequests', label: NAV_COPY_REQUESTS, icon: '📋' }, */
  { key: 'ongoingIndexing', label: 'تضمين الشهادات/العقود', icon: '📥' },
  { key: 'workCertificates', label: NAV_WORK_CERTIFICATES, icon: '📄' },
  { key: 'notaries', label: NAV_NOTARIES, icon: '👥' },
  { key: 'legalProcedures', label: NAV_LEGAL_PROCEDURES, icon: '⚖️' },
  { key: 'fees', label: 'تحرير الرسوم العدلية (سجل البيانات الالكتروني)', icon: '💰' },
  { key: 'auditHub', label: 'منصة التضمين والتدقيق', icon: '📝' },
  { key: 'signedRasms', label: 'الرسوم الموقعة', icon: '✍️' },
  { key: 'savedDocuments', label: 'مكتبة الوثائق المحفوظة', icon: '📚' },
  { key: 'subscriptions', label: 'قسم الاشتراكات', icon: '🔔' },
  { key: 'statistics', label: NAV_STATISTICS, icon: '📈' },
  { key: 'contractTemplates', label: NAV_CONTRACT_TEMPLATES, icon: '📑' },
  { key: 'messages', label: 'صندوق الرسائل', icon: '✉️' },
];

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <select
      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {Object.entries(languages).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

// --- Use Context for Logout ---
import { useAuth } from './contexts/AuthContext';
import { useMessagingNotifications } from './contexts/MessagingNotificationsContext';

// Helper component to add logout logic inside Layout
function SidebarFooter() {
  const { logout, user, notaryProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  return (
    <div className="p-4 bg-black/10 border-t border-[#0891b2]/20 mt-auto relative z-10">
       <div className="flex items-center gap-3 mb-4 px-2">
         <div className="w-10 h-10 rounded-full border border-[#0891b2]/30 overflow-hidden bg-gradient-to-br from-[#0891b2] to-[#0891b2] flex items-center justify-center text-sm font-bold text-[#5a0c0b] shadow-inner">
           {notaryProfile?.profile_picture_url ? (
             <img 
               src={notaryProfile.profile_picture_url} 
               alt="Profile" 
               className="w-full h-full object-cover" 
             />
           ) : (
             <span>{user?.full_name?.charAt(0) || 'A'}</span>
           )}
         </div>
         <div className="flex-1 overflow-hidden text-right">
           <p className="text-sm font-bold text-white truncate">{user?.full_name || 'عدل ممارس'}</p>
           <p className="text-xs text-[#0891b2] truncate opacity-80">بوابة العدل</p>
         </div>
       </div>
       
       <button 
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-[#0891b2] hover:bg-[#0891b2] text-[#5a0c0b] py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
       >
         <span>🚪</span>
         <span>تسجيل الخروج</span>
       </button>
    </div>
  );
}

function LegacySavedDocumentsRedirect() {
  const { id } = useParams<{ id?: string }>();
  const target = id ? `/dashboard?module=auditHub&id=${id}` : '/dashboard?module=auditHub';
  return <Navigate to={target} replace />;
}

function RouteLoader() {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <div className="rounded-2xl border border-slate-200 bg-white/90 px-6 py-4 text-center shadow-sm backdrop-blur">
        <div className="text-sm font-semibold text-slate-700">جاري تحميل الواجهة...</div>
        <div className="mt-2 text-xs text-slate-500">يتم تحميل القسم المطلوب فقط لتسريع الفتح.</div>
      </div>
    </div>
  );
}

export function Layout({ initialModule = 'dashboard' }: { initialModule?: ModuleKey }) {
  const { i18n } = useTranslation();
  const { user, notaryProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routeParams = useParams<{ id?: string }>();
  const [active, setActive] = React.useState<ModuleKey>(initialModule);
  const [permissionsExpanded, setPermissionsExpanded] = React.useState(false);
  const [adminExpanded, setAdminExpanded] = React.useState(false);
  const [visitorsExpanded, setVisitorsExpanded] = React.useState(false);
  const { unreadTotal, decisionsTotal, judgeRequestsTotal, judgePermissionsTotal, judgeAdlCopyPermissionsTotal, permissionsCounts, adminCounts, notaryNotificationsTotal, unseenCopyRequestsTotal } = useMessagingNotifications();

  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const isArabic = (i18n.language || '').toLowerCase().startsWith('ar');
  const sidebarOnRight = true;

  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [active, location.pathname, location.search]);

  React.useEffect(() => {
    setActive(initialModule);
  }, [initialModule]);

  React.useEffect(() => {
    const path = location.pathname;
    if (path === '/messages') {
      setActive('messages');
    } else if (path === '/files') {
      setActive('files');
    } else if (path === '/statistics') {
      setActive('statistics');
    } else if (path === '/search') {
      setActive('indexing');
    } else if (path === '/notary-notifications') {
      setActive('notaryNotifications');
    } else if (path === '/work-certificate-portal') {
      setActive('workCertificatePortal');
    } else if (path === '/office-movement-portal') {
      setActive('officeMovementPortal');
    } else if (path === '/dashboard') {
      setActive('dashboard');
    } else if (path === '/signed-rasms' || path.startsWith('/signed-rasms/')) {
      setActive('signedRasms');
    } else if (path === '/saved-documents' || path.startsWith('/saved-documents/')) {
      setActive('savedDocuments');
    } else if (path === '/fees') {
      setActive('fees');
    }
  }, [location.pathname]);

  React.useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  }, [i18n.language, isArabic]);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const moduleParam = searchParams.get('module');
    if (!moduleParam) {
      if (location.pathname === '/search') {
        setActive('indexing');
      } else if (location.pathname === '/fees') {
        setActive('fees');
      }
      return;
    }
    
    // Check if the module key exists in top-level items or their children, or is a recognized module like indexing
    const isValidModule = moduleParam === 'indexing' || NAV_ITEMS.some((item) => 
      item.key === moduleParam || (item.children && item.children.some(child => child.key === moduleParam))
    );
    
    if (isValidModule) {
      setActive(moduleParam as ModuleKey);
    }
  }, [location.search, location.pathname]);

  const renderModule = () => {
    switch (active) {
      case 'dashboard':
        if (user?.role === 'notary') return <NationalRequestsManagement />;
        return <Dashboard />;
      case 'indexing':
        return <IndexingModule />;
      case 'searchArchive':
        return <SearchArchiveManagement />;
      case 'finalIndexing':
        return <ExtractionManagement />;
      case 'ongoingIndexing':
        return <OngoingIndexing />;
      case 'notaries':
        return <NotariesModule />;
      case 'fees':
        return <FeesModule />;
      case 'auditHub':
        return <AuditHub />;
      case 'signedRasms':
        const rasmId = new URLSearchParams(location.search).get('id') || routeParams?.id;
        if (rasmId) return <SignedRasmViewer />;
        return <SignedRasmsPage />;
      case 'savedDocuments':
        const savedDocId = new URLSearchParams(location.search).get('id') || routeParams?.id;
        if (savedDocId) return <SavedDocumentViewer />;
        return <SavedDocumentsGallery />;
      case 'subscriptions':
        return <SubscriptionsModule />;
      case 'copyRequests':
        return <CopyRequestsModule />;
      case 'contracts':
        return <ContractsModule />;
      case 'legalProcedures':
        return <LegalProceduresModule />;
      case 'statistics':
        return <StatisticsModule />;
      case 'files':
      case 'misc':
        return <FilesMiscModule />;
      case 'contractTemplates':
        return <ContractTemplatesModule />;
      case 'registrationStamp':
        return <RegistrationStampModule />;
      case 'messages':
        return <MessagingInbox mode="notary" />;
      case 'nationalExecutiveRequests':
        return <NationalExecutiveRequests />;
      case 'workCertificates':
        return <WorkCertificatesModule />;
      case 'notaryPortal':
        return <NotaryDashboard />;
      case 'notaryNotifications':
        return <NotaryNotificationsPage />;
      case 'personalAnalytics':
        return <PersonalAnalyticsModule />;
      case 'ledger':
        return <DailyLedgerModule />;
      case 'remoteNotarialHearing':
        return <RemoteNotarialHearingModule />;
      case 'workCertificatePortal':
        return <WorkCertificatePortal />;
      case 'officeMovementPortal':
        return <OfficeMovementPortal />;
      case 'scientificPermission':
        return <ScientificPermissionPortal />;
      case 'marriagePermission':
        return <MarriagePermissionPortal />;
      case 'judicialFeesPermission':
        return <JudicialFeesPermissionPortal />;
      case 'individualReceptionPermission':
        return <IndividualReceptionPermissionPortal />;
      default:
        if (user?.role === 'notary') return <NotaryDashboard />;
        return <Dashboard />;
    }
  };

  const currentLabel = React.useMemo(() => {
    if (active === 'indexing') {
      const modeParam = new URLSearchParams(location.search).get('mode');
      return modeParam === 'ongoing' ? 'سجل التضمين' : 'استخراج نسخ الشهادات/ العقود';
    }
    for (const item of NAV_ITEMS) {
      if (item.key === active) return item.label;
      if (item.children) {
        const child = item.children.find(c => c.key === active);
        if (child) return child.label;
      }
    }
    return DASHBOARD_LABEL;
  }, [active, location.search]);

  const [permissionsManuallyClosed, setPermissionsManuallyClosed] = React.useState(false);
  const [adminManuallyClosed, setAdminManuallyClosed] = React.useState(false);
  const [visitorsManuallyClosed, setVisitorsManuallyClosed] = React.useState(false);

  // Auto-expand sections only when the active module changes to a child
  React.useEffect(() => {
    const isPermissionChildActive = NAV_ITEMS.find(i => i.key === 'permissions')?.children?.some(c => c.key === active);
    if (isPermissionChildActive && !permissionsManuallyClosed) {
      setPermissionsExpanded(true);
    }
    
    const isAdminChildActive = NAV_ITEMS.find(i => i.key === 'administrative')?.children?.some(c => c.key === active);
    if (isAdminChildActive && !adminManuallyClosed) {
      setAdminExpanded(true);
    }

    const isVisitorsChildActive = NAV_ITEMS.find(i => i.key === 'visitors')?.children?.some(c => c.key === active);
    if (isVisitorsChildActive && !visitorsManuallyClosed) {
      setVisitorsExpanded(true);
    }
    
    // If we move away from a child, reset the manual close flags for next time
    if (!isPermissionChildActive) setPermissionsManuallyClosed(false);
    if (!isAdminChildActive) setAdminManuallyClosed(false);
    if (!isVisitorsChildActive) setVisitorsManuallyClosed(false);
  }, [active]);

  return (
    <div className="flex h-screen w-full bg-slate-100 text-slate-900 overflow-hidden" dir="ltr">
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop Persistent + Mobile Slide-Over Drawer) */}
      <aside
        dir={isArabic ? 'rtl' : 'ltr'}
        className={`order-2 w-72 bg-gradient-to-b from-[#5a0c0b] via-[#800020] to-[#450a0a] text-white shadow-2xl z-50 ${
          sidebarOnRight ? 'border-l-4' : 'border-r-4'
        } border-[#0891b2] transition-transform duration-300 flex flex-col h-full flex-shrink-0 font-kufi overflow-hidden ${
          mobileSidebarOpen
            ? 'fixed inset-y-0 right-0 max-w-[85vw] translate-x-0'
            : 'hidden md:flex relative'
        }`}
      >
        {/* Luxury Grand Moroccan Islamic Pattern Watermark */}
        <div className="absolute inset-0 moroccan-luxury-pattern pointer-events-none z-0"></div>

        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0891b2] via-cyan-400 to-[#0891b2] z-10"></div>

        {/* Sidebar Header */}
        <div className="p-4 bg-gradient-to-b from-[#5a0c0b]/90 to-[#450a0a]/90 backdrop-blur-[1px] border-b border-[#0891b2]/30 group relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0891b2] to-cyan-500 rounded-xl flex items-center justify-center text-[#5a0c0b] font-bold text-xl shadow-lg shadow-cyan-400/40 group-hover:scale-110 transition-transform">
                ⚖️
            </div>
            <div>
               <h1 className="text-xl font-black text-white leading-tight tracking-tight font-maghribi">بوابة العدل</h1>
               <p className="text-[11px] text-[#0891b2] opacity-90 font-medium font-kufi">الخدمات المهنية</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto py-4 px-2.5 scrollbar-thin scrollbar-thumb-[#0891b2]/80 scrollbar-track-gray-800/40 scrollbar-thumb-rounded-full hover:scrollbar-thumb-[#0891b2] relative z-10">
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              const matchesModule = (m: string) => item.children?.some(c => c.key === m);
              const isChildActive = matchesModule(active);
              const isExpanded = item.key === 'administrative' ? adminExpanded : (item.key === 'visitors' ? visitorsExpanded : permissionsExpanded);
              const setExpanded = item.key === 'administrative' ? setAdminExpanded : (item.key === 'visitors' ? setVisitorsExpanded : setPermissionsExpanded);
              const setManuallyClosed = item.key === 'administrative' ? setAdminManuallyClosed : (item.key === 'visitors' ? setVisitorsManuallyClosed : setPermissionsManuallyClosed);

              const groupBadgeCount = (() => {
                 if (item.key === 'permissions') {
                   return decisionsTotal || 0;
                 }
                 if (item.key === 'administrative') {
                   return (adminCounts.workCertificate || 0);
                 }
                 return 0;
              })();

              return (
                <div key={item.key} className="space-y-1">
                   <button
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-right text-xs font-bold transition-all duration-200 group relative overflow-hidden ${
                      isExpanded || isChildActive
                        ? `bg-gradient-to-r from-[#0891b2]/25 to-[#0891b2]/10 text-[#0891b2] shadow-lg shadow-cyan-400/20 border border-[#0891b2]/40`
                        : 'text-gray-100 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const nextState = !isExpanded;
                      setExpanded(nextState);
                      if (!nextState) setManuallyClosed(true);
                      else setManuallyClosed(false);
                    }}
                  >
                    <span className="text-xl transition-all duration-200 flex-shrink-0">
                      <span>{item.icon}</span>
                    </span>
                    <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{item.label}</span>
                        {!isExpanded && groupBadgeCount > 0 && (
                          <span className="rounded-full bg-cyan-600 px-1.5 py-0.5 text-[9px] text-white animate-pulse">
                            {groupBadgeCount}
                          </span>
                        )}
                      </span>
                      <span className={`transition-transform duration-300 text-[10px] ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </span>
                  </button>
                  {isExpanded && (
                    <div
                      className={`${isArabic ? 'mr-6 border-r-2 pr-3' : 'ml-6 border-l-2 pl-3'} space-y-1 border-[#0891b2]/20 mt-1 mb-2`}
                    >
                       {item.children.map((child) => {
                         const childBadgeCount = (() => {
                           if (child.key === 'scientificPermission') return permissionsCounts.scientific;
                           if (child.key === 'notaryNotifications') return decisionsTotal;
                           if (child.key === 'marriagePermission') return permissionsCounts.marriage;
                           if (child.key === 'judicialFeesPermission') return permissionsCounts.judicialFees;
                           if (child.key === 'individualReceptionPermission') return permissionsCounts.individualReception;
                           if (child.key === 'officeMovementPortal') return permissionsCounts.officeMovement;
                           if (child.key === 'workCertificatePortal') return adminCounts.workCertificate;
                           return 0;
                         })();

                         return (
                           <button
                              key={child.key}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-right text-xs font-bold transition-all duration-200 group relative ${
                                active === child.key
                                  ? 'bg-[#0891b2]/30 text-[#0891b2] border border-[#0891b2]/40 shadow-sm scale-[1.01]'
                                  : 'text-gray-300 hover:text-white hover:bg-white/5'
                              }`}
                              onClick={() => navigate(`?module=${child.key}`)}
                           >
                             <span className={`text-base ${active === child.key ? 'scale-110 drop-shadow-sm' : ''}`}>
                               <span>{child.icon}</span>
                             </span>
                             <span className="flex flex-1 items-center justify-between gap-2 min-w-0 overflow-hidden">
                               <span className="truncate flex-1 text-right">{child.label}</span>
                               {childBadgeCount > 0 && (
                                 <span className="rounded-full bg-cyan-600 px-1.5 py-0.5 text-[8px] text-white flex-shrink-0 min-w-[1rem] text-center shadow-sm ring-1 ring-white/20">
                                   {childBadgeCount}
                                 </span>
                               )}
                             </span>
                             {active === child.key && (
                                <div
                                  className={`absolute ${sidebarOnRight ? 'left-0 rounded-l-full' : 'right-0 rounded-r-full'} top-1 bottom-1 w-1 bg-[#0891b2]`}
                                ></div>
                             )}
                           </button>
                         );
                       })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.key}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-right text-xs font-bold transition-all duration-200 group relative overflow-hidden ${
                  active === item.key
                    ? `bg-gradient-to-r from-[#0891b2]/25 to-[#0891b2]/10 text-[#0891b2] shadow-lg shadow-cyan-400/20 border border-[#0891b2]/40`
                    : 'text-gray-100 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => navigate(`?module=${item.key}`)}
              >
                {/* Active Indicator */}
                {active === item.key && (
                  <div
                    className={`absolute ${sidebarOnRight ? 'left-0 rounded-l-full' : 'right-0 rounded-r-full'} top-0 bottom-0 w-1 bg-gradient-to-b from-[#0891b2] to-amber-300 shadow-md`}
                  ></div>
                )}
                
                {/* Icon */}
                <span className={`text-xl transition-all duration-200 flex-shrink-0 ${
                  active === item.key 
                    ? 'scale-110 drop-shadow-lg' 
                    : 'group-hover:scale-105'
                }`}>
                  <span>{item.icon}</span>
                </span>

                <span className="flex flex-1 items-center justify-between gap-3">
                  <span className={`transition-all ${active === item.key ? 'text-[#0891b2] text-cyan-400ase' : 'text-gray-100 group-hover:text-white'}`}>
                    <span>{item.label}</span>
                  </span>
                  {item.key === 'messages' && unreadTotal > 0 ? (
                    <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white/20 flex-shrink-0">
                      <span>{unreadTotal}</span>
                    </span>
                  ) : null}
                </span>
                
                {/* Hover Effect */}
                {active !== item.key && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0891b2]/0 to-[#0891b2]/0 group-hover:from-[#0891b2]/5 group-hover:to-[#0891b2]/10 rounded-2xl transition-all"></div>
                )}
              </button>
            );
          })}

          <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#0891b2]/20 to-transparent" aria-hidden="true" />


          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-xs font-bold transition-all duration-200 text-gray-100/80 hover:text-white hover:bg-white/10 group relative"
            onClick={() => window.open('https://topox.ma', '_blank', 'noopener,noreferrer')}
          >
            <span className="text-lg group-hover:scale-110 transition-transform">
              <span>🗺️</span>
            </span>
            <span className="truncate">الوضعية الطبوغرافية</span>
          </button>

          {user?.role === 'notary' ? (
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-xs font-bold transition-all duration-200 text-gray-100/80 hover:text-white hover:bg-white/10 group relative"
              onClick={() => window.location.assign('http://127.0.0.1:8001')}
            >
              <span className="text-lg group-hover:scale-110 transition-transform">
                <span>🤖</span>
              </span>
              <span className="truncate">الذكاء القانوني</span>
            </button>
          ) : null}

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-xs font-bold transition-all duration-200 text-gray-100/80 hover:text-white hover:bg-white/10 group relative"
            onClick={() => alert('سيتم إضافة الرابط لاحقاً')}
          >
            <span className="text-lg group-hover:scale-110 transition-transform">
              <span>📄</span>
            </span>
            <span className="truncate">فواتير التسجيل والتمبر</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-xs font-bold transition-all duration-200 text-gray-100/80 hover:text-white hover:bg-white/10 group relative"
            onClick={() =>
              window.open(
                'https://enr.tax.gov.ma/enregistrement/login?ctx=%2Fenregistrement',
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            <span className="text-lg group-hover:scale-110 transition-transform">
              <span>🏦</span>
            </span>
            <span className="truncate">مصلحة تسجيل الرسوم</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-xs font-bold transition-all duration-200 text-gray-100/80 hover:text-white hover:bg-white/10 group relative"
            onClick={() => window.open('https://ancfcc.gov.ma/CertificatPropriete', '_blank', 'noopener,noreferrer')}
          >
            <span className="text-lg group-hover:scale-110 transition-transform">
              <span>📋</span>
            </span>
            <span className="truncate">شهادة الملكية</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-xs font-bold transition-all duration-200 text-gray-100/80 hover:text-white hover:bg-white/10 group relative"
            onClick={() => window.open('https://ancfcc.gov.ma/consultationpdfpage/', '_blank', 'noopener,noreferrer')}
          >
            <span className="text-lg group-hover:scale-110 transition-transform">
              <span>✓</span>
            </span>
            <span className="truncate">التحقق من الوثائق</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-xs font-bold transition-all duration-200 text-gray-100/80 hover:text-white hover:bg-white/10 group relative"
            onClick={() => window.open('https://portailwakala.justice.gov.ma/wizard', '_blank', 'noopener,noreferrer')}
          >
            <span className="text-lg group-hover:scale-110 transition-transform">
              <span>📜</span>
            </span>
            <span className="truncate">البوابة الإلكترونية للوكالات</span>
          </button>
        </nav>
        
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#0891b2]/20 to-transparent mx-4"></div>

        {/* Footer with Logout */}
        <SidebarFooter />

        {/* Decorative Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0891b2] via-cyan-400 to-[#0891b2]"></div>
      </aside>

      {/* Main area */}
      <main className="order-1 flex flex-1 flex-col min-w-0" dir={isArabic ? 'rtl' : 'ltr'}>
        {/* Header with logos and app name */}
        <header className="border-b bg-gradient-to-b from-[#E2E4E7] via-[#F1F2F4] to-white shadow-sm overflow-hidden relative">
          {/* Subtle light pattern overlay */}
          <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')] pointer-events-none"></div>
          
          <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 relative z-10">
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Mobile Sidebar Hamburger Toggle */}
              <button
                type="button"
                onClick={() => setMobileSidebarOpen((prev) => !prev)}
                className="p-2 md:hidden rounded-xl bg-white/90 border border-slate-200 text-slate-800 hover:bg-slate-100 shadow-sm focus:outline-none transition-all"
                aria-label="القائمة"
              >
                <span className="text-xl leading-none">☰</span>
              </button>

              <div className="p-1 bg-white/80 rounded-xl shadow-sm border border-white backdrop-blur-sm">
                <img
                  src="/logos/morocco-coat.jpg"
                  alt="شعار المملكة المغربية"
                  className="h-9 sm:h-12 w-auto object-contain drop-shadow-sm"
                />
              </div>
              <div className="text-right leading-tight font-maghribi select-none">
                <div className="text-sm sm:text-xl font-[800] text-slate-800 tracking-normal">
                  <span>المملكة المغربية</span>
                </div>
                <div className="text-xs sm:text-xl font-[800] text-slate-600 tracking-normal">
                  <span>الهيئة الوطنية للعدول</span>
                </div>
              </div>
            </div>

            {/* Centered Identity Spot - Hidden on mobile screens to prevent overlap */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center pointer-events-none">
              <div className="pointer-events-auto">
                {user?.role === 'notary' && (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-tr from-[#0891b2] via-cyan-400 to-[#0891b2] rounded-full blur-md opacity-40 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                    <div className="relative h-14 w-14 rounded-full border-2 border-white shadow-xl overflow-hidden bg-white/50 backdrop-blur-md transition-transform duration-500 group-hover:scale-105">
                        {notaryProfile?.profile_picture_url ? (
                          <img 
                            src={notaryProfile.profile_picture_url} 
                            alt="Notary" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-xl">👤</div>
                        )}
                        {/* Active Status Badge */}
                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5">
              {/* Notifications Hub */}
              <div className="flex items-center gap-2.5">
                {/* Messages */}
                <button
                  onClick={() => {
                    setActive('messages');
                    navigate('/messages');
                  }}
                  className="relative p-2 bg-white/80 rounded-xl shadow-sm border border-white hover:bg-white transition-all group"
                  title="الرسائل"
                >
                  <span className="text-lg group-hover:rotate-12 transition-transform">📬</span>
                  {unreadTotal > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-blue-600 border border-white text-[9px] font-black text-white animate-pulse">
                      {unreadTotal > 99 ? '99+' : unreadTotal}
                    </span>
                  )}
                </button>

                {/* Judicial Notifications (Bell) */}
                {(user?.role === 'notary' || user?.role === 'authentication_judge') && (
                  (() => {
                    const bellCount = user?.role === 'authentication_judge'
                      ? (judgeRequestsTotal + judgePermissionsTotal + judgeAdlCopyPermissionsTotal)
                      : decisionsTotal;

                    return (
                      <button
                        onClick={() => {
                          if (user?.role === 'authentication_judge') {
                            navigate('/judge/notifications');
                          } else {
                            setActive('notaryNotifications');
                            navigate('/notary-notifications');
                          }
                        }}
                        className="relative p-2 bg-white/80 rounded-xl shadow-sm border border-white hover:bg-white transition-all group"
                        title={user?.role === 'authentication_judge' ? 'طلبات جديدة' : 'تنبيهات القرارات القضائية'}
                      >
                        <span className="text-lg group-hover:scale-110 transition-transform">🔔</span>
                        {bellCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-cyan-600 border border-white text-[9px] font-black text-white animate-pulse shadow-sm">
                            {bellCount > 99 ? '99+' : bellCount}
                          </span>
                        )}
                      </button>
                    );
                  })()
                )}
              </div>

              <div className="flex flex-col items-end gap-1 pr-4 border-r border-slate-300/50">
                <div className="bg-white/90 px-3.5 py-1 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm text-xs">
                   <div className="text-slate-700 font-bold">
                     <DateWidget />
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <span>اللغة الاختيارية</span>
                  </span>
                  <div className="scale-75 origin-right">
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
              
              <div className="p-1.5 bg-white/80 rounded-2xl shadow-sm border border-white group backdrop-blur-sm">
                <img
                  src="/logos/adoul-logo.jpg"
                  alt="شعار الهيئة الوطنية للعدول"
                  className="h-12 sm:h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>

          <div className="flex h-20 items-center justify-center relative px-8 -mt-5 mb-1 no-print select-none">
            {/* The "Islamic Geometry Scroll" Ornaments */}
            
            {/* Banner Main Body */}
            <OrnateScrollBanner className="group">

               <span className="text-center text-xl sm:text-2xl font-black font-maghribi tracking-normal drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] px-10 group-hover:scale-[1.01] transition-transform duration-700">
                  <span className="text-white drop-shadow-[0_0_20px_rgba(230,190,138,0.4)]">
                    النظام الذكي للتدبير و الادارة الوثائقية للرسوم العدلية
                  </span>
               </span>

               {/* Right Status Badge */}
               <div className="absolute left-8 hidden 2xl:flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-lg border border-cyan-400/20 backdrop-blur-md shadow-xl translate-x-6">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ring-2 ring-green-500/20"></span>
                  <span className="text-[11px] font-black uppercase text-[#0891b2] tracking-wider">
                    {currentLabel}
                  </span>
               </div>
            </OrnateScrollBanner>

          </div>

          {/* Decorative Descaling Line Under Header */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5a0c0b] via-[#800020] to-[#5a0c0b] shadow-[0_2px_4px_rgba(0,0,0,0.1)]"></div>
        </header>

        <div className={`flex-1 min-w-0 overflow-auto ${active === 'auditHub' || (active as string) === 'notarySigning' ? 'p-0' : 'p-4 lg:p-5'}`}>
          <Suspense fallback={<RouteLoader />}>{renderModule()}</Suspense>
        </div>
      </main>
    </div>
  );
}

function DashboardWrapper() {
  const { user } = useAuth();
  if (user?.role === 'notary') {
    return <Layout initialModule="notaryPortal" />;
  }
  return <DashboardRouter />;
}

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <MessagingNotificationsProvider>
            <Suspense fallback={<RouteLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/public/copy-extraction" element={<PublicCopyExtractionPage />} />
              <Route path="/public/search-deeds" element={<PublicSearchDeedsPage />} />
              <Route path="/public-copy-extraction" element={<Navigate to="/public/copy-extraction" replace />} />
              <Route path="/public-search-deeds" element={<Navigate to="/public/search-deeds" replace />} />
              <Route path="/knowledge/professional-programs" element={<ProfessionalProgramsPage />} />
              <Route path="/knowledge/audiovisual-library" element={<AudiovisualLibraryPage />} />
              <Route path="/knowledge/digital-archive" element={<DigitalArchivePage />} />
              <Route path="/knowledge/meetings-dialogues" element={<MeetingsDialoguesPage />} />
              <Route path="/news/smart-reminder" element={<SmartReminderPage />} />
              <Route path="/news/legal-news" element={<LegalNewsPage />} />
              <Route path="/news/legislative-changes" element={<LegislativeChangesPage />} />
              <Route path="/pages/:slug" element={<PublicSubCategoryPage />} />
              <Route path="/remote-hearing/join" element={<RemoteHearingJoin />} />
              <Route path="/directory" element={<NotariesModule />} />
              <Route path="/directory/:id" element={<NotaryDetails />} />
              <Route path="/society-members" element={<SocietyMembersLogin />} />
              <Route
                path="/judge/*"
                element={
                  <ProtectedRoute allowedRoles={['authentication_judge', 'regional_judge', 'supreme_judge']}>
                    <JudgePortal />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route
                path="/society/*"
                element={
                  <ProtectedRoute allowedRoles={['society_member']} redirectTo="/society-members">
                    <SocietyPortal />
                  </ProtectedRoute>
                }
              />
              
              {/* Protected routes - Role-based dashboards */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardWrapper />
                  </ProtectedRoute>
                } 
              />
              
              {/* Protected routes - Modules (mainly for notaries) */}
              <Route 
                path="/marriages" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="workCertificates" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/fees" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="fees" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/contracts" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="contracts" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/statistics" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="statistics" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/files" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="files" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/search" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="indexing" />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="messages" />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/notary-portal/*" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="notaryPortal" />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/notary-notifications"
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="notaryNotifications" />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/work-certificate-portal" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="workCertificatePortal" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/office-movement-portal" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="officeMovementPortal" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/regional-council/*" 
                element={
                  <ProtectedRoute allowedRoles={['regional_adoul_council']}>
                    <RegionalCouncilPortal />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/national-council/*" 
                element={
                  <ProtectedRoute allowedRoles={['national_notary_authority']}>
                    <NationalCouncilPortal />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/president-office/*" 
                element={
                  <ProtectedRoute allowedRoles={['president_office']}>
                    <PresidentOfficePortal />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/creator/*" 
                element={
                  <ProtectedRoute allowedRoles={['creator']}>
                    <CreatorPortal />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/ready-for-signature" 
                element={
                  <ProtectedRoute allowedRoles={['notary', 'judge']}>
                    <ReadyForSignature />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/ready-for-signature/:id" 
                element={
                  <ProtectedRoute allowedRoles={['notary', 'judge']}>
                    <ReadyForSignature />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/sovereign-signature" 
                element={
                  <ProtectedRoute allowedRoles={['notary', 'judge']}>
                    <SovereignSignature />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/sovereign-signature/:id" 
                element={
                  <ProtectedRoute allowedRoles={['notary', 'judge']}>
                    <SovereignSignature />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/saved-documents" 
                element={
                  <ProtectedRoute allowedRoles={['notary', 'judge']}>
                    <Layout initialModule="savedDocuments" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/saved-documents/:id" 
                element={
                  <ProtectedRoute allowedRoles={['notary', 'judge']}>
                    {/* The Layout component handles internal parsing of ?id= via renderModule */}
                    <Layout initialModule="savedDocuments" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/signed-rasms" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <Layout initialModule="signedRasms" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/signed-rasms/:id" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    {/* The Layout component handles internal parsing of ?id= via renderModule */}
                    <Layout initialModule="signedRasms" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/secure-archive" 
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <SecureArchivePage />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/judge-endorsed-deeds"
                element={
                  <ProtectedRoute allowedRoles={['notary']}>
                    <JudgeEndorsedDeeds />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/verify/:token" 
                element={<VerificationPage />} 
              />
              <Route 
                path="/notary-signing-portal" 
                element={
                  <ProtectedRoute allowedRoles={['notary', 'judge']}>
                    <NotarySigningPortal />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/notary-signing-portal/sign/:id" 
                element={
                  <ProtectedRoute allowedRoles={['notary', 'judge']}>
                    <NotarySignatureWorkarea />
                  </ProtectedRoute>
                } 
              />
              {/* 404 Not Found fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
            </MessagingNotificationsProvider>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// Modified Layout component to accept moduleKey prop
function LayoutWrapper({ moduleKey }: { moduleKey: ModuleKey }) {
  return <Layout initialModule={moduleKey} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
