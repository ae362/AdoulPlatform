import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMessagingNotifications } from '../contexts/MessagingNotificationsContext';
import { trpc } from '../trpc';
import { JudgeOfficialIndexation } from './JudgeOfficialIndexation';
import { MessagingInbox } from './MessagingInbox';
import JudgeNotificationsPage from '../pages/Judge/JudgeNotificationsPage';
import { JudgeRemoteHearings } from './JudgeRemoteHearings';
import { DateWidget } from './DateWidget';
import { OrnateScrollBanner } from '../components/common/OrnateScrollBanner';
import ScientificPermissionsProcessingPage from '../pages/Judge/ScientificPermissionsProcessingPage';
import MarriagePermissionsProcessingPage from '../pages/Judge/MarriagePermissionsProcessingPage';
import JudicialFeesPermissionsProcessingPage from '../pages/Judge/JudicialFeesPermissionsProcessingPage';
import IndividualReceptionPermissionsProcessingPage from '../pages/Judge/IndividualReceptionPermissionsProcessingPage';
import OfficeMovementProcessingPage from '../pages/Judge/OfficeMovementProcessingPage';
import WorkCertificateProcessingPage from '../pages/Judge/WorkCertificateProcessingPage';
import JudicialDeedsDashboard from '../pages/Judge/JudicialDeedsPlatform/JudicialDeedsDashboard';
import JudicialDeedsAuditPlatform from '../pages/Judge/JudicialDeedsPlatform/JudicialDeedsAuditPlatform';
import { JudicialOversightManagement } from './JudicialOversightManagement';
import { JudgeFinalArchiving } from './JudgeFinalArchiving';
import { JudicialSpeechModule } from './JudicialSpeech';
import { JudicialPdfViewer } from '../components/JudicialPdfViewer';

const JUDGE_NAV: Array<{ 
  path: string; 
  label: string; 
  icon: string; 
  subItems?: Array<{ path: string; label: string; icon: string }> 
}> = [
  { path: '/judge', label: 'لوحة القاضي', icon: '🏛️' },
  { path: '/judge/official', label: 'الفهرسة القضائية', icon: '🔎' },
  { path: '/judge/notifications', label: 'الإشعارات القضائية', icon: '📬' },
  { path: '/judge/office-movement', label: 'بوابة إشعار التوجه خارج مكتب التعيين', icon: '📍' },
  { 
    path: '/judge/admin-management', 
    label: 'التدبير الإداري', 
    subItems: [
      { path: '/judge/work-certificates', label: 'شواهد العمل والوضعية المهنية', icon: '📃' },
    ]
  },
  { 
    path: '/judge/permissions', 
    label: 'بوابة الأذونات القضائية', 
    icon: '⚖️',
    subItems: [
      { path: '/judge/scientific-permissions', label: 'إذن بالشهادة العلمية', icon: '🎓' },
      { path: '/judge/marriage-permissions', label: 'الزواج والاستلحاق', icon: '💍' },
      { path: '/judge/adl-copy-permissions', label: 'النسخ والنظائر', icon: '📜' },
      { path: '/judge/individual-reception', label: 'التلقي الفردي', icon: '👤' },
    ]
  },
  { path: '/judge/deeds', label: 'رواق الفحص القانوني و الشكلي للرسوم العدلية و القبول للتضمين', icon: '📥' },
  { path: '/judge/remote-hearings', label: 'التلقي عن بُعد', icon: '🎥' },
  { path: '/judge/correspondence', label: 'الصادرات والواردات/المجلس الجهوي', icon: '📨' },
  { path: '/judge/notaries', label: 'سجل العدل', icon: '🪪' },
  { path: '/judge/reports', label: 'الإحصائيات والتقارير', icon: '📊' },
  { path: '/judge/oversight', label: 'إحصائيات الرقابة القضائية', icon: '⚖️' },
  { path: '/judge/judicial-speech', label: 'رواق الخطاب القضائي و الختم الالكتروني', icon: '⚖️' },
  { path: '/judge/final-archiving', label: 'رواق سجلات تضمين الشهادات العدلية و الارشفة النهائية', icon: '📜' },
  { path: '/judge/archive', label: 'الأرشفة القضائية', icon: '🗃️' },
  { path: '/judge/alerts', label: 'الإنذارات والشكايات', icon: '⚠️' },
  { path: '/judge/audit', label: 'سجل التدقيق', icon: '🔐' },
  { path: '/judge/messages', label: 'صندوق الرسائل', icon: '✉️' },
];

type DeedCategory = 'رسوم الزواج' | 'رسوم الطلاق' | 'رسوم الأملاك' | 'رسوم التركات' | 'باقي الوثائق';
type DeedStatus = 'جديد' | 'قيد الدراسة' | 'مقبول' | 'مقبول مع ملاحظات' | 'ملاحظات جوهرية' | 'مؤرشف';
type Urgency = 'عادي' | 'مستعجل';

type DeedItem = {
  id: string;
  refNumber: string;
  notaryName: string;
  kind: string;
  category: DeedCategory;
  status: DeedStatus;
  receivedAt: string;
};

type PermissionType =
  | 'إذن زواج القاصر'
  | 'إذن التعدد'
  | 'إذن الزواج المختلط'
  | 'إذن الغياب'
  | 'إذن تلقي الشهادات'
  | 'إذن التوجه لتلقي الإشهاد'
  | 'إذن استخراج نسخ/نظائر الرسوم العدلية'
  | 'طلب لقاء';

type PermissionRequest = {
  id: string;
  type: PermissionType;
  refNumber: string;
  notaryName: string;
  submittedAt: string;
  status: 'قيد الدراسة' | 'طلب استكمال' | 'مقبول' | 'مرفوض';
};

type Correspondent =
  | 'المكتب الجهوي للهيئة الوطنية للعدول'
  | 'المكتب المركزي للهيئة الوطنية للعدول'
  | 'السلطة الحكومية المكلفة بالعدل'
  | 'قاضي التوثيق (ذاتي)';

type CorrespondenceType = 
  | 'إشعار إخلال مهني' 
  | 'طلب رأي قانوني' 
  | 'مراسلة تدريب' 
  | 'طلب معلومات مهنية' 
  | 'رأي معلل' 
  | 'تقرير مراقبة' 
  | 'اقتراح مكتب تدريب' 
  | 'إشعار تنفيذ'
  | 'قرار تنظيمي';

type CorrespondenceItem = {
  id: string;
  direction: 'وارد' | 'صادر';
  correspondent: Correspondent;
  subject: string;
  type: CorrespondenceType;
  legalBasis: string;
  urgency: 'عادي' | 'مستعجل' | 'فوري';
  date: string;
  deadline?: string;
  status: 'جديد' | 'قيد المعالجة' | 'مكتمل' | 'مؤرشف' | 'متأخر';
  attachments?: number;
};

const SEED_DEEDS: DeedItem[] = [
  { id: 'D-1001', refNumber: '2025/00123', notaryName: 'محمد العلوي', kind: 'زواج مختلط', category: 'رسوم الزواج', status: 'جديد', receivedAt: 'اليوم 09:12' },
  { id: 'D-1002', refNumber: '2025/00124', notaryName: 'أمين الزهيري', kind: 'طلاق اتفاقي', category: 'رسوم الطلاق', status: 'قيد الدراسة', receivedAt: 'اليوم 10:35' },
  { id: 'D-1003', refNumber: '2025/00118', notaryName: 'سلمى الإدريسي', kind: 'بيع', category: 'رسوم الأملاك', status: 'مقبول مع ملاحظات', receivedAt: 'أمس 16:10' },
  { id: 'D-1004', refNumber: '2025/00111', notaryName: 'ياسين بنعيسى', kind: 'إراثة', category: 'رسوم التركات', status: 'ملاحظات جوهرية', receivedAt: 'أمس 11:02' },
];

const SEED_PERMISSIONS: PermissionRequest[] = [
  { id: 'P-2001', type: 'إذن زواج القاصر', refNumber: 'إذن/2025/044', notaryName: 'محمد العلوي', submittedAt: 'اليوم 08:50', status: 'قيد الدراسة' },
  { id: 'P-2002', type: 'إذن التعدد', refNumber: 'إذن/2025/045', notaryName: 'أمين الزهيري', submittedAt: 'أمس 15:30', status: 'طلب استكمال' },
  { id: 'P-2003', type: 'طلب لقاء', refNumber: 'لقاء/2025/018', notaryName: 'سلمى الإدريسي', submittedAt: 'أمس 13:05', status: 'قيد الدراسة' },
];

const SEED_CORR: CorrespondenceItem[] = [
  { 
    id: 'C-2026-001', 
    direction: 'وارد', 
    correspondent: 'المكتب الجهوي للهيئة الوطنية للعدول', 
    subject: 'رأي معلل بخصوص المادة 174', 
    type: 'رأي معلل', 
    legalBasis: 'المادة 174', 
    urgency: 'عادي', 
    date: '2026-01-20', 
    status: 'مكتمل', 
    attachments: 1 
  },
  { 
    id: 'C-2026-002', 
    direction: 'وارد', 
    correspondent: 'المكتب الجهوي للهيئة الوطنية للعدول', 
    subject: 'نتائج المراقبة الربع سنوية - الدورة الأولى', 
    type: 'تقرير مراقبة', 
    legalBasis: 'المادة 103', 
    urgency: 'مستعجل', 
    date: '2026-01-25', 
    deadline: '2026-02-10', 
    status: 'قيد المعالجة', 
    attachments: 2 
  },
  { 
    id: 'C-2026-003', 
    direction: 'صادر', 
    correspondent: 'المكتب الجهوي للهيئة الوطنية للعدول', 
    subject: 'إشعار بإخلال مهني - ملف تأديبي رقم 44/25', 
    type: 'إشعار إخلال مهني', 
    legalBasis: 'المادة 174', 
    urgency: 'فوري', 
    date: '2026-01-28', 
    status: 'جديد' 
  },
  { 
    id: 'C-2026-004', 
    direction: 'وارد', 
    correspondent: 'المكتب الجهوي للهيئة الوطنية للعدول', 
    subject: 'اقتراح لائحة المكاتب العدلية المعتمدة للتدريب', 
    type: 'اقتراح مكتب تدريب', 
    legalBasis: 'المادة 200', 
    urgency: 'عادي', 
    date: '2026-01-30', 
    status: 'جديد' 
  },
  { 
    id: 'C-2026-005', 
    direction: 'صادر', 
    correspondent: 'المكتب الجهوي للهيئة الوطنية للعدول', 
    subject: 'طلب رأي قانوني حول تأويل المادة 12 من القانون 16.03', 
    type: 'طلب رأي قانوني', 
    legalBasis: 'المادة 174', 
    urgency: 'عادي', 
    date: '2026-01-31', 
    status: 'جديد' 
  },
  { 
    id: 'C-2026-006', 
    direction: 'وارد', 
    correspondent: 'المكتب الجهوي للهيئة الوطنية للعدول', 
    subject: 'محضر اجتماع تنسيقي - القرارات التنظيمية السنوية', 
    type: 'قرار تنظيمي', 
    legalBasis: 'المادة 169-170', 
    urgency: 'عادي', 
    date: '2026-02-01', 
    status: 'مؤرشف' 
  },
];

function StatusPill({ status }: { status: string }) {
  const label =
    status === 'pending' || status === 'جديد'
      ? 'جديد'
      : status === 'in_review' || status === 'قيد الدراسة' || status === 'قيد المعالجة'
        ? 'قيد المعالجة'
        : status === 'accepted' || status === 'مقبول' || status === 'مكتمل'
          ? 'مكتمل'
          : status === 'accepted_with_notes' || status === 'مقبول مع ملاحظات'
            ? 'مقبول مع ملاحظات'
            : status === 'substantive_notes' || status === 'ملاحظات جوهرية' || status === 'مرفوض' || status === 'متأخر'
              ? (status === 'متأخر' ? 'متأخر' : 'ملاحظات جوهرية')
              : status === 'مؤرشف'
                ? 'مؤرشف'
                : status;

  const cls =
    label === 'جديد'
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : label === 'قيد المعالجة' || label === 'قيد المتابعة'
        ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm shadow-amber-100'
        : label === 'مكتمل' || label === 'مقبول'
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : label === 'ملاحظات جوهرية' || label === 'مرفوض' || label === 'متأخر'
            ? 'bg-red-50 text-red-800 border-red-200 shadow-sm shadow-red-100'
            : 'bg-slate-50 text-slate-700 border-slate-200 opacity-60';

  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-[10px] font-black tracking-tighter ${cls}`}>
      {label}
    </span>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function ReportsMiniSelector() {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600">2026</span>
      <span className="text-xs font-bold text-slate-500">السنة الكاملة</span>
      <button
        type="button"
        onClick={() => alert('تصدير Excel (قيد التطوير).')}
        className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"
      >
        Excel
      </button>
      <button
        type="button"
        onClick={() => alert('تصدير PDF (قيد التطوير).')}
        className="rounded-lg border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700 hover:bg-violet-100"
      >
        PDF
      </button>
    </div>
  );
}

function ReportsSectionCard({
  title,
  subtitle,
  icon,
  children,
  accent = 'slate',
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  accent?: 'slate' | 'maroon';
}) {
  const tone =
    accent === 'maroon'
      ? 'bg-gradient-to-l from-[#6d0f1d] to-[#4c0813] text-white border-[#8f2032] shadow-xl shadow-red-900/10'
      : 'bg-white text-slate-900 border-slate-200';

  return (
    <div className={`rounded-[2rem] border p-6 shadow-sm ${tone}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="text-right">
          <div className={`text-xl font-black ${accent === 'maroon' ? 'text-white' : 'text-slate-900'}`}>{title}</div>
          {subtitle ? (
            <div className={`mt-1 text-xs font-bold ${accent === 'maroon' ? 'text-red-50/75' : 'text-slate-500'}`}>{subtitle}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {icon ? <span className="text-lg">{icon}</span> : null}
          <ReportsMiniSelector />
        </div>
      </div>
      {children}
    </div>
  );
}

function JudgeReportsStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 text-right shadow-sm">
      <div className="text-xs font-black text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
      <div className="mt-2 text-[11px] font-bold text-slate-400">{hint}</div>
    </div>
  );
}

function JudgeReportsBarRow({
  label,
  count,
  total,
  color,
  dark = false,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  dark?: boolean;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
  return (
    <div>
      <div className={`mb-1.5 flex items-center justify-between text-xs font-black ${dark ? 'text-white' : 'text-slate-700'}`}>
        <span>{label}</span>
        <span>{count} ({percentage}%)</span>
      </div>
      <div className={`h-2.5 overflow-hidden rounded-full ${dark ? 'bg-white/15' : 'bg-slate-100'}`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function JudgeProfileCard() {
  const { sessionToken } = useAuth();
  const utils = trpc.useUtils();
  const judgeProfileApi = trpc.judge as any;
  const { data: appellateCourts } = trpc.auth.getAppellateCourts.useQuery(undefined, { enabled: true });
  const profileQuery = judgeProfileApi.getMyProfile.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken, retry: false }
  );
  const updateProfileMutation = judgeProfileApi.updateMyProfile.useMutation({
    onSuccess: async () => {
      await (utils.judge as any).getMyProfile.invalidate();
      alert('تم تحديث بيانات القاضي بنجاح');
      window.location.reload();
    },
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    appellateCourt: '',
    primaryCourt: '',
    courtName: '',
    phone: '',
    profilePictureUrl: '',
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setFormData({
      fullName: profileQuery.data.fullName || '',
      appellateCourt: profileQuery.data.appellateCourt || '',
      primaryCourt: profileQuery.data.primaryCourt || '',
      courtName: profileQuery.data.courtName || '',
      phone: profileQuery.data.phone || '',
      profilePictureUrl: profileQuery.data.profilePictureUrl || '',
    });
  }, [profileQuery.data]);

  const { data: judgePrimaryCourtsData } = trpc.auth.getPrimaryCourts.useQuery(
    { appellateCourt: formData.appellateCourt || '' },
    { enabled: !!formData.appellateCourt }
  );
  const primaryCourts = judgePrimaryCourtsData && !('error' in judgePrimaryCourtsData)
    ? judgePrimaryCourtsData.primary_courts
    : [];

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let width = img.width;
        let height = img.height;
        const maxSize = 800;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        setFormData((prev) => ({ ...prev, profilePictureUrl: canvas.toDataURL('image/jpeg', 0.85) }));
      };
      img.src = base64String;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!sessionToken) {
      alert('جلسة غير صالحة');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        sessionToken,
        fullName: formData.fullName.trim(),
        appellateCourt: formData.appellateCourt.trim() || null,
        primaryCourt: formData.primaryCourt.trim() || null,
        courtName: formData.primaryCourt.trim() || formData.appellateCourt.trim() || formData.courtName.trim() || null,
        phone: formData.phone.trim() || null,
        profilePictureUrl: formData.profilePictureUrl || null,
      });
      setIsEditing(false);
    } catch (error: any) {
      alert(error?.message || 'تعذر تحديث بيانات القاضي');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="text-right">
          <div className="text-lg font-extrabold text-slate-900">بيانات حساب القاضي</div>
          <div className="mt-1 text-sm text-slate-600">
            يمكنكم تعديل الاسم، الصورة الشخصية، المحكمة، والهاتف من داخل لوحة القاضي مباشرة.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            isEditing
              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              : 'bg-[#0b1b3a] text-white hover:bg-[#091633]'
          }`}
        >
          {isEditing ? 'إلغاء التعديل' : 'تحديث البيانات'}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[140px,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-sm">
            {formData.profilePictureUrl ? (
              <img src={formData.profilePictureUrl} alt="Judge" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-4xl">👤</div>
            )}
          </div>
          {isEditing ? (
            <div className="mt-3">
              <input id="judge-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleProfilePictureChange} />
              <label
                htmlFor="judge-avatar-upload"
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#E6BE8A] px-3 py-2 text-xs font-black text-[#023120] hover:bg-[#d4af37]"
              >
                تحديث الصورة
              </label>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-500">الاسم الكامل</div>
            {isEditing ? (
              <input
                value={formData.fullName}
                onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
                placeholder="الاسم الكامل"
              />
            ) : (
              <div className="mt-2 text-base font-extrabold text-slate-900">{profileQuery.data?.fullName || 'قاضي التوثيق'}</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-500">البريد الإلكتروني</div>
            <div className="mt-2 text-base font-bold text-slate-900">{profileQuery.data?.email || 'غير محدد'}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-500">محكمة الاستئناف</div>
            {isEditing ? (
              <select
                value={formData.appellateCourt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    appellateCourt: e.target.value,
                    primaryCourt: '',
                    courtName: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
              >
                <option value="">اختر محكمة الاستئناف</option>
                {appellateCourts?.map((court: string) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-2 text-base font-bold text-slate-900">{profileQuery.data?.appellateCourt || 'غير محددة بعد'}</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-500">المحكمة الابتدائية</div>
            {isEditing ? (
              <select
                value={formData.primaryCourt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    primaryCourt: e.target.value,
                    courtName: e.target.value || prev.appellateCourt,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
                disabled={!formData.appellateCourt}
              >
                <option value="">{formData.appellateCourt ? 'اختر المحكمة الابتدائية' : 'اختر محكمة الاستئناف أولاً'}</option>
                {primaryCourts.map((court: string) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-2 text-base font-bold text-slate-900">{profileQuery.data?.primaryCourt || profileQuery.data?.courtName || 'غير محددة بعد'}</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-500">رقم الهاتف</div>
            {isEditing ? (
              <input
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
                placeholder="الهاتف المهني"
              />
            ) : (
              <div className="mt-2 text-base font-bold text-slate-900">{profileQuery.data?.phone || 'غير محدد'}</div>
            )}
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateProfileMutation.isLoading}
            className="rounded-xl bg-gradient-to-r from-[#023120] to-[#04553a] px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateProfileMutation.isLoading ? 'جاري الحفظ...' : 'حفظ بيانات القاضي'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LanguageSwitcher() {
  return (
    <select
      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-900/20"
      defaultValue="ar"
      onChange={() => {}}
    >
      <option value="ar">العربية</option>
      <option value="fr">Français</option>
    </select>
  );
}

function JudgeShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, notaryProfile, sessionToken } = useAuth();
  const { unreadTotal, judgeRequestsTotal, judgePermissionsTotal, judgeAdlCopyPermissionsTotal } = useMessagingNotifications();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ '/judge/permissions': true });
  const judgeProfileQuery = (trpc.judge as any).getMyProfile.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken && (user?.role === 'authentication_judge' || user?.role === 'regional_judge' || user?.role === 'supreme_judge'), retry: false }
  );

  const toggleMenu = (path: string) => {
    setExpandedMenus(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const currentProfilePhoto = judgeProfileQuery.data?.profilePictureUrl || notaryProfile?.profile_picture_url;
  const currentCourtName = judgeProfileQuery.data?.primaryCourt || judgeProfileQuery.data?.courtName || judgeProfileQuery.data?.appellateCourt || 'المحكمة غير محددة بعد';

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-80 bg-gradient-to-b from-[#023120] via-[#023120] to-[#011a11] text-white shadow-xl z-20 border-l-4 border-[#E6BE8A] flex flex-col h-full flex-shrink-0 transition-all duration-300 relative overflow-hidden font-kufi">
        <div className="p-6 bg-black/20 border-b border-[#E6BE8A]/30 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#E6BE8A] to-[#c5a065] rounded-2xl flex items-center justify-center text-[#023120] font-bold shadow-lg transform rotate-3">
              ⚖️
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight font-maghribi">بوابة قاضي التوثيق</h1>
              <p className="text-[10px] text-[#E6BE8A] opacity-90 font-medium">المملكة المغربية</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto py-8 px-4 custom-scrollbar relative z-10">
          {JUDGE_NAV.map((item) => {
             const hasSubItems = item.subItems && item.subItems.length > 0;
             const isExpanded = expandedMenus[item.path];
             const isActive = location.pathname === item.path || Boolean(hasSubItems && item.subItems?.some((s: any) => s.path === location.pathname));

             return (
               <div key={item.path} className="space-y-1">
                 {hasSubItems ? (
                   <button
                     onClick={() => toggleMenu(item.path)}
                     className={`w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-right text-sm font-bold transition-all duration-300 group relative overflow-hidden ${
                       isActive
                         ? 'bg-gradient-to-r from-[#E6BE8A] to-[#d4af37] text-[#023120] shadow-lg shadow-amber-900/40'
                         : 'text-emerald-50 hover:text-white hover:bg-white/10'
                     }`}
                   >
                     <span className={`text-xl transition-all duration-300 ${isActive ? 'scale-125' : 'group-hover:scale-125'}`}>{item.icon}</span>
                     <span className="flex w-full items-center justify-between gap-3">
                       <span className="relative z-10">{item.label}</span>
                       <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                     </span>
                   </button>
                 ) : (
                   <Link
                     to={item.path}
                     className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-right text-sm font-bold transition-all duration-300 group relative overflow-hidden ${
                       isActive
                         ? 'bg-gradient-to-r from-[#E6BE8A] to-[#d4af37] text-[#023120] shadow-lg shadow-amber-900/40 transform translate-x-[-4px]'
                         : 'text-emerald-50 hover:text-white hover:bg-white/10'
                     }`}
                   >
                     <span className={`text-xl transition-all duration-300 ${isActive ? 'scale-125' : 'group-hover:scale-125'}`}>{item.icon}</span>
                     <span className="flex w-full items-center justify-between gap-3">
                       <span className="relative z-10">{item.label}</span>
                       {item.path === '/judge/messages' && unreadTotal > 0 ? (
                         <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white/20">
                           {unreadTotal}
                         </span>
                       ) : null}
                       {item.path === '/judge/notifications' && (judgeRequestsTotal + judgePermissionsTotal + judgeAdlCopyPermissionsTotal) > 0 ? (
                         <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white animate-pulse shadow-sm ring-2 ring-white/20">
                           {judgeRequestsTotal + judgePermissionsTotal + judgeAdlCopyPermissionsTotal}
                         </span>
                       ) : null}
                     </span>
                     
                     {!isActive && (
                       <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/0 to-white/0 group-hover:from-white/5 group-hover:to-white/10 rounded-2xl transition-all"></div>
                     )}
                   </Link>
                 )}

                 {/* Render Sub Items */}
                 {hasSubItems && isExpanded && (
                   <div className="mr-6 space-y-1 animate-fadeIn">
                     {item.subItems?.map((sub) => {
                       const isSubActive = location.pathname === sub.path;
                       return (
                         <Link
                           key={sub.path}
                           to={sub.path}
                           className={`flex items-center gap-3 rounded-xl px-4 py-3 text-right text-xs font-bold transition-all duration-200 ${
                             isSubActive
                               ? 'bg-white/20 text-white shadow-inner'
                               : 'text-emerald-100/60 hover:text-white hover:bg-white/5'
                           }`}
                         >
                           <span>{sub.icon}</span>
                           <span>{sub.label}</span>
                           {sub.path === '/judge/marriage-permissions' && judgePermissionsTotal > 0 && (
                             <span className="mr-auto rounded-full bg-blue-500 px-2 py-0.5 text-[8px] font-black text-white">
                               {judgePermissionsTotal}
                             </span>
                           )}
                           {sub.path === '/judge/adl-copy-permissions' && judgeAdlCopyPermissionsTotal > 0 && (
                             <span className="mr-auto rounded-full bg-blue-500 px-2 py-0.5 text-[8px] font-black text-white">
                               {judgeAdlCopyPermissionsTotal}
                             </span>
                           )}
                         </Link>
                       );
                     })}
                   </div>
                 )}
               </div>
             );
          })}
        </nav>
        
        {/* User Profile & Logout */}
        <div className="p-4 bg-black/10 border-t border-[#E6BE8A]/20 mt-auto relative z-10">
           <div className="flex items-center gap-3 mb-4 px-2">
             <div className="w-10 h-10 rounded-full border border-[#E6BE8A]/30 overflow-hidden bg-gradient-to-br from-[#E6BE8A] to-[#c5a065] flex items-center justify-center text-sm font-bold text-[#023120] shadow-inner">
               {currentProfilePhoto ? (
                  <img src={currentProfilePhoto} alt="Judge" className="h-full w-full object-cover" />
               ) : (
                 user?.full_name?.charAt(0) || 'J'
               )}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-bold text-white truncate">{user?.full_name || 'قاضي التوثيق'}</p>
               <p className="text-xs text-[#E6BE8A] truncate opacity-80">{currentCourtName}</p>
             </div>
           </div>
           
           <button 
            onClick={async () => {
                await logout();
                navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#E6BE8A] hover:bg-[#d4af37] text-[#023120] py-3 rounded-xl text-sm font-black shadow-lg transition-all hover:shadow-amber-900/50 active:scale-95"
           >
             <span>🚪</span> تسجيل الخروج
           </button>
        </div>

        {/* Decorative Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E6BE8A] via-amber-400 to-[#E6BE8A] z-10"></div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        <header className="bg-gradient-to-b from-[#E2E4E7] via-[#F1F2F4] to-white shadow-sm overflow-hidden relative">
          {/* Subtle light pattern overlay */}
          <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')] pointer-events-none"></div>
          
          <div className="flex items-center justify-between px-8 py-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className="p-1.5 bg-white/80 rounded-2xl shadow-sm border border-white backdrop-blur-sm">
                <img
                  src="/logos/morocco-coat.jpg"
                  alt="شعار المملكة المغربية"
                  className="h-16 w-auto object-contain drop-shadow-sm"
                />
              </div>
              <div className="text-right leading-tight font-maghribi select-none">
                <div className="text-2xl font-[800] text-slate-800 tracking-tight font-maghribi">
                  <span>المملكة المغربية</span>
                </div>
                <div className="text-2xl font-[800] text-slate-600 font-maghribi">
                  <span>المجلس الأعلى للسلطة القضائية</span>
                </div>
              </div>
            </div>

            {/* Centered Identity Spot - Stable Element */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto">
                  <div className="relative group">
                    <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#E6BE8A] via-amber-400 to-[#E6BE8A] rounded-full blur-md opacity-40 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                    <div className="relative h-24 w-24 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white/50 backdrop-blur-md transition-transform duration-500 group-hover:scale-105">
                        {currentProfilePhoto ? (
                          <img 
                            src={currentProfilePhoto} 
                            alt="Judge Profile" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-3xl">⚖️</div>
                        )}
                        {/* Active Status Badge */}
                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                {/* Messages */}
                <button
                  onClick={() => navigate('/judge/messages')}
                  className="relative p-2.5 bg-white/80 rounded-2xl shadow-sm border border-white hover:bg-white transition-all group backdrop-blur-sm"
                  title="الرسائل القضائية"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">📬</span>
                  {unreadTotal > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 border-2 border-white text-[10px] font-black text-white animate-pulse">
                      {unreadTotal}
                    </span>
                  )}
                </button>

                {/* Notifications (Bell) */}
                <button
                  onClick={() => navigate('/judge/notifications')}
                  className="relative p-2.5 bg-white/80 rounded-2xl shadow-sm border border-white hover:bg-white transition-all group backdrop-blur-sm"
                  title="إشعارات الأذونات والطلبات"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">🔔</span>
                  {(judgeRequestsTotal + judgePermissionsTotal + judgeAdlCopyPermissionsTotal) > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 border-2 border-white text-[10px] font-black text-white animate-pulse">
                      {judgeRequestsTotal + judgePermissionsTotal + judgeAdlCopyPermissionsTotal}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex flex-col items-end gap-2 pr-6 border-r border-slate-300/50">
                <div className="bg-white/90 px-5 py-2 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm">
                   <div className="text-slate-700 font-bold">
                     <DateWidget />
                   </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>اللغة الاختيارية</span>
                  </span>
                  <div className="scale-90 origin-right">
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
              
              <div className="p-2.5 bg-white/80 rounded-3xl shadow-sm border border-white group backdrop-blur-sm">
                <img
                  src="/logos/adoul-logo.jpg"
                  alt="شعار الهيئة الوطنية للعدول"
                  className="h-20 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>

          {/* Banner with Scroll/Maroon Theme */}
          <div className="flex h-32 items-center justify-center relative px-12 -mt-10 mb-2 no-print select-none">
            <OrnateScrollBanner className="group" theme="green">
               <span className="text-center text-4xl font-black font-maghribi tracking-normal drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] px-24 group-hover:scale-[1.01] transition-transform duration-700">
                  <span className="text-white drop-shadow-[0_0_20px_rgba(230,190,138,0.4)]">
                    منصة القاضي الرقمية للتوثيق العدلي
                  </span>
               </span>
               <div className="absolute left-10 hidden 2xl:flex items-center gap-2 bg-black/40 px-5 py-2 rounded-xl border border-amber-400/20 backdrop-blur-md shadow-2xl translate-x-12 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ring-4 ring-green-500/20"></span>
                  <span className="text-xs font-black uppercase text-[#E6BE8A] tracking-widest text-nowrap">
                    النظام القضائي الأمني
                  </span>
               </div>
            </OrnateScrollBanner>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#023120] shadow-[0_2px_4px_rgba(0,0,0,0.1)]"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
             {children}
        </div>
      </main>
    </div>
  );
}

function JudgeDashboard() {
  const { sessionToken } = useAuth();
  const submissionsQuery = trpc.judge.listSubmissions.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken, retry: false }
  );

  // Fetch judicial notifications for stats
  const { data: notificationsData } = trpc.notifications.getRequestsList.useQuery({
    limit: 100,
    recipientType: 'judge',
  });

  const judgeNotifications = notificationsData || [];

  const pendingNotifsCount = useMemo(() => {
    return judgeNotifications.filter(n => n.status === 'قيد_المعالجة').length;
  }, [judgeNotifications]);

  const submissions = submissionsQuery.data ?? [];
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayCount = submissions.filter((s) => (s.createdAt || '').slice(0, 10) === todayIso).length;
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const inReviewCount = submissions.filter((s) => s.status === 'in_review').length;

  const notifications = [
    pendingNotifsCount > 0 ? `لديك ${pendingNotifsCount} إشعارات تنقل جديدة في انتظار المراجعة.` : 'لا توجد إشعارات تنقل جديدة.',
    'توصلتم برسم عدلي جديد في انتظار المعالجة.',
    'توصلتم بمراسلة رسمية من جهة مؤسسية.',
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-right">
          <div className="text-2xl font-extrabold text-slate-900">لوحة القاضي</div>
          <div className="mt-2 text-sm text-slate-600">
            بوابة مهنية مؤمنة تُمارس من خلالها المراقبة، التأشير، التنظيم، والتوجيه، دون التدخل في جوهر عمل العدل.
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-l-4 border-l-[#E6BE8A] border-slate-200 bg-[#FFF8EE] p-4 text-right text-sm text-[#023120]">
          <div className="font-extrabold flex items-center gap-2">
             <span>🔔</span>
             <span>تنبيه مهني</span>
          </div>
          <div className="mt-1 leading-relaxed text-[#023120]/80">
            المعطيات المعروضة في <span className="font-bold text-[#023120]">الفهرسة القضائية</span> مستمدة حصراً من الرسوم المضمنة رسمياً.
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-bold text-slate-900">🧭 فلسفة البوابة</div>
          <ul className="mt-2 list-disc space-y-1 pr-5">
            <li>القاضي لا يحرر → بل يراقب ويؤشر</li>
            <li>القاضي لا يتتبع التفاصيل الصغيرة → بل يُعالج بالتصنيف والذكاء</li>
            <li>كل إجراء مؤرخ وقابل للتتبع ومرتبط برقم رسم وسجل بيانات</li>
          </ul>
        </div>
      </div>

      <JudgeProfileCard />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <MetricCard label="🔔 إشعارات التنقل" value={String(pendingNotifsCount)} hint="طلبات العدول" />
        <MetricCard label="📥 الرسوم الواردة اليوم" value={String(todayCount)} hint="حسب الإرسال" />
        <MetricCard label="📄 رسوم قيد الدراسة" value={String(inReviewCount)} hint="قيد المراجعة" />
        <MetricCard label="📊 إحصائيات مختصرة" value="—" hint="قيد الربط بالبيانات" />
        <MetricCard label="⏳ رسوم جديدة" value={String(pendingCount)} hint="في انتظار المعالجة" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold text-slate-900">الإشعارات</div>
            <span className="text-xs font-semibold text-slate-500">جديد</span>
          </div>
          <div className="mt-4 space-y-3">
            {notifications.map((n, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {n}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">📂 الرسوم الأخيرة</div>
          <div className="mt-4 space-y-3">
            {submissions.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">{s.fileNumber || s.id}</div>
                  <div className="text-xs text-slate-600">{s.notaryName} · {s.documentType}</div>
                </div>
                <StatusPill status={s.status} />
              </div>
            ))}

            {submissions.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                لا توجد رسوم في صندوق القاضي حاليًا.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function DeedsInbox() {
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const [status, setStatus] = useState<
    'all' | 'pending' | 'in_review' | 'accepted' | 'accepted_with_notes' | 'substantive_notes'
  >('all');
  const [query, setQuery] = useState('');

  const submissionsQuery = trpc.judge.listSubmissions.useQuery(
    {
      sessionToken: sessionToken || '',
      status: status === 'all' ? undefined : status,
    },
    {
      enabled: !!sessionToken,
      retry: false,
    }
  );

  const deeds = useMemo(() => {
    const source = submissionsQuery.data ?? [];
    const q = query.trim().toLowerCase();
    return source.filter((d) => {
      if (!q) return true;
      const hay = `${d.fileNumber} ${d.notaryName} ${d.documentType} ${d.status} ${d.summary}`.toLowerCase();
      return hay.includes(q);
    });
  }, [submissionsQuery.data, query]);

  const filters: Array<{ value: typeof status; label: string; hint: string }> = [
    { value: 'all', label: 'الكل', hint: 'جميع الإحالات' },
    { value: 'pending', label: 'جديد', hint: 'في انتظار فتح المعالجة' },
    { value: 'in_review', label: 'قيد الدراسة', hint: 'تم فتح الملف' },
    { value: 'accepted', label: 'مقبول', hint: 'قابل للتضمين' },
    { value: 'accepted_with_notes', label: 'مقبول مع ملاحظات', hint: 'يُرسل للعدل مع ملاحظات' },
    { value: 'substantive_notes', label: 'ملاحظات جوهرية', hint: 'يتطلب الاستدراك قبل التضمين' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl border border-slate-200 transition-all font-bold text-sm"
            >
              <span>←</span> العودة
            </button>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-slate-900">رواق الفحص القانوني و الشكلي للرسوم العدلية و القبول للتضمين</div>
              <div className="mt-1 text-sm text-slate-600">كل رسم يظهر كبطاقة: رقم الرسم، اسم العدل، النوع، الحالة، ثم زر “معالجة”.</div>
            </div>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-slate-400 focus:outline-none md:w-80"
            placeholder="بحث برقم الرسم/اسم العدل/النوع…"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                status === f.value 
                  ? 'border-[#023120] bg-[#023120] text-[#E6BE8A] shadow-md' 
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 hover:border-emerald-200'
              }`}
              title={f.hint}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {submissionsQuery.isLoading && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            جاري تحميل الرسوم…
          </div>
        )}

        {submissionsQuery.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-right text-sm text-red-700">
            تعذر تحميل الرسوم: {submissionsQuery.error.message}
          </div>
        )}

        {!submissionsQuery.isLoading &&
          !submissionsQuery.error &&
          deeds.map((d) => (
          <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-500">رقم الرسم</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{d.fileNumber || d.id}</div>
                <div className="mt-1 text-sm text-slate-600">{d.notaryName} · {d.documentType}</div>
                {d.summary ? <div className="mt-2 text-xs text-slate-500 line-clamp-2">{d.summary}</div> : null}
              </div>
              <StatusPill status={d.status} />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">تاريخ الإرسال: {new Date(d.createdAt).toLocaleString('ar-MA')}</div>
              <button
                type="button"
                onClick={() => navigate(`/judge/deeds/${d.id}`)}
                className="rounded-xl bg-[#0b1b3a] px-4 py-2 text-sm font-bold text-white hover:bg-[#091633]"
              >
                معالجة
              </button>
            </div>
          </div>
        ))}

        {!submissionsQuery.isLoading && !submissionsQuery.error && deeds.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            لا توجد رسوم مطابقة لمعايير البحث.
          </div>
        )}
      </div>
    </div>
  );
}
function DeedProcessing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

  const submissionQuery = trpc.judge.getSubmission.useQuery(
    { sessionToken: sessionToken || '', id: id || EMPTY_UUID },
    { enabled: !!sessionToken && !!id, retry: false }
  );
  const utils = trpc.useUtils();
  const startReviewMutation = trpc.judge.startReview.useMutation({
    onSuccess: () => {
      utils.judge.getSubmission.invalidate({ sessionToken: sessionToken || '', id: id || EMPTY_UUID });
      utils.judge.listSubmissions.invalidate();
    },
  });
  const decideMutation = trpc.judge.decideSubmission.useMutation();

  const [decision, setDecision] = useState<'accepted' | 'accepted_with_notes' | 'substantive_notes'>('accepted_with_notes');
  const [notes, setNotes] = useState('يرجى استدراك الملاحظات التالية قبل التضمين…');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [showPayloadJson, setShowPayloadJson] = useState(false);

  useEffect(() => {
    if (!id || !sessionToken) return;
    const s = submissionQuery.data;
    if (!s) return;
    if (s.status === 'pending') {
      startReviewMutation.mutate({ sessionToken, id });
    }
  }, [id, sessionToken, submissionQuery.data, startReviewMutation]);

  useEffect(() => {
    const s = submissionQuery.data;
    if (!s) return;
    setDecision((s.decision as any) || 'accepted_with_notes');
    setNotes(s.judgeNotes || 'يرجى استدراك الملاحظات التالية قبل التضمين…');
  }, [submissionQuery.data?.id, submissionQuery.data?.updatedAt]);

  const submission = submissionQuery.data;

  const attachment = useMemo(() => {
    if (!submission) return null;
    const payload: any = (submission as any).payload;
    const candidate = payload?.attachment;
    if (!candidate || typeof candidate !== 'object') return null;
    const name = (candidate as any).name;
    const size = (candidate as any).size;
    const base64 = (candidate as any).base64;
    if (typeof name !== 'string' || typeof size !== 'number' || typeof base64 !== 'string') return null;
    if (!base64.trim()) return null;
    
    // Determine MIME type from filename
    const extension = (name.split('.').pop() || '').toLowerCase();
    let mimeType = 'application/octet-stream';
    if (extension === 'pdf') mimeType = 'application/pdf';
    else if (extension === 'png') mimeType = 'image/png';
    else if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
    else if (extension === 'gif') mimeType = 'image/gif';
    else if (extension === 'webp') mimeType = 'image/webp';
    
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    return { name, size, base64, dataUrl, extension, mimeType };
  }, [submission]);

  const payloadForDisplay = useMemo(() => {
    if (!submission) return {};
    const payload: any = (submission as any).payload;
    if (!payload || typeof payload !== 'object') return {};
    const clone: any = { ...payload };
    if (clone.attachment && typeof clone.attachment === 'object') {
      const att: any = { ...clone.attachment };
      if (typeof att.base64 === 'string' && att.base64.length) {
        att.base64 = `[omitted base64 ${att.base64.length} chars]`;
      }
      clone.attachment = att;
    }
    return clone;
  }, [submission]);

  if (!id) return <Navigate to="/judge/deeds" replace />;
  if (submissionQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
        جاري تحميل الملف…
      </div>
    );
  }
  if (submissionQuery.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-right text-sm text-red-700">
        تعذر تحميل الملف: {submissionQuery.error.message}
      </div>
    );
  }

  if (!submission) return <Navigate to="/judge/deeds" replace />;

  const downloadAttachment = (att: { name: string; size: number; base64: string }) => {
    const extension = (att.name.split('.').pop() || '').toLowerCase();
    const mime =
      extension === 'pdf'
        ? 'application/pdf'
        : extension === 'png'
          ? 'image/png'
          : extension === 'jpg' || extension === 'jpeg'
            ? 'image/jpeg'
            : extension === 'doc'
              ? 'application/msword'
              : extension === 'docx'
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/octet-stream';

    const binary = atob(att.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name || 'attachment';
    a.click();
    URL.revokeObjectURL(url);
  };

  const decisionLabel =
    decision === 'accepted'
      ? '✔️ مقبول وجاهز للتضمين'
      : decision === 'accepted_with_notes'
        ? '⚠️ مقبول مع ملاحظات'
        : '❌ ملاحظات جوهرية';

  const isNotesRequired = decision !== 'accepted';
  const canSend = !!sessionToken && (!isNotesRequired || !!notes.trim());

  const handleSendDecision = async () => {
    setSendError(null);
    setSendSuccess(null);

    if (!id) {
      setSendError('تعذر تحديد رقم الإحالة.');
      return;
    }

    if (!sessionToken) {
      setSendError('يجب تسجيل الدخول بحساب القاضي لإرسال القرار.');
      return;
    }

    if (!canSend) {
      setSendError('المرجو كتابة الملاحظات قبل الإرسال.');
      return;
    }

    try {
      await decideMutation.mutateAsync({
        sessionToken,
        id,
        decision,
        notes: notes.trim() ? notes : undefined,
      });

      setSendSuccess('تم إرسال القرار للعدل بنجاح.');
      await utils.judge.getSubmission.invalidate({ sessionToken, id });
      await utils.judge.listSubmissions.invalidate();
    } catch (err: any) {
      let msg = err?.message || 'تعذر إرسال القرار. حاول مرة أخرى.';
      if (msg.includes('Unable to transform response')) {
        msg = 'حدث خطأ في استجابة الخادم (Invalid JSON). يرجى التحقق من الاتصال أو المحاولة لاحقاً.';
      } else if (msg.includes('Failed to fetch')) {
        msg = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
      }
      setSendError(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-500">معالجة الرسم</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">{submission.fileNumber || submission.id}</div>
            <div className="mt-1 text-sm text-slate-600">
              {submission.documentType} · {submission.notaryName}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/judge/deeds')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            رجوع
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold text-slate-900">📄 عرض الرسم العدلي</div>
            <span className="text-xs font-semibold text-slate-500">بيانات الإحالة</span>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-right text-sm text-slate-800">
            {submission.summary ? (
              <div className="whitespace-pre-wrap leading-relaxed">{submission.summary}</div>
            ) : (
              <div className="text-slate-600">لا يوجد ملخص.</div>
            )}
          </div>
          {attachment && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-right">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-amber-900">📎 ملف مرفق</div>
                    <div className="mt-1 text-xs text-amber-800">
                      {attachment.name} ({(attachment.size / 1024).toFixed(0)} KB)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = attachment.dataUrl;
                      a.download = attachment.name || 'attachment';
                      a.click();
                    }}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
                  >
                    تحميل الملف
                  </button>
                </div>
              </div>

              {/* Document Preview Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 overflow-hidden">
                <div className="text-sm font-bold text-slate-600 mb-4">📖 عرض الملف:</div>
                {attachment.extension && attachment.extension.toLowerCase() === 'pdf' ? (
                  <div className="bg-slate-50 rounded-lg overflow-auto max-h-[800px]">
                    <JudicialPdfViewer url={attachment.dataUrl} targetWidth={800} />
                  </div>
                ) : ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes((attachment.extension || '').toLowerCase()) ? (
                  <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-center">
                    <img
                      src={attachment.dataUrl}
                      alt={attachment.name}
                      className="max-w-full max-h-[800px] rounded-lg shadow-md"
                      onError={(e) => {
                        console.error('Image load error:', e);
                        (e.target as any).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-600">
                    <div className="text-sm font-bold mb-2">📄 نوع الملف: {attachment.extension?.toUpperCase() || 'غير معروف'}</div>
                    <div className="text-xs text-slate-500">لا يمكن عرض معاينة لهذا نوع الملف. استخدم زر التحميل أعلاه.</div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {['المستندات المؤسسة', 'البطاقات الوطنية', 'مرفقات إضافية'].map((t) => (
              <div key={t} className="rounded-xl border border-slate-200 bg-white p-3 text-right">
                <div className="text-xs font-semibold text-slate-500">{t}</div>
                <div className="mt-1 text-sm font-bold text-slate-900">—</div>
              </div>
            ))}
          </div>

          <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <summary
              className="cursor-pointer text-right text-sm font-bold text-slate-800"
              onClick={() => setShowPayloadJson((prev) => !prev)}
            >
              عرض البيانات التقنية (JSON)
            </summary>
            {showPayloadJson && (
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                {JSON.stringify(payloadForDisplay, null, 2)}
              </pre>
            )}
          </details>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">🖊️ لوحة التأشير</div>
          <div className="mt-4 space-y-3">
            {[
              { id: 'accepted', label: '✔️ مقبول وجاهز للتضمين' },
              { id: 'accepted_with_notes', label: '⚠️ مقبول مع ملاحظات' },
              { id: 'substantive_notes', label: '❌ ملاحظات جوهرية' },
            ].map((opt) => (
              <label key={opt.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-slate-800">{opt.label}</span>
                <input type="radio" name="decision" checked={decision === (opt.id as any)} onChange={() => setDecision(opt.id as any)} />
              </label>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-500">✍️ الملاحظات</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 h-40 w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
            />
            <div className="mt-2 text-xs text-slate-500">لغة جاهزة تلقائية محترمة — قابلة للتعديل.</div>
          </div>

          {sendError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-right text-sm text-red-700">
              {sendError}
            </div>
          )}
          {sendSuccess && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-right text-sm text-emerald-900">
              <div className="font-bold">✓ {sendSuccess}</div>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/judge/deeds')}
                  className="rounded-lg bg-[#0b1b3a] px-3 py-2 text-xs font-bold text-white hover:bg-[#091633]"
                >
                  الرجوع إلى صندوق الرسوم
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSendSuccess(null);
                    setSendError(null);
                  }}
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                >
                  متابعة نفس الملف
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-bold text-slate-900">القرار الحالي</div>
            <div className="mt-1">{decisionLabel}</div>
            {isNotesRequired && !notes.trim() ? (
              <div className="mt-2 text-xs font-semibold text-red-700">تنبيه: الملاحظات مطلوبة لهذا القرار.</div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-[#0b1b3a] px-4 py-2 text-sm font-bold text-white hover:bg-[#091633]"
              onClick={handleSendDecision}
              disabled={!canSend || decideMutation.isLoading}
            >
              {decideMutation.isLoading ? 'جاري الإرسال…' : 'إرسال للعدل'}
            </button>
            <button
              type="button"
              className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-900"
              onClick={() => {
                setDecision('accepted');
                setNotes('الرسم مستوفٍ للشروط وقابل للتضمين.');
              }}
            >
              اعتماد صيغة القبول
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function ScientificPermissionsPage() {
  return <ScientificPermissionsProcessingPage />;
}

function MarriagePermissionsPage() {
  return <MarriagePermissionsProcessingPage />;
}

function AdlCopyPermissionsPage() {
  return <JudicialFeesPermissionsProcessingPage />;
}

function IndividualReceptionPermissionsPage() {
  return <IndividualReceptionPermissionsProcessingPage />;
}

function OfficeMovementPage() {
  return <OfficeMovementProcessingPage />;
}

function CorrespondenceHub() {
  const [active, setActive] = useState<'inbox' | 'outbox' | 'supervision' | 'archive' | 'deadlines'>('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLaw, setSelectedLaw] = useState<string | null>(null);
  const [selectedCorr, setSelectedCorr] = useState<CorrespondenceItem | null>(null);
  
  const [compose, setCompose] = useState<{
    correspondent: Correspondent;
    type: CorrespondenceType;
    subject: string;
    body: string;
    urgency: 'عادي' | 'مستعجل' | 'فوري';
    legalBasis: string;
    deadline: string;
  }>({
    correspondent: 'المكتب الجهوي للهيئة الوطنية للعدول',
    type: 'إحالة' as any,
    subject: '',
    body: 'بناءً على مقتضيات القانون رقم 16.03 المتعلق بخطة العدالة، نتشرف بإفادتكم بما يلي…',
    urgency: 'عادي',
    legalBasis: 'المادة 174',
    deadline: '',
  });

  const filtered = useMemo(() => {
    let data = SEED_CORR;
    
    // Quick filter by active tab
    if (active === 'inbox') data = data.filter((c) => c.direction === 'وارد' && c.status !== 'مؤرشف');
    if (active === 'outbox') data = data.filter((c) => c.direction === 'صادر' && c.status !== 'مؤرشف');
    if (active === 'supervision') data = data.filter((c) => c.type === 'تقرير مراقبة' || c.type === 'إشعار إخلال مهني');
    if (active === 'deadlines') data = data.filter((c) => c.deadline && c.status !== 'مكتمل');
    if (active === 'archive') data = data.filter((c) => c.status === 'مؤرشف');

    // Filter by search
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(c => 
        c.subject.toLowerCase().includes(s) || 
        c.id.toLowerCase().includes(s) || 
        c.correspondent.toLowerCase().includes(s)
      );
    }

    // Filter by Law
    if (selectedLaw) {
      data = data.filter(c => c.legalBasis.includes(selectedLaw));
    }

    return data;
  }, [active, search, selectedLaw]);

  const stats = useMemo(() => ({
    total: SEED_CORR.length,
    pending: SEED_CORR.filter(c => c.status === 'جديد' || c.status === 'قيد المعالجة').length,
    late: SEED_CORR.filter(c => c.status === 'متأخر').length,
    supervision: SEED_CORR.filter(c => c.type === 'تقرير مراقبة').length
  }), []);

  const tabs: Array<{ id: typeof active; label: string; icon: string }> = [
    { id: 'inbox', label: 'الواردات (Imports)', icon: '📥' },
    { id: 'outbox', label: 'الصادرات (Exports)', icon: '📤' },
    { id: 'supervision', label: 'مراسلات المراقبة', icon: '⚖️' },
    { id: 'deadlines', label: 'تتبع الآجال', icon: '⏱️' },
    { id: 'archive', label: 'الأرشيف القضائي', icon: '🗄️' },
  ];

  const legalBases = [
    { art: 'المادة 174', title: 'إبداء الرأي والرقابة', desc: 'إشعار إخلال، رأي معلل، طلب رأي' },
    { art: 'المادة 200', title: 'التكوين والتدريب', desc: 'مواكبة المتمرنين، اقتراح مكاتب' },
    { art: 'المادة 103', title: 'تقارير المراقبة', desc: 'نتائج التفتيش الربع سنوي' },
    { art: 'المادة 169-170', title: 'القرارات التنظيمية', desc: 'الاجتماعات واستئناس تنظيمي' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Stats Dashboard */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#023120]"></div>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black text-slate-900 font-amiri tracking-tight">بوابة المراسلات القضائية</h2>
              <p className="text-slate-500 text-sm font-bold mt-1">إدارة التواصل المؤسساتي مع المجلس الجهوي للهيئة الوطنية للعدول</p>
              <div className="flex items-center gap-6 mt-6">
                 <div className="bg-slate-50 rounded-2xl px-6 py-4 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي المراسلات</p>
                    <p className="text-2xl font-black text-[#023120]">{stats.total}</p>
                 </div>
                 <div className="bg-amber-50 rounded-2xl px-6 py-4 border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">قيد المعالجة</p>
                    <p className="text-2xl font-black text-amber-700">{stats.pending}</p>
                 </div>
                 <div className="bg-red-50 rounded-2xl px-6 py-4 border border-red-100">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">مراسلات متأخرة</p>
                    <p className="text-2xl font-black text-red-700">{stats.late}</p>
                 </div>
                 <div className="bg-blue-50 rounded-2xl px-6 py-4 border border-blue-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">مراسلات المراقبة</p>
                    <p className="text-2xl font-black text-blue-700">{stats.supervision}</p>
                 </div>
              </div>
            </div>
            <button
              onClick={() => setComposeOpen(true)}
              className="bg-[#023120] text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-900/20 hover:bg-black transition-all flex items-center gap-3"
            >
              <span>📄</span>
              <span>إنشاء مراسلة جديدة</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation & Legal Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-4 pb-2">أقسام الديوان</p>
            <div className="space-y-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-right text-sm font-bold transition-all ${
                    active === t.id 
                    ? 'bg-[#023120] text-white shadow-lg' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-10">⚖️</div>
            <h3 className="text-xl font-black font-amiri mb-4 border-b border-white/10 pb-4">الأساس القانوني</h3>
            <div className="space-y-6">
              {legalBases.map((law, idx) => (
                <div 
                  key={idx} 
                  className={`cursor-pointer group ${selectedLaw === law.art ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                  onClick={() => setSelectedLaw(selectedLaw === law.art ? null : law.art)}
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-[#E6BE8A] text-[#023120] px-2 py-0.5 rounded text-[10px] font-black font-sans">Art.{law.art}</span>
                    <span className="text-xs font-black group-hover:text-[#E6BE8A] transition-colors">{law.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 mr-3 leading-relaxed">{law.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* List View Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">🔍</div>
            <input 
              type="text" 
              placeholder="بحث في أرشيف المراسلات، الأرقام المرجعية، أو الأطراف..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 placeholder:text-slate-300"
            />
          </div>

          <div className="space-y-4">
            {filtered.map((c) => (
              <div key={c.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:border-[#023120]/10 transition-all group overflow-hidden relative">
                {c.urgency === 'فوري' && <div className="absolute top-0 right-0 w-2.5 h-full bg-red-600 animate-pulse"></div>}
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-start gap-6 flex-1">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner transition-transform group-hover:scale-110 duration-500 ${
                      c.direction === 'وارد' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {c.type === 'إشعار إخلال مهني' || c.type === 'تقرير مراقبة' ? '⚖️' : c.direction === 'وارد' ? '📥' : '📤'}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-sans text-[10px] font-black py-1 px-4 bg-slate-900 text-white rounded-full shadow-lg shadow-black/10">#{c.id}</span>
                        <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-lg uppercase tracking-tighter border border-amber-200">⚖️ {c.legalBasis}</span>
                        {c.deadline && (
                          <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg flex items-center gap-1.5 border border-red-100 italic">
                             <span className="animate-pulse">⏳</span> أجل الرد: {c.deadline}
                          </span>
                        )}
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{c.type}</span>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 font-amiri leading-tight group-hover:text-[#023120] transition-colors">{c.subject}</h4>
                      <div className="flex items-center gap-4 text-[12px] font-bold text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="opacity-50">{c.direction === 'وارد' ? 'من:' : 'إلى:'}</span>
                          <span className="text-slate-600">{c.correspondent}</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                        <div className="flex items-center gap-2">
                          <span className="opacity-50">التاريخ:</span>
                          <span className="text-slate-600 font-sans">{c.date}</span>
                        </div>
                        {c.attachments && (
                          <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                             <span>📎</span> <span>{c.attachments} مرفقات</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pr-8 border-r-2 border-slate-50">
                    <div className="flex flex-col items-center gap-2 min-w-[100px]">
                       <StatusPill status={c.status} />
                       <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                         c.urgency === 'فوري' ? 'text-red-600 border border-red-200 bg-red-50' :
                         c.urgency === 'مستعجل' ? 'text-amber-600 border border-amber-200 bg-amber-50' :
                         'text-slate-400'
                       }`}>
                         {c.urgency}
                       </div>
                    </div>
                    <button 
                      className="w-14 h-14 bg-[#023120] text-[#E6BE8A] rounded-2xl flex items-center justify-center hover:bg-black shadow-xl shadow-emerald-900/10 transition-all transform hover:rotate-12 active:scale-95"
                      onClick={() => setSelectedCorr(c)}
                      title="معاينة المراسلة والمسار الزمني"
                    >
                      <span className="text-lg">📄</span>
                    </button>
                  </div>
                </div>

                {/* Tracking Progress - Institutional Timeline Segment */}
                <div className="mt-8 pt-5 border-t border-slate-100 flex items-center gap-6">
                   <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] whitespace-nowrap">Status Progress</div>
                   <div className="flex-1 flex items-center gap-3">
                      <div className="h-1.5 flex-1 bg-[#023120] rounded-full shadow-inner"></div>
                      <div className={`h-1.5 flex-1 rounded-full ${c.status === 'قيد المعالجة' || c.status === 'مكتمل' ? 'bg-[#023120]' : 'bg-slate-100'}`}></div>
                      <div className={`h-1.5 flex-1 rounded-full ${c.status === 'مكتمل' ? 'bg-[#023120]' : 'bg-slate-100'}`}></div>
                      <div className="h-1.5 w-12 bg-slate-100 rounded-full"></div>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      <span>✔️</span>
                      <span>Verified Digital Signature</span>
                   </div>
                </div>
              </div>
            ))}


            {filtered.length === 0 && (
              <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
                  <div className="text-6xl grayscale opacity-20">📂</div>
                  <div>
                    <h5 className="text-xl font-black text-slate-300 font-amiri">لا توجد سجلات مطابقة</h5>
                    <p className="text-slate-400 text-sm font-bold">يرجى المحاولة بمعايير بحث مختلفة أو تحديد أساس قانوني آخر</p>
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal - Institutional Drafting Terminal */}
      {composeOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-500 text-right">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-[#E6BE8A]/10 to-transparent"></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-16 h-16 rounded-[1.5rem] bg-[#E6BE8A] text-slate-900 flex items-center justify-center text-3xl shadow-lg">✍️</div>
                <div>
                  <h2 className="text-3xl font-black font-amiri tracking-tight">محرر المراسلات القضائية</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Institutional Judicial Drafting Terminal</p>
                </div>
              </div>
              <button onClick={() => setComposeOpen(false)} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all z-10 text-xl font-bold">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
              <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">نوع المراسلة</label>
                    <select 
                      className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-700 focus:border-[#023120] transition-all outline-none appearance-none cursor-pointer shadow-sm"
                      value={compose.type}
                      onChange={(e) => setCompose(p => ({ ...p, type: e.target.value as any }))}
                    >
                      <option value="إشعار إخلال مهني">إشعار إخلال مهني</option>
                      <option value="طلب رأي قانوني">طلب رأي قانوني</option>
                      <option value="مراسلة تدريب">مراسلة تدريب</option>
                      <option value="طلب معلومات مهنية">طلب معلومات مهنية</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">الأساس القانوني</label>
                    <select 
                      className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-700 focus:border-[#023120] transition-all outline-none appearance-none cursor-pointer shadow-sm"
                      value={compose.legalBasis}
                      onChange={(e) => setCompose(p => ({ ...p, legalBasis: e.target.value }))}
                    >
                      <option>المادة 174</option>
                      <option>المادة 200</option>
                      <option>المادة 103</option>
                      <option>المادة 169-170</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">درجة الاستعجال</label>
                    <select 
                      className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-700 focus:border-[#023120] transition-all outline-none appearance-none cursor-pointer shadow-sm"
                      value={compose.urgency}
                      onChange={(e) => setCompose(p => ({ ...p, urgency: e.target.value as any }))}
                    >
                      <option value="عادي">عادي</option>
                      <option value="مستعجل">مستعجل ⚠️</option>
                      <option value="فوري">فوري 🚨</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">الجهة المستلمة</label>
                    <input 
                      type="text" 
                      value={compose.correspondent}
                      readOnly
                      className="w-full bg-slate-100 border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-400" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">أجل الرد المتوقع</label>
                    <input 
                      type="date" 
                      className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl font-sans font-black text-slate-700 focus:border-[#023120] transition-all shadow-sm outline-none" 
                      value={compose.deadline}
                      onChange={(e) => setCompose(p => ({ ...p, deadline: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">موضوع المراسلة</label>
                  <input 
                    type="text" 
                    placeholder="عنوان واضح وملخص للمحتوى القانوني..." 
                    className="w-full bg-white border-2 border-slate-100 p-6 rounded-2xl font-bold text-slate-700 focus:border-[#023120] transition-all outline-none shadow-sm" 
                    value={compose.subject}
                    onChange={(e) => setCompose(p => ({ ...p, subject: e.target.value }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">منطوق المراسلة (المضمون)</label>
                  <textarea 
                    rows={8} 
                    className="w-full bg-white border-2 border-slate-100 p-8 rounded-[2rem] font-bold text-slate-700 focus:border-[#023120] transition-all outline-none shadow-sm text-lg font-amiri leading-loose"
                    value={compose.body}
                    onChange={(e) => setCompose(p => ({ ...p, body: e.target.value }))}
                  ></textarea>
                </div>

                <div className="bg-[#023120]/5 p-8 rounded-[2rem] flex items-start gap-6 border border-[#023120]/10">
                   <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-[#023120]/5">📎</div>
                   <div className="flex-1 space-y-2">
                       <h5 className="font-black text-slate-900 text-sm">إرفاق المستندات المدعمة</h5>
                       <p className="text-xs text-slate-500 font-bold">يمكنك إرفاق تقارير التفتيش، شكايات المواطنين، أو نسخ من الرسوم محل النزاع (PDF, JPG, PNG)</p>
                       <button className="mt-2 px-6 py-2 bg-[#023120] text-white rounded-xl text-[10px] font-black hover:bg-black transition-all">اختر الملفات</button>
                   </div>
                </div>
              </form>
            </div>

            <div className="p-10 bg-white border-t border-slate-100 flex justify-between items-center shadow-[0_-15px_40px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-4 text-emerald-800">
                 <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">🔐</div>
                 <span className="text-[10px] font-black uppercase tracking-tighter">التوقيع الإلكتروني القضائي مفعل</span>
              </div>
              <div className="flex gap-6">
                <button onClick={() => setComposeOpen(false)} className="px-10 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all">حفظ كمسودة</button>
                <button 
                  className="px-14 py-5 bg-[#023120] text-[#E6BE8A] rounded-[2rem] font-black text-xs shadow-2xl hover:bg-black transition-all flex items-center gap-3"
                  onClick={() => {
                    alert('تم تشفير المراسلة وإرسالها للمجلس الجهوي عبر القناة المؤمنة.');
                    setComposeOpen(false);
                  }}
                >
                  <span>⚖️</span>
                  <span>اعتماد وإرسال</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewer Modal - Institutional Document Review */}
      {selectedCorr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white rounded-[3.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-500 text-right">
              <div className="bg-[#023120] p-12 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none select-none overflow-hidden">
                   <div className="text-[20rem] -mt-20 -ml-20 rotate-12">⚖️</div>
                </div>
                <div className="relative z-10 flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="bg-[#E6BE8A] text-[#023120] px-3 py-1 rounded-full text-[10px] font-black font-sans uppercase tracking-[0.2em]">{selectedCorr.id}</span>
                    <span className="text-slate-400 text-xs font-bold tracking-widest italic">{selectedCorr.legalBasis} • {selectedCorr.type}</span>
                    {selectedCorr.deadline && (
                       <span className="bg-red-500/20 text-red-200 px-3 py-1 rounded-full text-[10px] font-black border border-red-500/30">⏳ الأجل: {selectedCorr.deadline}</span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                      selectedCorr.urgency === 'فوري' ? 'bg-red-600 text-white border-red-400 animate-pulse' :
                      selectedCorr.urgency === 'مستعجل' ? 'bg-amber-500 text-white border-amber-300' :
                      'bg-white/10 text-white border-white/20'
                    }`}>
                      {selectedCorr.urgency}
                    </span>
                  </div>
                  <h2 className="text-4xl font-black font-amiri leading-tight">{selectedCorr.subject}</h2>
                </div>
                <button onClick={() => setSelectedCorr(null)} className="w-16 h-16 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all z-10 text-2xl font-bold">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-16 custom-scrollbar bg-slate-50/50">
                 <div className="max-w-3xl mx-auto space-y-12">
                    <div className="grid grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">جهة الإرسال</label>
                          <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 font-bold text-slate-800 shadow-sm flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">🏢</div>
                             {selectedCorr.direction === 'وارد' ? selectedCorr.correspondent : 'ديوان قاضي التوثيق'}
                          </div>
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">جهة الاستلام</label>
                          <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 font-bold text-slate-800 shadow-sm flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">⚖️</div>
                             {selectedCorr.direction === 'صادر' ? selectedCorr.correspondent : 'ديوان قاضي التوثيق'}
                          </div>
                       </div>
                    </div>

                    <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-100 shadow-xl space-y-8 relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-2 h-full bg-[#023120]"></div>
                       <div className="flex justify-between items-start border-b border-slate-100 pb-8">
                          <div>
                             <h4 className="text-[10px] font-black text-[#023120] uppercase tracking-[0.3em] mb-2">منطوق المراسلة والمضمون القانوني</h4>
                             <p className="text-2xl font-black font-amiri text-slate-900 leading-loose text-justify">
                                بناءً على الصلاحيات المخولة لقاضي التوثيق بموجب المادة 174 من القانون المنظم، وعطفاً على المراسلة المسجلة تحت رقم {selectedCorr.id}، نود إحاطتكم علماً بأنه قد تم البت في الطلب وفقاً للمساطر المعمول بها.
                                <br /><br />
                                يرجى من المصالح الإدارية للمجلس الجهوي اتخاذ ما يلزم من إجراءات لضمان انسيابية العمل المهني والتقيد بالآجال القانونية المحددة.
                             </p>
                          </div>
                       </div>

                       <div className="pt-8 flex justify-between items-end">
                          <div className="flex gap-4 items-center">
                             <div className="w-20 h-20 rounded-full bg-slate-50 border-4 border-white shadow-inner flex items-center justify-center text-3xl grayscale opacity-30">🔏</div>
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400">ختم قاضي التوثيق</p>
                                <p className="font-sans text-[8px] text-slate-300 font-bold">DIGITAL JUDICIAL SEAL VERIFIED</p>
                             </div>
                          </div>
                          <div className="text-center">
                             <div className="w-24 h-1 bg-slate-900 mx-auto mb-2 rounded-full"></div>
                             <p className="font-black text-slate-900 text-sm font-amiri underline">إمضاء السيد القاضي</p>
                          </div>
                       </div>
                    </div>

                    {/* Timeline / Audit Log */}
                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">سجل التعديلات والمسار الزمني (Audit Log)</h5>
                       <div className="relative pr-8 space-y-8 before:absolute before:right-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                          <div className="relative flex items-center gap-6">
                             <div className="absolute right-0 w-8 h-8 rounded-full bg-emerald-600 border-4 border-white shadow-sm z-10 flex items-center justify-center text-[10px] text-white">✓</div>
                             <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                <div>
                                   <p className="text-sm font-black text-slate-900">إنشاء المراسلة وتوقيعها</p>
                                   <p className="text-[10px] text-slate-400 font-bold">بواسطة السيد القاضي • نظام التوثيق الرقمي</p>
                                </div>
                                <span className="text-[10px] font-sans font-black text-slate-300">2026-01-20 09:12 AM</span>
                             </div>
                          </div>
                          <div className="relative flex items-center gap-6">
                             <div className="absolute right-0 w-8 h-8 rounded-full bg-blue-600 border-4 border-white shadow-sm z-10 flex items-center justify-center text-[10px] text-white">📩</div>
                             <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                <div>
                                   <p className="text-sm font-black text-slate-900">تأكيد الاستلام من طرف المجلس الجهوي</p>
                                   <p className="text-[10px] text-slate-400 font-bold">بوابة الهيئة الوطنية للعدول</p>
                                </div>
                                <span className="text-[10px] font-sans font-black text-slate-300">2026-01-20 11:45 AM</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-12 bg-slate-50 border-t border-slate-100 flex justify-end gap-6 shadow-[0_-20px_50px_rgba(0,0,0,0.02)]">
                 <button onClick={() => setSelectedCorr(null)} className="px-10 py-5 bg-white text-slate-400 border border-slate-200 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all">إغلاق المعاينة</button>
                 <button className="px-14 py-5 bg-[#023120] text-[#E6BE8A] rounded-[2rem] font-black text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3">
                    <span>🖨️</span>
                    <span>طباعة النسخة المعتمدة</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
function NotaryRegistry() {
  const [q, setQ] = useState('');
  const items = useMemo(
    () => [
      { id: 'N-01', name: 'محمد العلوي', region: 'الرباط', notes: 2, warnings: 0 },
      { id: 'N-02', name: 'أمين الزهيري', region: 'الدار البيضاء', notes: 5, warnings: 1 },
      { id: 'N-03', name: 'سلمى الإدريسي', region: 'فاس', notes: 1, warnings: 0 },
    ],
    []
  );

  const filtered = useMemo(() => {
    const v = q.trim();
    if (!v) return items;
    return items.filter((n) => n.name.includes(v) || n.region.includes(v));
  }, [items, q]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="text-right">
            <div className="text-2xl font-extrabold text-slate-900">سجل العدل</div>
            <div className="mt-1 text-sm text-slate-600">تنبيه داخلي: هذه المعطيات مخصصة لأغراض التتبع الإداري فقط.</div>
          </div>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm md:w-72"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم أو المدينة…"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((n) => (
          <div key={n.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-right">
                <div className="text-lg font-extrabold text-slate-900">{n.name}</div>
                <div className="mt-1 text-sm text-slate-600">المدينة/الإقليم: {n.region}</div>
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => alert('فتح بطاقة العدل (قيد التطوير).')}
              >
                عرض
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-xs font-semibold text-slate-500">ملاحظات سابقة</div>
                <div className="mt-1 text-xl font-extrabold text-slate-900">{n.notes}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-xs font-semibold text-slate-500">إنذارات</div>
                <div className="mt-1 text-xl font-extrabold text-slate-900">{n.warnings}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function ReportsPage() {
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const submissionsQuery = trpc.judge.listSubmissions.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken, retry: false }
  );

  const submissions = submissionsQuery.data ?? [];

  const reportData = useMemo(() => {
    const statusCounts = {
      pending: 0,
      in_review: 0,
      accepted: 0,
      accepted_with_notes: 0,
      substantive_notes: 0,
    };
    const typeCounts = {
      marriage: 0,
      divorce: 0,
      property: 0,
      inheritance: 0,
      other: 0,
    };

    for (const row of submissions) {
      if (row.status === 'pending') statusCounts.pending += 1;
      if (row.status === 'in_review') statusCounts.in_review += 1;
      if (row.status === 'accepted') statusCounts.accepted += 1;
      if (row.status === 'accepted_with_notes') statusCounts.accepted_with_notes += 1;
      if (row.status === 'substantive_notes') statusCounts.substantive_notes += 1;

      const doc = String(row.documentType || '').trim();
      if (doc.includes('زواج')) typeCounts.marriage += 1;
      else if (doc.includes('طلاق')) typeCounts.divorce += 1;
      else if (
        doc.includes('بيع') ||
        doc.includes('شراء') ||
        doc.includes('ملكية') ||
        doc.includes('حيازة') ||
        doc.includes('رهن') ||
        doc.includes('هبة')
      ) typeCounts.property += 1;
      else if (doc.includes('إراث') || doc.includes('اراث') || doc.includes('فريضة') || doc.includes('وصية') || doc.includes('متروك')) typeCounts.inheritance += 1;
      else typeCounts.other += 1;
    }

    const total = submissions.length;
    const completed = statusCounts.accepted + statusCounts.accepted_with_notes;
    const open = statusCounts.pending + statusCounts.in_review;
    const todayIso = new Date().toISOString().slice(0, 10);
    const todayCount = submissions.filter((row) => String(row.createdAt || '').slice(0, 10) === todayIso).length;

    return {
      total,
      todayCount,
      statusCounts,
      typeCounts,
      completed,
      open,
      familyTotal: typeCounts.marriage + typeCounts.divorce,
      propertyCluster: typeCounts.property + typeCounts.inheritance + typeCounts.other,
    };
  }, [submissions]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl border border-slate-200 transition-all font-bold text-sm"
          >
            <span>←</span> العودة
          </button>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-slate-900">الإحصائيات والتقارير</div>
            <div className="mt-1 text-sm text-slate-600">قراءة تحليلية خاصة بهذا القاضي اعتماداً على الرسوم المحالة إليه فقط.</div>
          </div>
        </div>
      </div>

      {submissionsQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-28 animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-100"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[...Array(2)].map((_, idx) => (
              <div key={idx} className="h-72 animate-pulse rounded-[2rem] border border-slate-200 bg-slate-100"></div>
            ))}
          </div>
        </div>
      ) : submissionsQuery.error ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-right text-sm font-bold text-red-700">
          تعذر تحميل تقارير القاضي: {submissionsQuery.error.message}
        </div>
      ) : (
        <>
          <ReportsSectionCard
            title="نظرة عامة على النشاط العام"
            subtitle="المعطيات أدناه تخص الرسوم والملفات التي مرت عبر هذا القاضي."
            icon="📊"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <JudgeReportsStatCard label="عدد الرسوم حسب النوع" value={reportData.total} hint="مجموع الرسوم المحالة" />
              <JudgeReportsStatCard label="المقبولة / المعلقة" value={reportData.completed} hint={`${reportData.open} ملفات ما زالت مفتوحة`} />
              <JudgeReportsStatCard label="عدد الإحالات اليوم" value={reportData.todayCount} hint="حسب تاريخ الإحالة" />
            </div>
          </ReportsSectionCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ReportsSectionCard
              title="المقارنة النوعية والمؤشرات المرجعية"
              subtitle="توزيع الملفات حسب الحالة الإجرائية."
              icon="📈"
            >
              <div className="space-y-4">
                <JudgeReportsBarRow label="جديد" count={reportData.statusCounts.pending} total={reportData.total} color="bg-blue-500" />
                <JudgeReportsBarRow label="قيد الدراسة" count={reportData.statusCounts.in_review} total={reportData.total} color="bg-amber-500" />
                <JudgeReportsBarRow label="مقبول" count={reportData.statusCounts.accepted} total={reportData.total} color="bg-emerald-500" />
                <JudgeReportsBarRow label="مقبول مع ملاحظات" count={reportData.statusCounts.accepted_with_notes} total={reportData.total} color="bg-violet-500" />
                <JudgeReportsBarRow label="ملاحظات جوهرية" count={reportData.statusCounts.substantive_notes} total={reportData.total} color="bg-rose-500" />
              </div>
            </ReportsSectionCard>

            <ReportsSectionCard
              title="إحصائيات التصنيف النوعي"
              subtitle="توزيع الملفات حسب طبيعة الرسم."
              icon="🗂️"
            >
              <div className="space-y-4">
                <JudgeReportsBarRow label="الزواج" count={reportData.typeCounts.marriage} total={reportData.total} color="bg-fuchsia-500" />
                <JudgeReportsBarRow label="الطلاق" count={reportData.typeCounts.divorce} total={reportData.total} color="bg-red-500" />
                <JudgeReportsBarRow label="الأملاك" count={reportData.typeCounts.property} total={reportData.total} color="bg-orange-500" />
                <JudgeReportsBarRow label="التركات" count={reportData.typeCounts.inheritance} total={reportData.total} color="bg-cyan-500" />
                <JudgeReportsBarRow label="باقي الوثائق" count={reportData.typeCounts.other} total={reportData.total} color="bg-slate-500" />
              </div>
            </ReportsSectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <ReportsSectionCard
              title="إحصائيات سجلات و عقود قضايا الأسرة"
              subtitle="ملخص الملفات الأسرية لدى هذا القاضي."
              icon="📚"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <JudgeReportsStatCard label="الطلاق" value={reportData.typeCounts.divorce} hint="ملفات الطلاق" />
                <JudgeReportsStatCard label="الزواج" value={reportData.typeCounts.marriage} hint="ملفات الزواج" />
                <JudgeReportsStatCard label="قضايا معلقة" value={reportData.open} hint="ضمن السجل الأسري" />
                <JudgeReportsStatCard label="مقبولة" value={reportData.completed} hint="قبول أو قبول مع ملاحظات" />
              </div>
            </ReportsSectionCard>

            <ReportsSectionCard
              title="إحصائيات العقار، التركات، و الباقيات"
              subtitle="التوزيع غير الأسري ضمن مكتب هذا القاضي."
              icon="🏘️"
            >
              <div className="space-y-4">
                <JudgeReportsBarRow label="الأملاك" count={reportData.typeCounts.property} total={Math.max(reportData.propertyCluster, 1)} color="bg-amber-500" />
                <JudgeReportsBarRow label="التركات" count={reportData.typeCounts.inheritance} total={Math.max(reportData.propertyCluster, 1)} color="bg-sky-500" />
                <JudgeReportsBarRow label="باقي الوثائق" count={reportData.typeCounts.other} total={Math.max(reportData.propertyCluster, 1)} color="bg-slate-500" />
              </div>
            </ReportsSectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ReportsSectionCard
              title="التسجيل النوعي للطلاق"
              subtitle="حصة هذا القاضي داخل مسار ملفات الطلاق."
              icon="📄"
              accent="maroon"
            >
              <div className="space-y-4">
                <JudgeReportsBarRow label="إجمالي ملفات الطلاق" count={reportData.typeCounts.divorce} total={Math.max(reportData.familyTotal, 1)} color="bg-[#f3c57b]" dark />
                <JudgeReportsBarRow label="مفتوحة" count={reportData.statusCounts.pending + reportData.statusCounts.in_review} total={Math.max(reportData.total, 1)} color="bg-[#f0e4b6]" dark />
                <JudgeReportsBarRow label="محسومة" count={reportData.completed} total={Math.max(reportData.total, 1)} color="bg-[#ffd78a]" dark />
              </div>
            </ReportsSectionCard>

            <ReportsSectionCard
              title="التسجيل النوعي للزواج"
              subtitle="حصة ملفات الزواج لدى هذا القاضي."
              icon="💍"
            >
              <div className="space-y-4">
                <JudgeReportsBarRow label="إجمالي ملفات الزواج" count={reportData.typeCounts.marriage} total={Math.max(reportData.familyTotal, 1)} color="bg-violet-500" />
                <JudgeReportsBarRow label="مقبولة" count={reportData.statusCounts.accepted + reportData.statusCounts.accepted_with_notes} total={Math.max(reportData.total, 1)} color="bg-emerald-500" />
                <JudgeReportsBarRow label="ملاحظات جوهرية" count={reportData.statusCounts.substantive_notes} total={Math.max(reportData.total, 1)} color="bg-rose-500" />
              </div>
            </ReportsSectionCard>
          </div>

          <ReportsSectionCard
            title="حصيلة نشاط التوثيق"
            subtitle="مؤشرات سريعة عن حجم العمل والإنجاز في مكتب هذا القاضي."
            icon="🧾"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <JudgeReportsStatCard label="الرسوم المحالة" value={reportData.total} hint="إجمالي الملفات" />
              <JudgeReportsStatCard label="الملفات المفتوحة" value={reportData.open} hint="جديد + قيد الدراسة" />
              <JudgeReportsStatCard label="الملفات المحسومة" value={reportData.completed} hint="قرارات صادرة" />
              <JudgeReportsStatCard label="الملفات الأسرية" value={reportData.familyTotal} hint="زواج وطلاق" />
            </div>
          </ReportsSectionCard>
        </>
      )}
    </div>
  );
}
function ArchivePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl border border-slate-200 transition-all font-bold text-sm"
            >
              <span>←</span> العودة
            </button>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-slate-900">الأرشفة القضائية</div>
              <div className="mt-1 text-sm text-slate-600">أرشفة جميع الرسوم بنفس الرقم التسلسلي وسجل البيانات (قيد التطوير).</div>
            </div>
          </div>
          <input className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm md:w-80" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث متقدم…" />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
        نتائج الأرشيف ستظهر هنا بعد ربطها بمخزن البيانات.
        {q ? <div className="mt-2 text-xs text-slate-500">بحث: {q}</div> : null}
      </div>
    </div>
  );
}
function AlertsPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl border border-slate-200 transition-all font-bold text-sm"
          >
            <span>←</span> العودة
          </button>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-slate-900">الإنذارات والشكايات</div>
            <div className="mt-1 text-sm text-slate-600">إنذارات للعدول + شكايات تقنية/تنظيمية/مهنية (قيد التطوير).</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-right font-extrabold text-slate-900">🔔 إنذارات للعدول</div>
          <div className="mt-3 space-y-2 text-right text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">تأخر — مثال</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">نقص — مثال</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">مخالفة شكلية — مثال</div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-right font-extrabold text-slate-900">📩 شكايات</div>
          <div className="mt-3 space-y-2 text-right text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">شكاية تقنية — مثال</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">شكاية تنظيمية — مثال</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">شكاية مهنية — مثال</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditLogPage() {
  const navigate = useNavigate();
  const entries = [
    { ts: 'اليوم 09:14', action: 'فتح رسم', ref: '2025/00123' },
    { ts: 'اليوم 09:18', action: 'إرسال ملاحظات', ref: '2025/00123' },
    { ts: 'أمس 16:10', action: 'أرشفة مراسلة', ref: 'C-3002' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl border border-slate-200 transition-all font-bold text-sm"
          >
            <span>←</span> العودة
          </button>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-slate-900">سجل التدقيق (Audit Log)</div>
            <div className="mt-1 text-sm text-slate-600">كل إجراء مؤرخ وقابل للتتبع (قيد التطوير).</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          {entries.map((e, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-600">{e.ts}</div>
              <div className="text-right text-sm font-bold text-slate-900">
                {e.action} · <span className="font-extrabold">{e.ref}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function JudgePortal() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  
  const isAnyJudge = user.role === 'authentication_judge' || user.role === 'regional_judge' || user.role === 'supreme_judge';
  if (!isAnyJudge) return <Navigate to="/unauthorized" replace />;

  return (
    <JudgeShell>
      <Routes>
        <Route index element={<JudgeDashboard />} />
        <Route path="official" element={<JudgeOfficialIndexation />} />
        <Route path="notifications" element={<JudgeNotificationsPage />} />
        <Route path="office-movement" element={<OfficeMovementPage />} />
        <Route path="work-certificates" element={<WorkCertificateProcessingPage />} />
        <Route path="scientific-permissions" element={<ScientificPermissionsPage />} />
        <Route path="marriage-permissions" element={<MarriagePermissionsPage />} />
        <Route path="adl-copy-permissions" element={<AdlCopyPermissionsPage />} />
        <Route path="individual-reception" element={<IndividualReceptionPermissionsPage />} />
        <Route path="deeds" element={<JudicialDeedsDashboard />} />
        <Route path="deeds/:id" element={<JudicialDeedsAuditPlatform />} />
        <Route path="permissions" element={<Navigate to="marriage-permissions" replace />} />
        <Route path="remote-hearings" element={<JudgeRemoteHearings />} />
        <Route path="correspondence" element={<CorrespondenceHub />} />
        <Route path="messages" element={<MessagingInbox mode="judge" />} />
        <Route path="notaries" element={<NotaryRegistry />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="oversight" element={<JudicialOversightManagement />} />
        <Route path="judicial-speech" element={<JudicialSpeechModule />} />
        <Route path="final-archiving" element={<JudgeFinalArchiving />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="*" element={<Navigate to="/judge" replace />} />
      </Routes>
    </JudgeShell>
  );
}

export default JudgePortal;

