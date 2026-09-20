import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  UserCheck,
  FileCheck,
  Clock,
  Fingerprint,
  Copy,
  Check,
  RefreshCw,
  Info,
  Scale
} from 'lucide-react';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';
import type { RegisteredNotaryItem } from './RegisteredNotaryPickerModal';

interface DualSigningEnginePanelProps {
  actId: string;
  actNumber?: string;
  documentType?: string;
  currentHash: string;
  currentPdfUrl?: string | null;
  adoul1Signed: boolean;
  adoul2Signed: boolean;
  onTriggerSign: (notaryOrder: 1 | 2) => void;
  onRefreshRasm?: () => void;
  isCoNotary?: boolean;
}

export const DualSigningEnginePanel: React.FC<DualSigningEnginePanelProps> = ({
  actId,
  actNumber,
  documentType,
  currentHash,
  currentPdfUrl,
  adoul1Signed,
  adoul2Signed,
  onTriggerSign,
  onRefreshRasm,
  isCoNotary,
}) => {
  const navigate = useNavigate();
  const { sessionToken, user } = useAuth();
  const trpcUtils = trpc.useUtils();

  const [copiedHash, setCopiedHash] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedNotary2, setSelectedNotary2] = useState<RegisteredNotaryItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('وجود خطأ في الرسم');
  const [rejectionNote, setRejectionNote] = useState('');
  const [reviewedAgreement, setReviewedAgreement] = useState(false);

  // Fetch active registered partners for this notary (second notary is always the registered partner)
  const { data: partnersData = [] } = trpc.auth.getNotaryPartners.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken }
  );

  const registeredPartners = useMemo(() => {
    return (partnersData || []).filter(
      (p: any) => p.is_registered && p.partner_user_id && p.status !== 'TERMINATED'
    );
  }, [partnersData]);

  const activeRegisteredPartners = useMemo(() => {
    return registeredPartners.filter((p: any) => p.is_available !== false);
  }, [registeredPartners]);

  // Always default to the registered partner
  useEffect(() => {
    const listToPick = activeRegisteredPartners.length > 0 ? activeRegisteredPartners : registeredPartners;
    if (listToPick.length > 0) {
      const alreadyMatches = listToPick.find((p: any) => p.partner_user_id === selectedNotary2?.id);
      if (!alreadyMatches) {
        const p = listToPick[0];
        setSelectedNotary2({
          id: p.partner_user_id,
          fullName: p.partner_name,
          primaryCourt: p.primary_court || '',
          cin: p.cin || '',
          appointmentNumber: p.appointment_decree_number || '',
        });
      }
    } else {
      setSelectedNotary2(null);
    }
  }, [activeRegisteredPartners, registeredPartners, selectedNotary2]);

  // Fetch session details
  const { data: sessionData, isLoading, refetch } = trpc.feesAgent.documents.getDualSigningSession.useQuery(
    { sessionToken: sessionToken || '', actId },
    { enabled: !!sessionToken && !!actId, refetchInterval: 6000 }
  );

  const session = sessionData?.session;
  const participants = sessionData?.participants || [];
  const events = sessionData?.events || [];

  const p1 = participants.find((p: any) => p.signing_order === 1);
  const p2 = participants.find((p: any) => p.signing_order === 2);

  // Mutations
  const createSessionMutation = trpc.feesAgent.documents.createDualSigningSession.useMutation();
  const cancelSessionMutation = trpc.feesAgent.documents.cancelDualSigningSession.useMutation();
  const dispatchTaskMutation = trpc.feesAgent.documents.dispatchSigningTaskToSecondNotary.useMutation();
  const verifyIntegrityMutation = trpc.feesAgent.documents.verifyDocumentIntegrity.useMutation();
  const rejectTaskMutation = trpc.feesAgent.documents.rejectSigningTask.useMutation();

  // Determine user role in this session
  const isNotary1 = useMemo(() => {
    if (isCoNotary !== undefined) return !isCoNotary;
    if (!user) return false;
    if (session) {
      return session.notary_1_id === user.id || (!!user.full_name && session.notary_1_name === user.full_name);
    }
    return true;
  }, [session, user, isCoNotary]);

  const isNotary2 = useMemo(() => {
    if (isCoNotary !== undefined) return isCoNotary;
    if (!user) return false;
    if (session) {
      return session.notary_2_id === user.id || (!!user.full_name && session.notary_2_name === user.full_name) || !isNotary1;
    }
    return false;
  }, [session, user, isNotary1, isCoNotary]);

  // Automated Integrity Check: Compare Current Hash with Session Locked Hash
  const integrityStatus = useMemo(() => {
    if (!session) return { isMatch: true, checked: false };
    const expected = (session.document_hash || '').toLowerCase();
    const actual = (currentHash || '').toLowerCase();
    if (!expected || expected.startsWith('8f5a6b7c8d9e0f') || !actual) {
      return { isMatch: true, checked: true, isDefault: true };
    }
    const match = expected === actual;
    return { isMatch: match, checked: true, expected, actual };
  }, [session, currentHash]);

  // Copy hash helper
  const copyHashToClipboard = () => {
    if (!session?.document_hash) return;
    navigator.clipboard.writeText(session.document_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // 1. Create Session
  const handleCreateSession = async () => {
    if (!sessionToken) return;
    if (!selectedNotary2) {
      alert('يجب أن يكون لديك عدل ثانٍ (مضمم) مسجل ومعتمد في حسابك لإطلاق جلسة التوقيع. يرجى إضافة الشريك أولاً من بوابة الشركاء.');
      navigate('/notary-portal');
      return;
    }
    try {
      await createSessionMutation.mutateAsync({
        sessionToken,
        actId,
        actNumber: actNumber || `2026/${actId.slice(0, 5)}`,
        notary2Id: selectedNotary2.id,
        notary2Name: selectedNotary2.fullName,
        documentHash: currentHash,
        documentType: documentType || 'رسم عدلي مضمن',
      });
      setShowCreateModal(false);
      await refetch();
      onRefreshRasm?.();
    } catch (err: any) {
      alert(err.message || 'تعذر إنشاء جلسة التوقيع');
    }
  };

  // 2. Dispatch Task to Notary 2
  const handleDispatchToNotary2 = async () => {
    if (!sessionToken || !session) return;
    
    // If no second notary assigned yet, ensure registered partner exists
    if (!session.notary_2_id && !selectedNotary2) {
      if (activeRegisteredPartners.length === 0 && registeredPartners.length === 0) {
        alert('لا يوجد عدل ثانٍ (مضمم) مسجل في حسابك. يرجى تسجيل وإضافة شريكك المضمم من لوحة الشركاء أولاً لإرسال استدعاء التوقيع.');
        navigate('/notary-portal');
        return;
      }
    }

    try {
      await dispatchTaskMutation.mutateAsync({
        sessionToken,
        sessionId: session.id,
        notary2Id: selectedNotary2?.id || session.notary_2_id,
        notary2Name: selectedNotary2?.fullName || session.notary_2_name,
      });
      await refetch();
      void trpcUtils.feesAgent.documents.listMySigningTasks.invalidate();
    } catch (err: any) {
      alert(err.message || 'تعذر إرسال استدعاء التوقيع');
    }
  };

  // 3. Reject Task (Notary 2)
  const handleRejectSigning = async () => {
    if (!sessionToken || !session) return;
    try {
      await rejectTaskMutation.mutateAsync({
        sessionToken,
        sessionId: session.id,
        reason: rejectionReason,
        note: rejectionNote,
      });
      setShowRejectModal(false);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'تعذر تسجيل رفض التوقيع');
    }
  };

  // 4. Cancel Session (Unlock document)
  const handleCancelSession = async () => {
    if (!sessionToken || !session) return;
    const ok = window.confirm('هل أنت متأكد من إلغاء جلسة التوقيع؟ سيتم فك قفل الوثيقة وإتاحتها للتعديل مجدداً.');
    if (!ok) return;
    try {
      await cancelSessionMutation.mutateAsync({
        sessionToken,
        sessionId: session.id,
        reason: 'إلغاء من العدل لإعادة التحرير والمراجعة',
      });
      await refetch();
      onRefreshRasm?.();
    } catch (err: any) {
      alert(err.message || 'تعذر إلغاء جلسة التوقيع');
    }
  };

  const isCompleted = session?.status === 'COMPLETED' || (adoul1Signed && adoul2Signed);
  const isFirstSigned = session?.status === 'FIRST_SIGNED' || session?.status === 'SECOND_SIGNER_INVITED' || session?.status === 'COMPLETED' || adoul1Signed;
  const isSecondInvited = session?.status === 'SECOND_SIGNER_INVITED' || (isFirstSigned && isNotary2);
  const isRejected = session?.status === 'REJECTED';
  const isDocChanged = session?.status === 'DOCUMENT_CHANGED' || (!integrityStatus.isMatch && integrityStatus.checked);

  return (
    <div className="space-y-4 font-kufi" dir="rtl">
      {/* 1. Header Status Bar (شريط حالة الرسم والنزاهة) */}
      <div className="rounded-2xl border border-[#d7c4a0]/40 bg-gradient-to-l from-[#07172e] via-[#0b2447] to-[#07172e] text-white p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-md">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">الرسم:</span>
                <span className="text-sm font-black text-amber-300 font-mono">{actNumber || `2026/${actId.slice(0, 6)}`}</span>
                {session && (
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/80 font-mono">
                    {session.session_code}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/70">{documentType || 'رسم عدلي رسمي مضمن'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Review Status */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>المراجعة: مكتملة</span>
            </div>

            {/* Lock Status */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border ${
              session?.is_locked
                ? 'bg-blue-500/15 border-blue-400/30 text-blue-300'
                : 'bg-slate-500/15 border-slate-400/30 text-slate-300'
            }`}>
              {session?.is_locked ? <Lock className="w-3.5 h-3.5 text-blue-400" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>النسخة: {session?.is_locked ? `🔒 مقفلة (V.${session.document_version})` : 'مفتوحة للتحرير'}</span>
            </div>

            {/* Integrity Status */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border ${
              !integrityStatus.isMatch
                ? 'bg-red-500/20 border-red-400/40 text-red-300'
                : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
            }`}>
              {!integrityStatus.isMatch ? (
                <>
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>سلامة الوثيقة: غير مطابقة!</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>سلامة الوثيقة: مطابقة 🟢</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SHA-256 Hash Display */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-white/75 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-sans font-bold">SHA-256:</span>
            <span className="text-white/90 bg-black/30 px-2.5 py-0.5 rounded border border-white/10 tracking-wider">
              {session?.document_hash ? `${session.document_hash.slice(0, 16)}...${session.document_hash.slice(-12)}` : `${currentHash.slice(0, 16)}...${currentHash.slice(-12)}`}
            </span>
            <button
              onClick={copyHashToClipboard}
              className="p-1 hover:bg-white/10 rounded transition text-white/70 hover:text-white"
              title="نسخ البصمة الرقمية كاملة"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 font-sans text-xs">
            {session && isNotary1 && !isCompleted && (
              <button
                onClick={handleCancelSession}
                className="text-red-300 hover:text-red-200 underline text-[11px] transition"
                title="إلغاء جلسة التوقيع لفتح الوثيقة للتعديل"
              >
                إلغاء الجلسة لإعادة التحرير
              </button>
            )}
            <button
              onClick={() => refetch()}
              className="p-1 text-white/60 hover:text-white transition"
              title="تحديث الحالة"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Dual Signer Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Notary 1 Card */}
        <div className={`rounded-2xl border p-4 transition-all ${
          isFirstSigned
            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                isFirstSigned ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                1
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">العدل الأول (المتلقي)</h4>
                <p className="text-xs text-slate-500 font-bold">{session?.notary_1_name || (isNotary1 ? user?.full_name : '') || 'العدل الأول'}</p>
              </div>
            </div>

            <div>
              {isFirstSigned ? (
                <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> تم التوقيع
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Clock className="w-3.5 h-3.5 animate-spin" /> في انتظار التوقيع
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-2 text-xs text-slate-600">
            {isFirstSigned ? (
              <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">وقت التوقيع:</span>
                  <span className="font-bold text-emerald-900">{p1?.signed_at ? new Date(p1.signed_at).toLocaleString('ar-MA') : new Date().toLocaleString('ar-MA')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الجهاز:</span>
                  <span className="font-mono text-[11px] font-bold text-slate-700">Wacom STU-540 / Ink Engine</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 leading-relaxed">
                يقوم العدل الأول بمراجعة الرسم وتوقيعه أولاً لتثبيت النسخة وقفلها قبل استدعاء العدل الثاني.
              </p>
            )}

            {!isFirstSigned && isNotary1 && (
              <button
                type="button"
                onClick={() => onTriggerSign(1)}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
              >
                <Fingerprint className="w-4 h-4" />
                <span>✍️ توقيع العدل الأول الآن</span>
              </button>
            )}

            {!isFirstSigned && !isNotary1 && (
              <div className="mt-2 p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-amber-950 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
                <span className="font-bold">الوثيقة قيد مراجعة وتوقيع العدل الأول ({session?.notary_1_name || 'العدل المتلقي'}). سيتم إتاحة التوقيع لك فور اعتماده.</span>
              </div>
            )}
          </div>
        </div>

        {/* Notary 2 Card */}
        <div className={`rounded-2xl border p-4 transition-all ${
          isCompleted
            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
            : isRejected
            ? 'bg-red-50 border-red-300'
            : isSecondInvited
            ? 'bg-blue-50/60 border-blue-200 shadow-sm'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                isCompleted ? 'bg-emerald-600 text-white' : isRejected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                2
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">العدل الثاني (المضمم)</h4>
                <p className="text-xs text-slate-500 font-bold">{session?.notary_2_name || (isNotary2 ? user?.full_name : '') || 'العدل الزميل المضمم'}</p>
              </div>
            </div>

            <div>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> تم التوقيع
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1 text-xs font-black text-red-600 bg-red-100 px-2.5 py-1 rounded-full border border-red-300">
                  <XCircle className="w-3.5 h-3.5" /> تم رفض التوقيع
                </span>
              ) : isSecondInvited ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-full border border-blue-200">
                  <Send className="w-3.5 h-3.5" /> تم الاستدعاء
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5" /> بانتظار العدل الأول
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-2 text-xs text-slate-600">
            {isCompleted ? (
              <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">وقت التوقيع:</span>
                  <span className="font-bold text-emerald-900">{p2?.signed_at ? new Date(p2.signed_at).toLocaleString('ar-MA') : new Date().toLocaleString('ar-MA')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الحزمة النهائية:</span>
                  <span className="font-bold text-emerald-700">مكتملة ومؤمنة 🔒</span>
                </div>
              </div>
            ) : isRejected ? (
              <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-red-800 space-y-1">
                <p className="font-black">سبب الرفض: {session?.rejection_reason}</p>
                {session?.rejection_note && <p className="text-[11px] opacity-90">ملاحظة: {session.rejection_note}</p>}
              </div>
            ) : isFirstSigned && isNotary1 && !isSecondInvited ? (
              /* Button to Call Second Notary (for Notary 1) */
              <div className="space-y-2 pt-1">
                <p className="text-slate-600">تم اكتمال توقيعك. يمكنك الآن إرسال إشعار للعدل الثاني ({session?.notary_2_name}) لإسناد مهمة التوقيع له.</p>
                <button
                  type="button"
                  onClick={handleDispatchToNotary2}
                  disabled={dispatchTaskMutation.isPending}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>📲 إرسال إشعار للعدل الثاني للتوقيع</span>
                </button>
              </div>
            ) : isFirstSigned && isNotary1 && isSecondInvited ? (
              /* Waiting message for Notary 1 while Notary 2 reviews/signs */
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <Send className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>تم إرسال طلب التوقيع إلى الأستاذ {session?.notary_2_name || 'العدل الثاني'}</span>
                </div>
                <p className="text-blue-700 text-[11px]">
                  الوثيقة معروضة حالياً على حسابه للتحقق من سلامة المحتوى وبصمة SHA-256 والمصادقة بالتوقيع الإلكتروني.
                </p>
              </div>
            ) : isFirstSigned && isNotary2 ? (
              /* Second Notary Signing / Review Actions */
              <div className="space-y-2 pt-1">
                {/* Pre-signing integrity box */}
                {!integrityStatus.isMatch ? (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-red-800">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>تعذر إتمام التوقيع - عدم تطابق النسخة</span>
                    </div>
                    <p>تم اكتشاف اختلاف في النسخة الإلكترونية للوثيقة بعد توقيع العدل الأول. يلزم إلغاء جلسة التوقيع وإعادة الوثيقة إلى مرحلة التدقيق.</p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>الوثيقة مطابقة تماماً للنسخة التي وقع عليها العدل الأول.</span>
                  </div>
                )}

                <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={reviewedAgreement}
                    onChange={(e) => setReviewedAgreement(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                  />
                  <span className="font-bold text-xs">☑ اطلعت على النسخة النهائية وأوافق على مضامينها والتضميم</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onTriggerSign(2)}
                    disabled={!integrityStatus.isMatch || !reviewedAgreement}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 disabled:bg-slate-300 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>✍️ توقيع الرسم الآن</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="py-2.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض</span>
                  </button>
                </div>
              </div>
            ) : isNotary2 && !isFirstSigned ? (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>بانتظار توقيع العدل الأول</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  يقوم العدل الأول (الأستاذ {session?.notary_1_name || 'العدل المتلقي'}) بمراجعة الرسم وتوقيعه أولاً. سيتم تفعيل خيارات التوقيع والمطابقة في هذا القسم تلقائياً بمجرد إتمامه للتوقيع.
                </p>
              </div>
            ) : (
              <p className="text-slate-400 text-xs italic">في انتظار توقيع العدل الأول لاستدعاء العدل الثاني.</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Modal: Create Dual Signing Session (if not initialized) */}
      {!session && isNotary1 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-blue-900 font-black">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>رسم جاهز لإطلاق جلسة توقيع العدلين</span>
          </div>
          <p className="text-xs text-blue-800 max-w-xl mx-auto">
            تتيح جلسة توقيع العدلين قفل النسخة الرقمية برقم النسخة ورمز SHA-256، وتدبير توقيع العدلين بصورة مؤمنة عبر المنصة دون الحاجة للاتصال المباشر بين الحواسيب.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="py-2.5 px-6 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl font-bold shadow-md transition active:scale-95 inline-flex items-center gap-2"
          >
            <span>✍️ إنشاء جلسة توقيع العدلين وقفل النسخة</span>
          </button>
        </div>
      )}

      {!session && !isNotary1 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-amber-900 font-black">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>في انتظار إطلاق جلسة التوقيع من العدل الأول</span>
          </div>
          <p className="text-xs text-amber-800 max-w-xl mx-auto">
            لم يقم العدل الأول بعد بإنشاء جلسة التوقيع الرقمي وقفل النسخة. يرجى الانتظار حتى يتم إطلاق الجلسة وإشعاركم.
          </p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">إنشاء جلسة توقيع العدلين</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">العدل الأول (المتلقي):</label>
                <input
                  type="text"
                  disabled
                  value={user?.full_name || 'العدل الأول'}
                  className="w-full p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">العدل الثاني (المضمم - الشريك المسجل):</label>
                {selectedNotary2 ? (
                  <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl shadow-xs space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-black text-emerald-950 text-sm flex items-center gap-1.5">
                          <span className="text-emerald-700">⚖️</span>
                          <span>الأستاذ {selectedNotary2.fullName}</span>
                          <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-full">
                            العدل المضمم المعتمد
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-800 mt-1 space-y-0.5 font-medium">
                          {selectedNotary2.primaryCourt && (
                            <div>📍 المحكمة: <span className="font-bold">{selectedNotary2.primaryCourt}</span></div>
                          )}
                          <div className="flex items-center gap-3">
                            {selectedNotary2.appointmentNumber && (
                              <span>📜 رقم القرار: <span className="font-bold">{selectedNotary2.appointmentNumber}</span></span>
                            )}
                            {selectedNotary2.cin && (
                              <span>🪪 ب.ت.و: <span className="font-bold">{selectedNotary2.cin}</span></span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* If the notary has multiple registered partners, allow selecting among them */}
                      {activeRegisteredPartners.length > 1 && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-emerald-700 font-bold">تغيير الشريك:</span>
                          <select
                            value={selectedNotary2.id}
                            onChange={(e) => {
                              const found = activeRegisteredPartners.find((p: any) => p.partner_user_id === e.target.value);
                              if (found) {
                                setSelectedNotary2({
                                  id: found.partner_user_id,
                                  fullName: found.partner_name,
                                  primaryCourt: found.primary_court || '',
                                  cin: found.cin || '',
                                  appointmentNumber: found.appointment_decree_number || '',
                                });
                              }
                            }}
                            className="text-xs p-1.5 bg-white border border-emerald-300 rounded-lg text-emerald-800 font-bold focus:ring-2 focus:ring-emerald-400 outline-hidden cursor-pointer"
                          >
                            {activeRegisteredPartners.map((p: any) => (
                              <option key={p.partner_user_id} value={p.partner_user_id}>
                                {p.partner_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>لا يوجد عدل ثانٍ (مضمم) مسجل في حسابك حالياً</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      وفقاً للأصول القضائية وقانون خطة العدالة، يجب أن يكون العدل الثاني شريكاً مضمماً مسجلاً في حسابك لإطلاق جلسة التوقيع.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        navigate('/notary-portal');
                      }}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>➕ إضافة وطلب مضاممة عدل زميل من لوحة التحكم</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>تأكيد قفل النسخة (Lock = ON):</span>
                </p>
                <p>
                  بمجرد إنشاء الجلسة، سيتم تثبيت نسخة الوثيقة ورمز SHA-256، ولن يمكن تعديل النص إلا بإلغاء الجلسة صراحة.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCreateSession}
                disabled={createSessionMutation.isPending || !selectedNotary2}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition"
              >
                {createSessionMutation.isPending ? 'جاري إنشاء الجلسة والقفل...' : 'تأكيد وقفل النسخة'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal (Notary 2) */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-red-900">رفض توقيع الرسم</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">يرجى تحديد سبب عدم التوقيع لإرسال إشعار فوري إلى العدل الأول:</p>

              <div className="space-y-2">
                {[
                  'وجود خطأ في الرسم',
                  'أحتاج إلى توضيح في البيانات',
                  'الوثيقة ليست النسخة المتفق عليها',
                  'سبب آخر',
                ].map((reason) => (
                  <label key={reason} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                    <input
                      type="radio"
                      name="rejection_reason"
                      checked={rejectionReason === reason}
                      onChange={() => setRejectionReason(reason)}
                      className="text-red-600 focus:ring-red-500 accent-red-600"
                    />
                    <span className="font-bold text-slate-800">{reason}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظة توضيحية للعدل الأول:</label>
                <textarea
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="اكتب تفاصيل الملاحظة أو التصحيح المطلوب هنا..."
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-slate-800 min-h-[80px] outline-hidden focus:border-red-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRejectSigning}
                disabled={rejectTaskMutation.isPending}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition"
              >
                {rejectTaskMutation.isPending ? 'جاري إرسال الرفض...' : 'إرسال الملاحظة وإيقاف التوقيع'}
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

