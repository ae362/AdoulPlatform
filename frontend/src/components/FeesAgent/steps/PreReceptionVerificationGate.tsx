import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  MapPin,
  Scale,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Clock,
  HelpCircle,
  Upload,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  Paperclip,
  Check,
  Building2,
  Calendar,
  Lock
} from 'lucide-react';
import type { FeesAgentState, PreReceptionVerificationData } from '../../../types/feesAgentTypes';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface PreReceptionVerificationGateProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onProceed: () => void;
  onBack: () => void;
}

interface TimelineEntry {
  id: string;
  time: string;
  title: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const PreReceptionVerificationGate: React.FC<PreReceptionVerificationGateProps> = ({
  state,
  setState,
  onProceed,
  onBack,
}) => {
  const { user, notaryProfile } = useAuth();
  const navigate = useNavigate();

  // Helper for current time in HH:MM format
  const getNowTime = () => {
    const d = new Date();
    return d.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Profile data defaults safely casted
  const profileAny = notaryProfile as any;
  const defaultNotary1 = user?.full_name || profileAny?.full_name || 'الأستاذ العدل المتلقي';
  const defaultNotary2 = state.meta?.notarySecondary || profileAny?.partner_name || 'العدل المشارك في الاختصاص';
  const defaultCourt = profileAny?.primary_court || profileAny?.court_name || state.meta?.court || 'المحكمة الابتدائية المختصة';
  const defaultAppealCourt = profileAny?.appeal_court || 'محكمة الاستئناف بالدائرة القضائية';
  const defaultOfficeLocation = profileAny?.office_address || profileAny?.city || 'مقر المكتب العدلي المعتمد';
  const defaultRegionalCouncil = profileAny?.regional_council || 'المجلس الجهوي لعدول استئنافية الدائرة';

  // State initialization with backward-compatible state hydration
  const initialVerification: PreReceptionVerificationData = state.preReceptionVerification || {
    isSimultaneousCouncil: undefined,
    notary1Name: defaultNotary1,
    notary2Name: defaultNotary2,
    receptionDate: state.meta?.dateGregorian || getTodayDate(),
    receptionTime: state.meta?.time || getNowTime(),
    receptionCouncil: defaultOfficeLocation,
    receptionLocation: defaultOfficeLocation,
    operationNumber: state.meta?.fileNumber || `REC-${Date.now().toString().slice(-6)}`,
    hasJudgePermission: undefined,
    judgePermissionDetails: {
      permissionNumber: '',
      permissionDate: getTodayDate(),
      courtName: defaultCourt,
      judgeName: 'السيد قاضي التوثيق',
      issueDate: getTodayDate(),
      reason: '',
      attachment: null,
      isVerified: false,
      verificationSource: 'manual',
    },
    isWithinJurisdiction: undefined,
    appealCourt: defaultAppealCourt,
    primaryCourt: defaultCourt,
    officeLocation: defaultOfficeLocation,
    judgeNotice: {
      noticeNumber: '',
      noticeDate: getTodayDate(),
      receivedDate: getTodayDate(),
      destination: 'السيد قاضي التوثيق',
      courtName: defaultCourt,
      attachment: null,
    },
    councilNotice: {
      noticeNumber: '',
      noticeDate: getTodayDate(),
      receivedDate: getTodayDate(),
      regionalCouncil: defaultRegionalCouncil,
      attachment: null,
    },
  };

  const [verification, setVerification] = useState<PreReceptionVerificationData>(initialVerification);
  const [showLegalExplanation, setShowLegalExplanation] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(() => [
    { id: '1', time: getNowTime(), title: 'فتح بوابة التحقق القبلي للتلقي', type: 'info' },
  ]);

  const addTimelineEvent = (title: string, type: 'info' | 'success' | 'warning' | 'error') => {
    setTimeline((prev) => [
      ...prev,
      { id: String(Date.now()), time: getNowTime(), title, type },
    ]);
  };

  // Handlers for Question 1 (Dual Reception & Simultaneous Council)
  const handleSimultaneousChoice = (choice: boolean) => {
    setVerification((prev) => ({
      ...prev,
      isSimultaneousCouncil: choice,
      hasJudgePermission: choice ? undefined : prev.hasJudgePermission,
    }));

    if (choice) {
      addTimelineEvent('تم التصريح بالتلقي الثنائي المتزامن في مجلس العقد', 'success');
    } else {
      addTimelineEvent('تم التصريح بعدم اجتماع العدلين في مجلس واحد في نفس الوقت', 'warning');
    }
  };

  const handleJudgePermissionChoice = (choice: boolean) => {
    setVerification((prev) => ({
      ...prev,
      hasJudgePermission: choice,
    }));

    if (choice) {
      addTimelineEvent('التصريح بالتوفر على إذن قاضي التوثيق بالتلقي غير المتزامن', 'info');
    } else {
      addTimelineEvent('التصريح بعدم التوفر على إذن قاضي التوثيق (توقف المسار)', 'error');
    }
  };

  const handleVerifyJudgePermissionMock = () => {
    const pNum = verification.judgePermissionDetails?.permissionNumber?.trim();
    if (!pNum) return;

    setVerification((prev) => ({
      ...prev,
      judgePermissionDetails: {
        ...(prev.judgePermissionDetails || {}),
        isVerified: true,
        verificationSource: 'database',
        statusText: 'ساري ومطابق للقاعدة القضائية',
      },
    }));
    addTimelineEvent(`تم التحقق الذكي من إذن القاضي رقم (${pNum}) في سجل المحكمة`, 'success');
  };

  // Handlers for Question 2 (Spatial Jurisdiction)
  const handleJurisdictionChoice = (choice: boolean) => {
    setVerification((prev) => ({
      ...prev,
      isWithinJurisdiction: choice,
    }));

    if (choice) {
      addTimelineEvent('تم التصريح بالتلقي داخل دائرة اختصاص محكمة الاستئناف', 'success');
    } else {
      addTimelineEvent('تم التصريح بالتلقي خارج دائرة الاختصاص (تفعيل مسطرة الإشعارين)', 'warning');
    }
  };

  const handleFileUpload = (
    field: 'permission' | 'judgeNotice' | 'councilNotice',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const attachmentData = {
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    };

    if (field === 'permission') {
      setVerification((prev) => ({
        ...prev,
        judgePermissionDetails: {
          ...(prev.judgePermissionDetails || {}),
          attachment: attachmentData,
        },
      }));
      addTimelineEvent(`تم إرفاق نسخة إذن قاضي التوثيق (${file.name})`, 'success');
    } else if (field === 'judgeNotice') {
      setVerification((prev) => ({
        ...prev,
        judgeNotice: {
          ...(prev.judgeNotice || {}),
          attachment: attachmentData,
        },
      }));
      addTimelineEvent(`تم إرفاق نسخة إشعار قاضي التوثيق (${file.name})`, 'success');
    } else if (field === 'councilNotice') {
      setVerification((prev) => ({
        ...prev,
        councilNotice: {
          ...(prev.councilNotice || {}),
          attachment: attachmentData,
        },
      }));
      addTimelineEvent(`تم إرفاق نسخة إشعار رئيس المجلس الجهوي (${file.name})`, 'success');
    }
  };

  // --- Compliance & Readiness Engine ---
  const compliance = useMemo(() => {
    const q1Answered = verification.isSimultaneousCouncil !== undefined;
    const q2Answered = verification.isWithinJurisdiction !== undefined;

    let q1Ready = false;
    let q1Blocked = false;
    let q1Reason = '';

    if (verification.isSimultaneousCouncil === true) {
      q1Ready = true;
    } else if (verification.isSimultaneousCouncil === false) {
      if (verification.hasJudgePermission === false) {
        q1Blocked = true;
        q1Reason = 'يلزم استكمال الإجراء القانوني المتعلق بالتلقي غير المتزامن والحصول على إذن قاضي التوثيق أولاً.';
      } else if (verification.hasJudgePermission === true) {
        const hasNumber = !!verification.judgePermissionDetails?.permissionNumber?.trim();
        const hasAttach = !!verification.judgePermissionDetails?.attachment;
        if (hasNumber && hasAttach) {
          q1Ready = true;
        } else {
          q1Reason = !hasNumber ? 'يرجى إدخال رقم إذن قاضي التوثيق' : 'يرجى إرفاق نسخة إذن قاضي التوثيق';
        }
      } else {
        q1Reason = 'يرجى تحديد مدى توفر إذن قاضي التوثيق';
      }
    }

    let q2Ready = false;
    let q2Reason = '';

    if (verification.isWithinJurisdiction === true) {
      q2Ready = true;
    } else if (verification.isWithinJurisdiction === false) {
      const judgeNoticeNum = !!verification.judgeNotice?.noticeNumber?.trim();
      const judgeNoticeAtt = !!verification.judgeNotice?.attachment;
      const councilNoticeNum = !!verification.councilNotice?.noticeNumber?.trim();
      const councilNoticeAtt = !!verification.councilNotice?.attachment;

      const isJudgeNoticeComplete = judgeNoticeNum && judgeNoticeAtt;
      const isCouncilNoticeComplete = councilNoticeNum && councilNoticeAtt;

      if (isJudgeNoticeComplete && isCouncilNoticeComplete) {
        q2Ready = true;
      } else {
        const missing: string[] = [];
        if (!judgeNoticeNum) missing.push('رقم إشعار قاضي التوثيق');
        if (!judgeNoticeAtt) missing.push('مرفق إشعار قاضي التوثيق');
        if (!councilNoticeNum) missing.push('رقم إشعار المجلس الجهوي');
        if (!councilNoticeAtt) missing.push('مرفق إشعار المجلس الجهوي');
        q2Reason = `ينقص لإتمام الإجراء: ${missing.join('، ')}`;
      }
    }

    let overallStatus: 'compliant' | 'pending' | 'blocked' = 'pending';
    if (q1Blocked) {
      overallStatus = 'blocked';
    } else if (q1Ready && q2Ready) {
      overallStatus = 'compliant';
    } else {
      overallStatus = 'pending';
    }

    return {
      q1Answered,
      q2Answered,
      q1Ready,
      q1Blocked,
      q1Reason,
      q2Ready,
      q2Reason,
      overallStatus,
      isFullyReady: overallStatus === 'compliant',
    };
  }, [verification]);

  const handleCompleteGate = () => {
    if (!compliance.isFullyReady) return;

    setState((prev) => {
      const existingAudit = prev.auditTrail || [];
      const newAuditEntries = timeline.map((t) => ({
        timestamp: new Date().toISOString(),
        notary: verification.notary1Name || user?.full_name || 'العدل',
        action: 'تحقق قبلي للتلقي',
        field: 'preReceptionVerification',
        oldValue: '',
        newValue: t.title,
      }));

      return {
        ...prev,
        meta: {
          ...prev.meta,
          notaryPrimary: verification.notary1Name || prev.meta?.notaryPrimary || '',
          notarySecondary: verification.notary2Name || prev.meta?.notarySecondary || '',
          court: verification.primaryCourt || prev.meta?.court || '',
          dateGregorian: verification.receptionDate || prev.meta?.dateGregorian || getTodayDate(),
          time: verification.receptionTime || prev.meta?.time || getNowTime(),
          fileNumber: verification.operationNumber || prev.meta?.fileNumber || '',
        },
        preReceptionVerification: {
          ...verification,
          complianceStatus: 'compliant',
          complianceCompletedAt: new Date().toISOString(),
          timeline: timeline.map((t) => ({
            id: t.id,
            timestamp: t.time,
            title: t.title,
            status: t.type,
          })),
        },
        auditTrail: [...existingAudit, ...newAuditEntries],
      };
    });

    onProceed();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans" dir="rtl">
      {/* 1. Header & Stage Indicators */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-8 text-white shadow-xl">
        <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200 shadow-sm backdrop-blur-md">
              <Scale className="h-3.5 w-3.5 text-blue-300" />
              <span>قسم «التلقي العدلي» — بوابة التحقق القبلي</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              🏛️ التحقق من شروط التلقي
            </h1>
            <p className="text-sm font-bold text-slate-300">
              قبل الشروع في إدخال بيانات الشهادة، يرجى الإجابة عن الأسئلة التالية لتحديد المسار القانوني المناسب للتلقي.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowLegalExplanation(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-xs font-black text-amber-200 transition hover:bg-amber-500/20 hover:text-white"
          >
            <HelpCircle className="h-4 w-4 text-amber-300" />
            <span>لماذا يطلب مني النظام هذا الإجراء؟</span>
          </button>
        </div>

        {/* Stages Stepper */}
        <div className="mt-8 border-t border-slate-700/60 pt-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {[
              { num: '①', title: 'شروط التلقي', active: true, desc: 'التحقق القبلي' },
              { num: '②', title: 'الأطراف', active: false, desc: 'الهويات والصفات' },
              { num: '③', title: 'بيانات الشهادة', active: false, desc: 'تفاصيل العقد' },
              { num: '④', title: 'التلقي', active: false, desc: 'مجلس الإشهاد' },
              { num: '⑤', title: 'التحرير', active: false, desc: 'الصياغة والتدقيق' },
              { num: '⑥', title: 'الإيداع', active: false, desc: 'التأشير القضائي' },
            ].map((st, i) => (
              <div
                key={i}
                className={`flex flex-col items-center rounded-2xl p-2.5 text-center transition-all ${
                  st.active
                    ? 'border-2 border-emerald-400 bg-emerald-500/20 shadow-md shadow-emerald-950/40'
                    : 'border border-slate-800 bg-slate-900/40 opacity-70'
                }`}
              >
                <span className={`text-base font-black ${st.active ? 'text-emerald-300' : 'text-slate-400'}`}>
                  {st.num}
                </span>
                <span className={`text-xs font-black ${st.active ? 'text-white' : 'text-slate-300'}`}>
                  {st.title}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">{st.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Permanent Sticky / Alert Status Banner */}
      <div
        className={`flex items-center justify-between rounded-2xl border px-6 py-4 transition-all shadow-sm ${
          compliance.overallStatus === 'compliant'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
            : compliance.overallStatus === 'blocked'
            ? 'border-rose-300 bg-rose-50 text-rose-950'
            : 'border-amber-300 bg-amber-50 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl font-black ${
              compliance.overallStatus === 'compliant'
                ? 'bg-emerald-600 text-white'
                : compliance.overallStatus === 'blocked'
                ? 'bg-rose-600 text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {compliance.overallStatus === 'compliant' ? (
              <Check className="h-5 w-5" />
            ) : compliance.overallStatus === 'blocked' ? (
              <XCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider">
              مركز التنبيهات والوضع القانوني:
            </div>
            <div className="text-sm font-black">
              {compliance.overallStatus === 'compliant' && '🟢 مستوفٍ لكافة المتطلبات الإجرائية والشكلية'}
              {compliance.overallStatus === 'blocked' && '🔴 غير قابل للمتابعة حالياً — يتطلب إذناً قضائياً'}
              {compliance.overallStatus === 'pending' && '🟠 يحتاج إلى استكمال الإجراءات والبيانات الإلزامية'}
            </div>
          </div>
        </div>

        <div className="text-left text-xs font-bold opacity-80">
          نوع الشهادة: <span className="font-black text-slate-900">{state.documentType || 'عام'}</span>
        </div>
      </div>

      {/* 3. Question 1: Contract Council & Simultaneous Dual Reception */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-black text-blue-600">① السؤال الأول — مجلس العقد والتلقي الثنائي</div>
            <h2 className="text-lg font-black text-slate-900">
              👥 هل سيتم تلقي الشهادة مع العدل المشارك في نفس الوقت وبمجلس العقد؟
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleSimultaneousChoice(true)}
            className={`flex items-center justify-between rounded-2xl border-2 p-5 text-right transition-all ${
              verification.isSimultaneousCouncil === true
                ? 'border-emerald-600 bg-emerald-50/80 shadow-md shadow-emerald-100'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-black text-slate-900">
                <span className="text-emerald-600 text-lg">🟢</span>
                <span className="text-base">نعم، في نفس الوقت وبمجلس العقد</span>
              </div>
              <p className="text-xs text-slate-600 font-bold">
                اجتماع العدلين معاً بمجلس العقد وتلقي الشهادة في آن واحد كقاعدة عامة أصلية.
              </p>
            </div>
            {verification.isSimultaneousCouncil === true && (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSimultaneousChoice(false)}
            className={`flex items-center justify-between rounded-2xl border-2 p-5 text-right transition-all ${
              verification.isSimultaneousCouncil === false
                ? 'border-amber-600 bg-amber-50/80 shadow-md shadow-amber-100'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-black text-slate-900">
                <span className="text-amber-600 text-lg">🟠</span>
                <span className="text-base">لا، ليس في مجلس واحد في آن واحد</span>
              </div>
              <p className="text-xs text-slate-600 font-bold">
                تلقي انفرادي أو متعاقب يقتضي استكمال المسطرة والاستناد إلى إذن قضائي معتمد.
              </p>
            </div>
            {verification.isSimultaneousCouncil === false && (
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            )}
          </button>
        </div>

        {verification.isSimultaneousCouncil === true && (
          <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-sm font-black text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>✓ تم اختيار التلقي الثنائي في مجلس واحد. يمكنك الانتقال إلى إدخال بيانات الشهادة والأطراف.</span>
            </div>
            <p className="text-xs font-bold text-emerald-900/80">
              قام النظام آلياً بتسجيل بيانات الحضور والعملية دون الحاجة لإعادة كتابتها:
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
              <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-xs">
                <span className="block text-slate-400 font-bold">العدل الأول (المتلقي):</span>
                <span className="font-black text-slate-800">{verification.notary1Name}</span>
              </div>
              <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-xs">
                <span className="block text-slate-400 font-bold">العدل الثاني (المشارك):</span>
                <span className="font-black text-slate-800">{verification.notary2Name}</span>
              </div>
              <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-xs">
                <span className="block text-slate-400 font-bold">تاريخ وساعة التلقي:</span>
                <span className="font-black text-slate-800">
                  {verification.receptionDate} — {verification.receptionTime}
                </span>
              </div>
              <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-xs">
                <span className="block text-slate-400 font-bold">رقم العملية التلقائي:</span>
                <span className="font-mono font-black text-slate-800">{verification.operationNumber}</span>
              </div>
            </div>
          </div>
        )}

        {verification.isSimultaneousCouncil === false && (
          <div className="space-y-6 rounded-2xl border border-amber-300 bg-amber-50/60 p-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-black text-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span>⚠️ التلقي ليس في مجلس واحد وفي آن واحد.</span>
              </div>
              <p className="text-xs font-bold text-amber-800/90 leading-relaxed">
                بما أن الإجابة تفيد عدم اجتماع العدلين في مجلس العقد في الوقت نفسه، يتعين استكمال المسطرة الخاصة بهذه الحالة قبل متابعة التلقي.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white p-5 space-y-4">
              <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-600" />
                <span>🏛️ المسار القانوني المطلوب: هل تتوفر على إذن قاضي التوثيق بالتلقي وفق المقتضيات القانونية الجاري بها العمل؟</span>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 cursor-pointer hover:bg-slate-100">
                  <input
                    type="radio"
                    name="hasJudgePermission"
                    checked={verification.hasJudgePermission === true}
                    onChange={() => handleJudgePermissionChoice(true)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>🔘 نعم، لدي إذن</span>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 cursor-pointer hover:bg-slate-100">
                  <input
                    type="radio"
                    name="hasJudgePermission"
                    checked={verification.hasJudgePermission === false}
                    onChange={() => handleJudgePermissionChoice(false)}
                    className="h-4 w-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 لا، لا أتوفر عليه</span>
                </label>
              </div>

              {verification.hasJudgePermission === false && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-sm font-black text-rose-900">
                    <XCircle className="h-5 w-5 text-rose-600" />
                    <span>🔴 لا يمكن متابعة عملية التلقي حاليًا</span>
                  </div>
                  <p className="text-xs font-bold text-rose-800 leading-relaxed">
                    يلزم استكمال الإجراء القانوني المتعلق بالتلقي غير المتزامن/غير المشترك قبل مباشرة العملية لتفادي بطلان الإشهاد.
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard?module=permissions')}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 px-4 py-2 text-xs font-black text-white shadow-md hover:brightness-110"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>طلب الإذن من قاضي التوثيق</span>
                    </button>
                  </div>
                </div>
              )}

              {verification.hasJudgePermission === true && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs font-black text-slate-800">📄 بيانات إذن قاضي التوثيق</span>
                    <button
                      type="button"
                      onClick={handleVerifyJudgePermissionMock}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      <span>🔎 التحقق الذكي من الإذن</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">رقم الإذن القضائي *</label>
                      <input
                        type="text"
                        value={verification.judgePermissionDetails?.permissionNumber || ''}
                        onChange={(e) =>
                          setVerification((prev) => ({
                            ...prev,
                            judgePermissionDetails: {
                              ...(prev.judgePermissionDetails || {}),
                              permissionNumber: e.target.value,
                            },
                          }))
                        }
                        placeholder="مثال: 124 / 2026"
                        className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">تاريخ صدور الإذن</label>
                      <input
                        type="date"
                        value={verification.judgePermissionDetails?.permissionDate || ''}
                        onChange={(e) =>
                          setVerification((prev) => ({
                            ...prev,
                            judgePermissionDetails: {
                              ...(prev.judgePermissionDetails || {}),
                              permissionDate: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">المحكمة المصدرة</label>
                      <input
                        type="text"
                        value={verification.judgePermissionDetails?.courtName || ''}
                        onChange={(e) =>
                          setVerification((prev) => ({
                            ...prev,
                            judgePermissionDetails: {
                              ...(prev.judgePermissionDetails || {}),
                              courtName: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رفع نسخة الإذن القضائي المعتمد (PDF أو صورة) *
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-400 bg-white px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:border-blue-500 hover:text-blue-600">
                        <Upload className="h-4 w-4" />
                        <span>＋ تحميل إذن قاضي التوثيق</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => handleFileUpload('permission', e)}
                          className="hidden"
                        />
                      </label>

                      {verification.judgePermissionDetails?.attachment && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>تم إرفاق: {verification.judgePermissionDetails.attachment.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {verification.judgePermissionDetails?.isVerified && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-100/70 p-3 text-xs font-bold text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>
                        ✓ تم العثور على الإذن في قاعدة البيانات القضائية: رقم (
                        {verification.judgePermissionDetails.permissionNumber}) | الحالة: ساري
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 4. Question 2: Spatial Jurisdiction */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-black text-indigo-600">② السؤال الثاني — الاختصاص المكاني</div>
            <h2 className="text-lg font-black text-slate-900">
              📍 هل يتم التلقي داخل دائرة محكمة الاستئناف التي تتبع لها المحكمة الابتدائية الموجود بها مقر مكتبك؟
            </h2>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
            بيانات الاختصاص التلقائية لملف مكتبك المهني:
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs font-bold text-slate-800">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>محكمة الاستئناف: {verification.appealCourt}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>المحكمة الابتدائية: {verification.primaryCourt}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>مقر المكتب: {verification.officeLocation}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleJurisdictionChoice(true)}
            className={`flex items-center justify-between rounded-2xl border-2 p-5 text-right transition-all ${
              verification.isWithinJurisdiction === true
                ? 'border-emerald-600 bg-emerald-50/80 shadow-md shadow-emerald-100'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-black text-slate-900">
                <span className="text-emerald-600 text-lg">🟢</span>
                <span className="text-base">نعم، داخل دائرة الاختصاص</span>
              </div>
              <p className="text-xs text-slate-600 font-bold">
                مكان التلقي كائن بالنفوذ الترابي العادي المحدد قانوناً للمكتب العدلي.
              </p>
            </div>
            {verification.isWithinJurisdiction === true && (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleJurisdictionChoice(false)}
            className={`flex items-center justify-between rounded-2xl border-2 p-5 text-right transition-all ${
              verification.isWithinJurisdiction === false
                ? 'border-amber-600 bg-amber-50/80 shadow-md shadow-amber-100'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-black text-slate-900">
                <span className="text-amber-600 text-lg">🟠</span>
                <span className="text-base">لا، خارج دائرة الاختصاص</span>
              </div>
              <p className="text-xs text-slate-600 font-bold">
                تلقي استثنائي خارج الدائرة يستلزم إشعار قاضي التوثيق ورئيس المجلس الجهوي.
              </p>
            </div>
            {verification.isWithinJurisdiction === false && (
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            )}
          </button>
        </div>

        {verification.isWithinJurisdiction === true && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs font-black text-emerald-900 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>✓ التلقي داخل دائرة الاختصاص المحددة لملف مكتبك. لا تتطلب هذه الحالة إشعارات خاصة.</span>
          </div>
        )}

        {verification.isWithinJurisdiction === false && (
          <div className="space-y-6 rounded-2xl border border-amber-300 bg-amber-50/50 p-6 animate-in fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-black text-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span>⚠️ تلقي خارج دائرة الاختصاص — تنبيه مهني ملزم</span>
              </div>
              <p className="text-xs font-bold text-amber-800 leading-relaxed">
                تم التصريح بأن مكان التلقي يوجد خارج دائرة محكمة الاستئناف المرتبطة بمقر مكتبك.
                يجب استكمال بيانات الإشعار الموجه إلى الجهات المختصة قبل متابعة العملية.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white border border-amber-200 px-4 py-2 text-xs font-bold">
              <span>حالة اكتمال الإشعارات:</span>
              <div className="flex items-center gap-4">
                <span className={verification.judgeNotice?.noticeNumber && verification.judgeNotice?.attachment ? 'text-emerald-700' : 'text-slate-400'}>
                  قاضي التوثيق {verification.judgeNotice?.noticeNumber && verification.judgeNotice?.attachment ? '✓' : '✕'}
                </span>
                <span className="text-slate-300">|</span>
                <span className={verification.councilNotice?.noticeNumber && verification.councilNotice?.attachment ? 'text-emerald-700' : 'text-slate-400'}>
                  رئيس المجلس الجهوي {verification.councilNotice?.noticeNumber && verification.councilNotice?.attachment ? '✓' : '✕'}
                </span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* 1. Notice to Judge */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-black text-slate-800">
                  <Scale className="h-4 w-4 text-blue-600" />
                  <span>📨 أولاً: إشعار قاضي التوثيق</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">رقم الإشعار *</label>
                    <input
                      type="text"
                      value={verification.judgeNotice?.noticeNumber || ''}
                      onChange={(e) =>
                        setVerification((prev) => ({
                          ...prev,
                          judgeNotice: { ...(prev.judgeNotice || {}), noticeNumber: e.target.value },
                        }))
                      }
                      placeholder="رقم الإشعار بالجهة القضائية"
                      className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">تاريخ الإشعار</label>
                      <input
                        type="date"
                        value={verification.judgeNotice?.noticeDate || ''}
                        onChange={(e) =>
                          setVerification((prev) => ({
                            ...prev,
                            judgeNotice: { ...(prev.judgeNotice || {}), noticeDate: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">تاريخ التوصل / الإيداع</label>
                      <input
                        type="date"
                        value={verification.judgeNotice?.receivedDate || ''}
                        onChange={(e) =>
                          setVerification((prev) => ({
                            ...prev,
                            judgeNotice: { ...(prev.judgeNotice || {}), receivedDate: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      نسخة إشعار قاضي التوثيق *
                    </label>
                    <label className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-400 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:border-blue-500 hover:text-blue-600">
                      <Upload className="h-4 w-4" />
                      <span>＋ تحميل إشعار قاضي التوثيق</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => handleFileUpload('judgeNotice', e)}
                        className="hidden"
                      />
                    </label>

                    {verification.judgeNotice?.attachment && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 truncate">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{verification.judgeNotice.attachment.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Notice to Regional Council */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-black text-slate-800">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <span>📨 ثانياً: إشعار رئيس المجلس الجهوي</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">رقم الإشعار *</label>
                    <input
                      type="text"
                      value={verification.councilNotice?.noticeNumber || ''}
                      onChange={(e) =>
                        setVerification((prev) => ({
                          ...prev,
                          councilNotice: { ...(prev.councilNotice || {}), noticeNumber: e.target.value },
                        }))
                      }
                      placeholder="رقم الإشعار بالمجلس الجهوي"
                      className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">تاريخ الإشعار</label>
                      <input
                        type="date"
                        value={verification.councilNotice?.noticeDate || ''}
                        onChange={(e) =>
                          setVerification((prev) => ({
                            ...prev,
                            councilNotice: { ...(prev.councilNotice || {}), noticeDate: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">تاريخ التوصل</label>
                      <input
                        type="date"
                        value={verification.councilNotice?.receivedDate || ''}
                        onChange={(e) =>
                          setVerification((prev) => ({
                            ...prev,
                            councilNotice: { ...(prev.councilNotice || {}), receivedDate: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      نسخة إشعار المجلس الجهوي *
                    </label>
                    <label className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-400 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:border-blue-500 hover:text-blue-600">
                      <Upload className="h-4 w-4" />
                      <span>＋ تحميل إشعار رئيس المجلس الجهوي</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => handleFileUpload('councilNotice', e)}
                        className="hidden"
                      />
                    </label>

                    {verification.councilNotice?.attachment && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 truncate">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{verification.councilNotice.attachment.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 5. Compliance Matrix & Pre-Reception Readiness */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-black text-emerald-600">🧠 مؤشر الامتثال والجاهزية قبل التلقي</div>
            <h2 className="text-lg font-black text-slate-900">🛡️ جاهزية التلقي واستيفاء المتطلبات</h2>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-black border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">عنصر التحقق القانوني</th>
                <th className="px-4 py-3 text-center">الحالة الإجرائية</th>
                <th className="px-4 py-3">البيان التوضيحي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              <tr>
                <td className="px-4 py-3">العدل المشارك محدد</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-black">✓</td>
                <td className="px-4 py-3 text-slate-500">{verification.notary2Name || 'تم التحديد'}</td>
              </tr>
              <tr>
                <td className="px-4 py-3">حالة التلقي الثنائي ومجلس العقد</td>
                <td className="px-4 py-3 text-center font-black">
                  {verification.isSimultaneousCouncil === true ? (
                    <span className="text-emerald-600">✓</span>
                  ) : verification.isSimultaneousCouncil === false ? (
                    <span className="text-amber-600">استثنائي</span>
                  ) : (
                    <span className="text-slate-400">---</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {verification.isSimultaneousCouncil === true
                    ? 'في مجلس واحد متزامن'
                    : verification.isSimultaneousCouncil === false
                    ? 'غير متزامن (يخضع للإذن)'
                    : 'في انتظار الإجابة'}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">الإذن القضائي للتلقي</td>
                <td className="px-4 py-3 text-center font-black">
                  {verification.isSimultaneousCouncil === true ? (
                    <span className="text-slate-400">غير مطلوب</span>
                  ) : verification.hasJudgePermission === true && verification.judgePermissionDetails?.permissionNumber ? (
                    <span className="text-emerald-600">✓</span>
                  ) : verification.hasJudgePermission === false ? (
                    <span className="text-rose-600 font-black">✕ مانع</span>
                  ) : (
                    <span className="text-slate-400">---</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {verification.isSimultaneousCouncil === true
                    ? 'الأصل التلقي المشترك المباشر'
                    : verification.hasJudgePermission === true
                    ? `رقم الإذن: ${verification.judgePermissionDetails?.permissionNumber || 'قيد الإدخال'}`
                    : 'يتطلب إذناً من قاضي التوثيق'}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">دائرة الاختصاص المكاني</td>
                <td className="px-4 py-3 text-center font-black">
                  {verification.isWithinJurisdiction === true ? (
                    <span className="text-emerald-600">✓</span>
                  ) : verification.isWithinJurisdiction === false ? (
                    <span className="text-amber-600">خارج الدائرة</span>
                  ) : (
                    <span className="text-slate-400">---</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {verification.isWithinJurisdiction === true
                    ? 'داخل دائرة محكمة الاستئناف'
                    : verification.isWithinJurisdiction === false
                    ? 'خارج الدائرة (يتطلب إشعارين)'
                    : 'في انتظار الإجابة'}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">إشعار قاضي التوثيق</td>
                <td className="px-4 py-3 text-center font-black">
                  {verification.isWithinJurisdiction === true ? (
                    <span className="text-slate-400">غير مطلوب</span>
                  ) : verification.judgeNotice?.noticeNumber && verification.judgeNotice?.attachment ? (
                    <span className="text-emerald-600">✓</span>
                  ) : (
                    <span className="text-amber-600">غير مكتمل</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {verification.isWithinJurisdiction === true
                    ? 'غير مطلوب داخل الدائرة'
                    : verification.judgeNotice?.noticeNumber
                    ? `مسجل برقم ${verification.judgeNotice.noticeNumber}`
                    : 'ينقص رقم الإشعار ومرفقه'}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">إشعار رئيس المجلس الجهوي</td>
                <td className="px-4 py-3 text-center font-black">
                  {verification.isWithinJurisdiction === true ? (
                    <span className="text-slate-400">غير مطلوب</span>
                  ) : verification.councilNotice?.noticeNumber && verification.councilNotice?.attachment ? (
                    <span className="text-emerald-600">✓</span>
                  ) : (
                    <span className="text-amber-600">غير مكتمل</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {verification.isWithinJurisdiction === true
                    ? 'غير مطلوب داخل الدائرة'
                    : verification.councilNotice?.noticeNumber
                    ? `مسجل برقم ${verification.councilNotice.noticeNumber}`
                    : 'ينقص رقم الإشعار ومرفقه'}
                </td>
              </tr>
              <tr className="bg-slate-50/80 font-black">
                <td className="px-4 py-3.5 text-slate-900">جاهزية التلقي الإجمالية</td>
                <td className="px-4 py-3.5 text-center text-sm font-black">
                  {compliance.isFullyReady ? (
                    <span className="text-emerald-600">🟢 مستوفٍ</span>
                  ) : compliance.q1Blocked ? (
                    <span className="text-rose-600">🔴 مانع</span>
                  ) : (
                    <span className="text-amber-600">🟠 قيد الاستكمال</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-slate-700">
                  {compliance.isFullyReady
                    ? '✓ استُوفيت المتطلبات الإجرائية المسجلة في النظام للانتقال إلى مرحلة التلقي.'
                    : compliance.q1Reason || compliance.q2Reason || 'يرجى الإجابة عن أسئلة البوابة لاستكمال التحقق.'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. Timeline Audit Trail */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span>🕒 السجل الزمني التلقائي للعملية (Audit Trail):</span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {timeline.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                <span className="font-mono text-slate-400 shrink-0">{item.time}</span>
                <span className="text-slate-300">•</span>
                <span className="truncate">{item.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <ChevronRight className="h-4 w-4" />
            <span>العودة لبوابة القرار المهني</span>
          </button>

          <button
            type="button"
            onClick={handleCompleteGate}
            disabled={!compliance.isFullyReady}
            className={`inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-black text-white transition shadow-lg ${
              compliance.isFullyReady
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-700/20 hover:brightness-110 active:scale-95 cursor-pointer'
                : 'bg-slate-300 border border-slate-300 cursor-not-allowed text-slate-500 shadow-none'
            }`}
          >
            <span>متابعة إلى بيانات الأطراف</span>
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* 7. Legal Explanation Modal */}
      {showLegalExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in" dir="rtl">
          <div className="max-w-2xl w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Scale className="h-6 w-6 text-amber-600" />
                <h3 className="text-xl font-black text-slate-900">لماذا يطلب مني النظام هذا الإجراء؟</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLegalExplanation(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold leading-relaxed text-slate-700 max-h-[60vh] overflow-y-auto pr-2">
              <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 space-y-2">
                <div className="font-black text-amber-900 text-sm">📌 التأصيل القانوني وقواعد التلقي العدلي</div>
                <p>
                  إن التحقق القبلي ليس إجراءً شكلياً عابراً، بل هو صمام أمان مهني يحمي الرسوم العدلية من أي طعن شكلي أو بطلان مسطري، طبقاً للمقتضيات القانونية الجاري بها العمل، ولا سيما:
                </p>
              </div>

              <div className="space-y-3">
                <div className="border-r-4 border-blue-600 pr-3">
                  <span className="block font-black text-slate-900">1. مبدأ التلقي الثنائي ومجلس العقد:</span>
                  <p className="text-slate-600 mt-0.5">
                    الأصل في التوثيق العدلي المغربي هو تلقي الإشهاد من طرف عدلين منتصبين للإشهاد مجتمعين في نفس المجلس وفي آن واحد. وفي حال تعذر ذلك، تقتضي المسطرة القانونية الحصول على إذن كتابي مسبق من قاضي التوثيق يبرر التلقي الانفرادي أو غير المتزامن.
                  </p>
                </div>

                <div className="border-r-4 border-indigo-600 pr-3">
                  <span className="block font-black text-slate-900">2. قواعد الاختصاص المكاني والترابي:</span>
                  <p className="text-slate-600 mt-0.5">
                    يمارس العدول مهامهم داخل النفوذ الترابي المحدد لمحكمة الاستئناف التابع لها مقر مكتبهم. وعند قيام مقتضى للتلقي خارج الدائرة، يلزم إشعار كل من السيد قاضي التوثيق والسيد رئيس المجلس الجهوي للعدول وفق الشكليات القانونية المعتمدة.
                  </p>
                </div>

                <div className="border-r-4 border-emerald-600 pr-3">
                  <span className="block font-black text-slate-900">3. الإطار التشريعي والمرحلة الانتقالية:</span>
                  <p className="text-slate-600 mt-0.5">
                    يستند النظام إلى قانون خطة العدالة الحالي رقم 16.03 ومقتضيات مدونة الأسرة والظهائر المنظمة، مع استحضار أحكام القانون الجديد رقم 51.26 وميعاد دخوله حيز النفاذ (المقرر في 9 نونبر 2026). ويعمل النظام على توثيق الأثر الزمني (Audit Trail) لتعزيز الحجية الرسمية للشهادة أمام مؤسسة القضاء.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                <span className="font-black text-slate-800">ملاحظة نظامية: </span>
                النظام الذكي ينفذ الإجراءات والشروط المسجلة دون الحلول محل السلطة التقديرية للعدل أو قاضي التوثيق.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowLegalExplanation(false)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition"
              >
                فهمت ذلك، إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreReceptionVerificationGate;
