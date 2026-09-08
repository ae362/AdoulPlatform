import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronRight, Loader, AlertCircle, FileText, Hash, Calendar, Download, Smartphone, FolderArchive, Send, Lock, Unlock, CheckCircle2 } from 'lucide-react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '---';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleString('ar-MA');
}

function categoryLabel(category: 'Marriage' | 'Property' | 'Inheritance' | 'Divorce' | 'Other') {
  switch (category) {
    case 'Marriage':
      return 'الزواج';
    case 'Property':
      return 'الأملاك';
    case 'Inheritance':
      return 'التركات';
    case 'Divorce':
      return 'الطلاق';
    case 'Other':
    default:
      return 'باقي الوثائق';
  }
}

type SignedDeedWorkflowStatus = 'NotSent' | 'PendingJudgeEndorsement' | 'JudgeEndorsed' | 'FinalArchived';

function judgeWorkflowBadge(status: SignedDeedWorkflowStatus, readyForJudge: boolean) {
  switch (status) {
    case 'FinalArchived':
      return {
        label: 'مؤرشف نهائياً',
        className: 'text-slate-900',
      };
    case 'JudgeEndorsed':
      return {
        label: 'مخاطب عليه من طرف قاضي التوثيق',
        className: 'text-emerald-700',
      };
    case 'PendingJudgeEndorsement':
      return {
        label: 'مخاطب عليه - قيد الخطاب لدى قاضي التوثيق',
        className: 'text-orange-700',
      };
    case 'NotSent':
    default:
      return readyForJudge
        ? {
            label: 'جاهز للإحالة',
            className: 'text-blue-700',
          }
        : {
            label: 'غير مُحال',
            className: 'text-amber-700',
          };
  }
}

export const SignedRasmViewer: React.FC = () => {
  const { id: paramId } = useParams<{ id: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const idFromQuery = searchParams.get('id');
  const id = paramId || idFromQuery;
  const isInternalModule = !!idFromQuery || location.search.includes('module=signedRasms');

  const { sessionToken, user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // Edit mode state for certificate fields
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [editFields, setEditFields] = useState({
    register: '',
    count: '',
    page: '',
  });
  const [editError, setEditError] = useState<string | null>(null);

  const isNotary = user?.role === 'notary';
  const canEditFields = isNotary;

  const handleBack = () => {
    if (location.search.includes('module=signedRasms') && !location.pathname.startsWith('/signed-rasms')) {
      const params = new URLSearchParams(location.search);
      params.delete('id');
      params.set('module', 'signedRasms');
      navigate(`${location.pathname}?${params.toString()}`);
      return;
    }
    navigate('/signed-rasms');
  };

  const [lastOpenedAtIso, setLastOpenedAtIso] = useState<string | null>(null);
  const [isFooterConfirmOpen, setIsFooterConfirmOpen] = useState(false);
  const [embedFooterError, setEmbedFooterError] = useState<string | null>(null);
  const [judgeSendError, setJudgeSendError] = useState<string | null>(null);
  const [judgeSendSuccess, setJudgeSendSuccess] = useState<string | null>(null);
  const [finalArchiveError, setFinalArchiveError] = useState<string | null>(null);
  const [isFinalArchiveConfirmOpen, setIsFinalArchiveConfirmOpen] = useState(false);
  const [sentToJudgeAt, setSentToJudgeAt] = useState<string | null>(null);
  const [archivedFinallyAt, setArchivedFinallyAt] = useState<string | null>(null);
  const [paginationSuccess, setPaginationSuccess] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [forcedPdfUrl, setForcedPdfUrl] = useState<string | null>(null);
  const [renderNonce, setRenderNonce] = useState(0);

  const handleEditToggle = () => {
    if (isEditingFields) {
      // Cancel edit mode
      setIsEditingFields(false);
      setEditError(null);
    } else {
      // Enter edit mode
      setIsEditingFields(true);
      setEditError(null);
    }
  };

  const handleFieldChange = (field: 'register' | 'count' | 'page', value: string) => {
    setEditFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveFields = async () => {
    // Validate fields
    if (!editFields.register.trim()) {
      setEditError('رقم سجل البيانات مطلوب');
      return;
    }
    if (!editFields.count.trim()) {
      setEditError('رقم الشهادة مطلوب');
      return;
    }
    if (!editFields.page.trim()) {
      setEditError('رقم الصحيفة مطلوب');
      return;
    }

    try {
      // TODO: Implement tRPC mutation to save the edited fields
      // For now, just close edit mode
      setIsEditingFields(false);
      setEditError(null);
      // You can add a success message here
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'فشل حفظ التغييرات');
    }
  };

  const deedQuery = trpc.feesAgent.documents.getSignedDeed.useQuery(
    { sessionToken: sessionToken || '', id: id || '' },
    {
      enabled: !!sessionToken && !!id,
      staleTime: 30_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );

  const embedFooterStripMutation = trpc.feesAgent.documents.embedInclusionFooterStrip.useMutation();
  const sealMutation = trpc.feesAgent.documents.sealSignedDeedForCorrespondence.useMutation();
  const sendToJudgeMutation = trpc.feesAgent.documents.sendSignedDeedToJudge.useMutation();
  const archivePostJudgeMutation = trpc.feesAgent.documents.archiveSignedDeedPostJudge.useMutation();
  const applyPaginationMutation = trpc.feesAgent.documents.applyPagination.useMutation();

  const handleApplyTopPagination = async () => {
    if (!id || !sessionToken) return;
    setPaginationError(null);
    setPaginationSuccess(null);
    try {
      const res: any = await applyPaginationMutation.mutateAsync({
        sessionToken,
        signedDeedId: id,
        position: 'TOP_HEADER',
      });
      if (res?.success) {
        const stampedUrl = res.signedPdfUrl || res.pdfPreviewUrl;
        if (stampedUrl) {
          const cacheBustedUrl = `${stampedUrl}${stampedUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`;
          setForcedPdfUrl(cacheBustedUrl);
          setRenderNonce((prev) => prev + 1);
        }
        setPaginationSuccess(
          res.totalPages
            ? `تم إدراج ترقيم الصفحات بنجاح في أعلى كل صفحة (إجمالي ${res.totalPages} صفحات)`
            : 'تم إدراج ترقيم الصفحات بنجاح في رأس الوثيقة'
        );
        await deedQuery.refetch();
      } else {
        setPaginationError('تعذر إدراج ترقيم الصفحات في الرسم الموقع.');
      }
    } catch (e: any) {
      setPaginationError(e?.message || 'خطأ أثناء إدراج ترقيم الصفحات');
    }
  };

  const deed = (deedQuery.data ?? null) as null | {
    id: string;
    savedRasmId: string;
    inclusionId: string | null;
    category: 'Marriage' | 'Property' | 'Inheritance' | 'Divorce' | 'Other';
    finalHash: string | null;
    signatureTimestamp: string;
    sealHash: string | null;
    sealTimestamp: string | null;
    readyForJudge: boolean;
    judgeWorkflowStatus: SignedDeedWorkflowStatus;
    sentToJudgeAt: string | null;
    archivedFinallyAt: string | null;
    createdAt: string;
    signedPdfUrl: string | null;
    signedPdfHasInclusionFooterStrip: boolean;
    signedPdfFooterStripVersion: number;
    signedPdfFooterStripQrIncluded: boolean;
    signedPdfFooterStripCreatedAt: string | null;
    savedRasm: { fileNumber: string | null; documentType: string | null; createdAt: string | null };
    inclusion: { registerNumber: string | null; certificateNumber: string | null; court: string | null; inclusionDate: string | null } | null;
    sealMetadata: {
      registerNumber: string | null;
      certificateNumber: string | null;
      pageNumber: string | null;
      inclusionDate: string | null;
      notary1Name: string | null;
      notary2Name: string | null;
      court: string | null;
      phone: string | null;
      email: string | null;
    } | null;
    auditHubInclusion: {
      serial: string | null;
      certificateType: string | null;
      authority: string | null;
      registrationDate: string | null;
      documentDate: string | null;
      register: string | null;
      page: string | null;
      count: string | null;
      notary1Name: string | null;
      notary2Name: string | null;
      phone: string | null;
      email: string | null;
    } | null;
  };

  const activePdfUrl = forcedPdfUrl || deed?.signedPdfUrl || null;

  const hasAnyFooterStrip = deed?.signedPdfHasInclusionFooterStrip ?? false;
  const footerStripCreated = (deed?.signedPdfFooterStripVersion ?? 0) >= 17;
  const hasArchivableArtifact = !!deed?.signedPdfUrl || hasAnyFooterStrip || footerStripCreated;
  const judgeStatus = deed?.judgeWorkflowStatus ?? 'NotSent';
  const effectiveSentToJudgeAt = sentToJudgeAt || deed?.sentToJudgeAt || null;
  const effectiveArchivedFinallyAt = archivedFinallyAt || deed?.archivedFinallyAt || null;
  const qrStepDone = footerStripCreated || hasAnyFooterStrip;
  const judgeAccepted = judgeStatus === 'JudgeEndorsed' || judgeStatus === 'FinalArchived';
  const sentAfterCurrentFooter = (() => {
    if (!effectiveSentToJudgeAt) return false;
    const footerCreatedAt = deed?.signedPdfFooterStripCreatedAt ?? null;
    if (!footerCreatedAt) return true;
    const sentTs = new Date(effectiveSentToJudgeAt).getTime();
    const footerTs = new Date(footerCreatedAt).getTime();
    if (!Number.isFinite(sentTs) || !Number.isFinite(footerTs)) return true;
    return sentTs >= footerTs;
  })();
  const sendStepDone =
    qrStepDone &&
    (effectiveSentToJudgeAt ? sentAfterCurrentFooter : judgeStatus === 'PendingJudgeEndorsement' || judgeAccepted);
  const archiveStepDone = judgeAccepted && (!!effectiveArchivedFinallyAt || judgeStatus === 'FinalArchived');
  const sendStepLocked = !qrStepDone && !sendStepDone;
  const archiveStepLocked = (!qrStepDone || !sendStepDone || !judgeAccepted) && !archiveStepDone;
  const canSendToJudge =
    !!sessionToken &&
    !!id &&
    !sealMutation.isPending &&
    !sendToJudgeMutation.isPending &&
    qrStepDone &&
    !archiveStepDone;
  const canArchiveFinally =
    !!sessionToken &&
    !!id &&
    !archivePostJudgeMutation.isPending &&
    !archiveStepDone &&
    qrStepDone &&
    sendStepDone &&
    judgeAccepted;
  const judgeBadge = judgeWorkflowBadge(judgeStatus, !!deed?.readyForJudge);

  // Sync edit fields with deed data when loading
  useEffect(() => {
    if (deed?.auditHubInclusion) {
      setEditFields({
        register: deed.auditHubInclusion.register || '',
        count: deed.auditHubInclusion.count || '',
        page: deed.auditHubInclusion.page || '',
      });
    } else if (deed?.inclusion) {
      setEditFields({
        register: deed.inclusion.registerNumber || '',
        count: deed.inclusion.certificateNumber || '',
        page: '',
      });
    }
  }, [deed?.auditHubInclusion, deed?.inclusion]);

  const getStepButtonClass = (done: boolean, pending: boolean, variant: 'solid' | 'dark' | 'soft' = 'solid') => {
    if (pending) {
      if (variant === 'dark') return 'bg-slate-700 text-slate-300 cursor-not-allowed';
      if (variant === 'soft') return 'bg-slate-200 text-slate-500 cursor-not-allowed';
      return 'bg-slate-200 text-slate-500 cursor-not-allowed';
    }

    if (done) {
      if (variant === 'dark') return 'bg-emerald-600 hover:bg-emerald-500 text-white';
      if (variant === 'soft') return 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100';
      return 'bg-emerald-600 text-white hover:bg-emerald-700';
    }

    if (variant === 'dark') return 'bg-rose-600 hover:bg-rose-500 text-white';
    if (variant === 'soft') return 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100';
    return 'bg-rose-600 text-white hover:bg-rose-700';
  };
  const getStepIndicator = (done: boolean, locked: boolean, pending: boolean) => {
    if (pending) return <Loader className="w-4 h-4 animate-spin" />;
    if (done) return <CheckCircle2 className="w-4 h-4" />;
    if (locked) return <Lock className="w-4 h-4" />;
    return <Unlock className="w-4 h-4" />;
  };

  const ensureSealed = async () => {
    if (!id || !sessionToken) {
      throw new Error('تعذر التحقق من الجلسة أو معرف الرسم.');
    }

    if (deed?.sealHash) {
      return deed.sealHash;
    }

    const sealResult: any = await sealMutation.mutateAsync({
      sessionToken,
      signedDeedId: id,
      device: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
    });

    await deedQuery.refetch();
    return sealResult.sealHash;
  };

  const handleSendToJudge = async () => {
    if (!id || !sessionToken) return;
    try {
      setJudgeSendError(null);
      setJudgeSendSuccess(null);
      setFinalArchiveError(null);
      await ensureSealed();
      const result: any = await sendToJudgeMutation.mutateAsync({
        sessionToken,
        signedDeedId: id,
        device: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        },
      });
      setSentToJudgeAt(result.timestamp || new Date().toISOString());
      if (result.submissionId) {
        try {
          const submission: any = await utils.feesAgent.documents.getMyJudgeSubmission.fetch({
            sessionToken,
            submissionId: result.submissionId,
          });
          setJudgeSendSuccess(
            `تمت إحالة الرسم إلى رواق الخطاب القضائي والختم الإلكتروني بنجاح. ` +
              `رقم الإحالة: ${submission.id} · الحالة: ${submission.status} · رقم الرسم: ${submission.fileNumber || '---'} · النوع: ${submission.documentType || '---'}`
          );
        } catch {
          setJudgeSendSuccess(
            `تمت إحالة الرسم إلى رواق الخطاب القضائي والختم الإلكتروني، لكن تعذر جلب تأكيد القراءة بعد الإرسال. ` +
              `رقم الإحالة: ${result.submissionId}`
          );
        }
      } else {
        setJudgeSendSuccess('تمت إحالة الرسم إلى رواق الخطاب القضائي والختم الإلكتروني بنجاح.');
      }
      await deedQuery.refetch();
    } catch (e: any) {
      setJudgeSendError(e?.message || 'تعذر إحالة الرسم على قاضي التوثيق للخطاب.');
    }
  };

  const handleOpenFinalArchiveConfirm = async () => {
    if (!sessionToken || !id) return;
    if (archivePostJudgeMutation.isPending) return;
    if (!qrStepDone || !sendStepDone || !judgeAccepted) {
      setFinalArchiveError('يتم فتح الإيداع النهائي فقط بعد إتمام شريط التضمين ثم إحالة الرسم ثم قبول قاضي التوثيق.');
      return;
    }

    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            'هل تريد إيداع هذا الرسم ضمن المحفوظات العدلية النهائية؟ سيتم تثبيت النسخة النهائية ومنع تعديلها لاحقًا.'
          );

    if (!confirmed) return;

    try {
      setFinalArchiveError(null);
      setJudgeSendError(null);
      await ensureSealed();
      const result: any = await archivePostJudgeMutation.mutateAsync({
        sessionToken,
        signedDeedId: id,
        device: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        },
      });
      setArchivedFinallyAt(result.sealedAt || new Date().toISOString());
      setIsFinalArchiveConfirmOpen(false);
      await deedQuery.refetch();
      navigate('/secure-archive');
    } catch (e: any) {
      setFinalArchiveError(e?.message || 'تعذر إيداع الرسم ضمن المحفوظات العدلية النهائية.');
    }
  };

  useEffect(() => {
    setEmbedFooterError(null);
    setJudgeSendError(null);
    setJudgeSendSuccess(null);
    setFinalArchiveError(null);
    setSentToJudgeAt(null);
    setArchivedFinallyAt(null);
  }, [id]);

  if (deedQuery.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-600 font-bold">جاري تحميل الرسم...</p>
        </div>
      </div>
    );
  }

  if (deedQuery.error || !deed) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">تعذر تحميل الرسم</h2>
          <p className="text-slate-600 font-bold mb-6">{(deedQuery.error as any)?.message || 'لم يتم العثور على الرسم'}</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 print:bg-white">
      <style>{`
        @media print {
          html, body {
            background: #ffffff !important;
          }
          .signed-rasm-no-print {
            display: none !important;
          }
          .signed-rasm-print-surface {
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
          }
          .signed-rasm-print-surface iframe {
            width: 100% !important;
            height: 100vh !important;
          }
        }
      `}</style>

      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 signed-rasm-no-print">
        <div className="w-full px-4 md:px-8 py-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-bold transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
            العودة إلى الرسوم الموقعة
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">عرض الرسم الموقّع</h1>
              <p className="text-slate-600 font-bold text-sm mt-1">الصنف: {categoryLabel(deed.category)}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleApplyTopPagination}
                disabled={applyPaginationMutation.isPending || !activePdfUrl}
                className={`px-4 py-2 rounded-lg font-black transition-all flex items-center gap-2 ${
                  applyPaginationMutation.isPending || !activePdfUrl
                    ? 'bg-indigo-950/30 text-indigo-400/50 border border-indigo-900/30 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-900/20 active:scale-[0.98]'
                }`}
                title="إدراج ترقيم الصفحات في أعلى الوثيقة"
              >
                {applyPaginationMutation.isPending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Hash className="w-4 h-4" />
                )}
                <span>إدراج ترقيم الصفحات (أعلى)</span>
              </button>
              {activePdfUrl && (
                <a
                  href={activePdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  تحميل PDF
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="relative z-0 lg:col-span-2 bg-white rounded-3xl shadow-lg border border-slate-200 p-6 signed-rasm-print-surface">
          <div className="flex items-center gap-2 text-slate-900 font-black text-lg signed-rasm-no-print">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>الرسم الموقّع (مع QR)</span>
          </div>

          <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 bg-white relative z-0">
            {activePdfUrl ? (
              <iframe
                key={`signed-rasm-frame-${renderNonce}-${activePdfUrl}`}
                title="signed-rasm"
                src={activePdfUrl}
                className="w-full h-[70vh] relative z-0"
              />
            ) : (
              <div className="h-[40vh] flex items-center justify-center p-6 text-center">
                <div>
                  <p className="text-slate-900 font-black">لا يوجد ملف PDF محفوظ لهذا الرسم بعد</p>
                  <p className="text-slate-600 font-bold text-sm mt-2">تم حفظ الرسم ضمن الرسوم الموقعة، لكن بدون نسخة PDF موقعة.</p>
                </div>
              </div>
            )}
          </div>

          {paginationError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-black">
              {paginationError}
            </div>
          )}

          {paginationSuccess && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-black">
              {paginationSuccess}
            </div>
          )}

          {embedFooterError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-black">
              {embedFooterError}
            </div>
          )}

          {judgeSendError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-black">
              {judgeSendError}
            </div>
          )}

          {judgeSendSuccess && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-black">
              {judgeSendSuccess}
            </div>
          )}

          {finalArchiveError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-black">
              {finalArchiveError}
            </div>
          )}

          <div className="mt-8 flex items-center gap-2 text-slate-900 font-black text-lg signed-rasm-no-print">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>معلومات عامة</span>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 signed-rasm-no-print">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">رقم الوثيقة</p>
              <p className="text-slate-900 font-black">{deed.savedRasm.fileNumber || 'قيد الانتظار'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">نوع الوثيقة</p>
              <p className="text-slate-900 font-black">{deed.savedRasm.documentType || '---'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                <Calendar className="w-4 h-4" />
                <span>تاريخ التوقيع</span>
              </div>
              <p className="text-slate-900 font-black">{formatDateTime(deed.signatureTimestamp)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">الحالة</p>
              <p className={`font-black ${judgeBadge.className}`}>
                {judgeBadge.label}
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-slate-900 font-black text-lg signed-rasm-no-print">
            <Hash className="w-5 h-5 text-purple-600" />
            <span>المعرّفات</span>
          </div>

          <div className="mt-4 space-y-3 signed-rasm-no-print">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">SignedDeed ID</p>
              <p className="text-slate-900 font-mono text-sm break-all">{deed.id}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">SavedRasm ID</p>
              <p className="text-slate-900 font-mono text-sm break-all">{deed.savedRasmId}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">Inclusion ID</p>
              <p className="text-slate-900 font-mono text-sm break-all">{deed.inclusionId || '---'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">Final SHA-256</p>
              <p className="text-slate-900 font-mono text-sm break-all">{deed.finalHash || '---'}</p>
            </div>
          </div>
        </div>

        <div className="relative z-20 bg-white rounded-3xl shadow-lg border border-slate-200 p-6 signed-rasm-no-print">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-900 font-black text-lg">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>بيانات التضمين</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={async () => {
                  if (!id || !sessionToken) return;
                  try {
                    setEmbedFooterError(null);
                    await embedFooterStripMutation.mutateAsync({
                      sessionToken,
                      signedDeedId: id,
                      includeQr: false,
                      origin: window.location.origin,
                    });
                    await deedQuery.refetch();
                  } catch (e: any) {
                    setEmbedFooterError(e?.message || 'تعذر إزالة QR من الشريط.');
                  }
                }}
                disabled={!hasAnyFooterStrip || embedFooterStripMutation.isPending}
                className={
                  !hasAnyFooterStrip || embedFooterStripMutation.isPending
                    ? 'px-3 py-2 rounded-2xl text-xs font-black bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'px-3 py-2 rounded-2xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors'
                }
                title={hasAnyFooterStrip ? 'زر مؤقت: إعادة إنشاء الشريط بدون QR' : 'لا يوجد شريط مراجع مدمج بعد'}
              >
                إزالة QR (مؤقت)
              </button>

              <button
                type="button"
                onClick={handleApplyTopPagination}
                disabled={applyPaginationMutation.isPending || !deed?.signedPdfUrl}
                className={
                  `flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ` +
                  (applyPaginationMutation.isPending || !deed?.signedPdfUrl
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]')
                }
                title="إدراج ترقيم الصفحات في رأس الوثيقة"
              >
                {applyPaginationMutation.isPending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Hash className="w-4 h-4" />
                )}
                <span>إدراج ترقيم الصفحات (أعلى)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFooterConfirmOpen(true)}
                disabled={footerStripCreated || embedFooterStripMutation.isPending}
                className={
                  `flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ` +
                  (footerStripCreated
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : embedFooterStripMutation.isPending
                      ? 'bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 text-white opacity-70 cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 text-white shadow-lg shadow-purple-500/20')
                }
                title={footerStripCreated ? 'تم إنشاء الشريط' : 'إدراج شريط مراجع التضمين'}
              >
                <Smartphone className="w-4 h-4" />
                <FileText className="w-4 h-4" />
                {footerStripCreated ? 'تم إنشاء الشريط' : embedFooterStripMutation.isPending ? 'جاري الإدراج...' : 'إدراج شريط مراجع التضمين'}
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">نوع الشهادة</p>
              <p className="text-slate-900 font-black">{deed.auditHubInclusion?.certificateType || deed.savedRasm.documentType || '---'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">الرقم المسلسل (Reference)</p>
              <p className="text-slate-900 font-black">{deed.auditHubInclusion?.serial || '---'}</p>
            </div>

            {/* Edit Button */}
            {canEditFields && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <p className="text-blue-700 font-bold text-sm">تحرير بيانات الشهادة</p>
                <button
                  onClick={handleEditToggle}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isEditingFields
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isEditingFields ? 'إلغاء' : 'تحرير'}
                </button>
              </div>
            )}

            {/* Error Message */}
            {editError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                <p className="text-red-700 font-bold text-sm">❌ {editError}</p>
              </div>
            )}

            {/* رقم سجل البيانات */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm mb-2">رقم سجل البيانات</p>
              {isEditingFields ? (
                <input
                  type="text"
                  value={editFields.register}
                  onChange={(e) => handleFieldChange('register', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أدخل رقم سجل البيانات"
                />
              ) : (
                <p className="text-slate-900 font-black">{deed.auditHubInclusion?.register || deed.inclusion?.registerNumber || deed.sealMetadata?.registerNumber || '---'}</p>
              )}
            </div>

            {/* الشهادة عدد */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm mb-2">الشهادة عدد</p>
              {isEditingFields ? (
                <input
                  type="text"
                  value={editFields.count}
                  onChange={(e) => handleFieldChange('count', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أدخل رقم الشهادة"
                />
              ) : (
                <p className="text-slate-900 font-black">{deed.auditHubInclusion?.count || deed.inclusion?.certificateNumber || deed.sealMetadata?.certificateNumber || '---'}</p>
              )}
            </div>

            {/* صحيفة */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm mb-2">صحيفة</p>
              {isEditingFields ? (
                <input
                  type="text"
                  value={editFields.page}
                  onChange={(e) => handleFieldChange('page', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أدخل رقم الصحيفة"
                />
              ) : (
                <p className="text-slate-900 font-black">{deed.auditHubInclusion?.page || deed.sealMetadata?.pageNumber || '---'}</p>
              )}
            </div>

            {/* Save Button when editing */}
            {isEditingFields && canEditFields && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex gap-3">
                <button
                  onClick={handleSaveFields}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
                >
                  💾 حفظ التغييرات
                </button>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">تاريخ التلقي</p>
              <p className="text-slate-900 font-black">{deed.auditHubInclusion?.registrationDate || deed.inclusion?.inclusionDate || deed.sealMetadata?.inclusionDate || '---'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">تاريخ التضمين</p>
              <p className="text-slate-900 font-black">{formatDateTime(lastOpenedAtIso)}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">جهة التوثيق / المحكمة</p>
              <p className="text-slate-900 font-black">{deed.auditHubInclusion?.authority || deed.inclusion?.court || deed.sealMetadata?.court || '---'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">اسم العدل الأول</p>
              <p className="text-slate-900 font-black">{deed.sealMetadata?.notary1Name || deed.auditHubInclusion?.notary1Name || '---'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">هاتف العدل الأول</p>
              <p className="text-slate-900 font-black">{deed.auditHubInclusion?.phone || deed.sealMetadata?.phone || '---'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">بريد العدل الأول</p>
              <p className="text-slate-900 font-black">{deed.auditHubInclusion?.email || deed.sealMetadata?.email || '---'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">اسم العدل الثاني</p>
              <p className="text-slate-900 font-black">{deed.sealMetadata?.notary2Name || deed.auditHubInclusion?.notary2Name || '---'}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setIsFooterConfirmOpen(true)}
                disabled={footerStripCreated || embedFooterStripMutation.isPending}
                className={
                  `w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition-all ` +
                  getStepButtonClass(footerStripCreated, embedFooterStripMutation.isPending, 'soft')
                }
              >
                {getStepIndicator(footerStripCreated, false, embedFooterStripMutation.isPending)}
                <Smartphone className="w-5 h-5" />
                <FileText className="w-5 h-5" />
                {footerStripCreated ? 'تم إنشاء شريط مراجع التضمين' : embedFooterStripMutation.isPending ? 'جاري الإدراج...' : 'إدراج شريط مراجع التضمين'}
              </button>
            </div>

            <div className="mb-3">
              <button
                type="button"
                onClick={async () => {
                  if (!id || !sessionToken) return;
                  try {
                    setEmbedFooterError(null);
                    await embedFooterStripMutation.mutateAsync({
                      sessionToken,
                      signedDeedId: id,
                      includeQr: false,
                    });
                    await deedQuery.refetch();
                  } catch (e: any) {
                    setEmbedFooterError(e?.message || 'تعذر إزالة QR من الشريط.');
                  }
                }}
                disabled={!hasAnyFooterStrip || embedFooterStripMutation.isPending}
                className={
                  `w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition-all ` +
                  (!hasAnyFooterStrip || embedFooterStripMutation.isPending
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100')
                }
                title={hasAnyFooterStrip ? 'زر مؤقت: إعادة إنشاء الشريط بدون QR' : 'لا يوجد شريط مراجع مدمج بعد'}
              >
                إزالة QR (مؤقت)
              </button>
            </div>

            <div className="mb-3">
              <button
                type="button"
                onClick={handleSendToJudge}
                disabled={!canSendToJudge}
                className={
                  `w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition-all ` +
                  getStepButtonClass(sendStepDone, sendToJudgeMutation.isPending, 'soft')
                }
                title={
                  !qrStepDone
                    ? 'أكمل أولاً خطوة إنشاء شريط مراجع التضمين / QR'
                    : archiveStepDone
                      ? 'تمت الأرشفة النهائية لهذا الرسم'
                      : effectiveSentToJudgeAt
                      ? 'إعادة إحالة الرسم أو تحديث الإحالة الحالية لدى قاضي التوثيق'
                      : 'إحالة الرسم على قاضي التوثيق للخطاب'
                }
              >
                {getStepIndicator(sendStepDone, sendStepLocked, sendToJudgeMutation.isPending)}
                <Send className="w-4 h-4" />
                {sendToJudgeMutation.isPending
                  ? 'جاري الإحالة...'
                  : archiveStepDone
                    ? 'تمت إحالة الرسم على قاضي التوثيق للخطاب'
                    : effectiveSentToJudgeAt
                      ? 'إعادة إحالة الرسم على قاضي التوثيق للخطاب'
                      : 'إحالة الرسم على قاضي التوثيق للخطاب'}
              </button>
            </div>

            <div className="mb-3">
              <button
                type="button"
                onClick={handleOpenFinalArchiveConfirm}
                disabled={!canArchiveFinally}
                className={
                  `w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition-all ` +
                  getStepButtonClass(archiveStepDone, archivePostJudgeMutation.isPending, 'soft')
                }
                title={
                  archiveStepDone
                    ? 'تم إيداع هذا الرسم ضمن المحفوظات العدلية النهائية'
                    : !judgeAccepted
                      ? 'يتم فتح هذا الزر فقط بعد قبول الرسم من طرف قاضي التوثيق'
                      : 'إيداع الرسم ضمن المحفوظات العدلية النهائية'
                }
              >
                {getStepIndicator(archiveStepDone, archiveStepLocked, archivePostJudgeMutation.isPending)}
                <FolderArchive className="w-4 h-4" />
                {archivePostJudgeMutation.isPending ? 'جاري الإيداع...' : archiveStepDone ? 'تم إيداع الرسم ضمن المحفوظات العدلية النهائية' : '📥إيداع الرسم ضمن المحفوظات العدلية النهائية'}
              </button>
            </div>

            <button
              onClick={handleBack}
              className="w-full px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black transition-colors"
            >
              رجوع
            </button>
          </div>
        </div>
      </div>

      {/* Inclusion Footer Strip Confirmation Modal */}
      {isFooterConfirmOpen && (
        <div className="fixed inset-0 z-[1200]">
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-violet-800 via-purple-600 to-violet-400 text-white">
                <h3 className="text-sm font-black">تأكيد إدراج شريط مراجع التضمين</h3>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-sm font-black text-slate-900">سيتم إنشاء شريط التوثيق السفلي للرسم العدلي.</p>
                <p className="text-sm font-black text-slate-900">سيتم إدراج:</p>
                <ul className="text-sm font-bold text-slate-700 space-y-1 list-none">
                  <li>✔ QR Code للتحقق</li>
                  <li>✔ مراجع سجل التضمين</li>
                  <li>✔ بيانات العدلين</li>
                </ul>
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-amber-800 text-sm font-black">
                  بعد الإنشاء: لن يكون ممكناً تعديل الرسم.
                </div>
                {embedFooterError && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-rose-700 text-sm font-black">
                    {embedFooterError}
                  </div>
                )}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFooterConfirmOpen(false)}
                    className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={embedFooterStripMutation.isPending}
                    onClick={async () => {
                      if (!id || !sessionToken) return;
                      try {
                        setEmbedFooterError(null);
                        await embedFooterStripMutation.mutateAsync({
                          sessionToken,
                          signedDeedId: id,
                          origin: window.location.origin,
                        });
                        setIsFooterConfirmOpen(false);
                        await deedQuery.refetch();
                      } catch (e: any) {
                        setEmbedFooterError(e?.message || 'تعذر إدراج الشريط داخل الوثيقة.');
                      }
                    }}
                    className={
                      embedFooterStripMutation.isPending
                        ? 'px-4 py-2 rounded-2xl text-white font-black text-sm transition-all bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 opacity-70 cursor-not-allowed'
                        : 'px-4 py-2 rounded-2xl text-white font-black text-sm transition-all bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 shadow-lg shadow-purple-500/20'
                    }
                  >
                    {embedFooterStripMutation.isPending ? 'جاري الإدراج...' : '🟣 تأكيد'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFinalArchiveConfirmOpen && (
        <div className="fixed inset-0 z-[1200]">
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-violet-800 via-purple-600 to-violet-400 text-white">
                <h3 className="text-sm font-black">⚠ تنبيه مهني</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-amber-900">
                  <p className="text-sm font-black">أنتم على وشك إيداع هذا الرسم في الأرشيف العدلي المؤمَّن.</p>
                  <p className="text-sm font-black mt-2">بعد هذه العملية سيتم قفل الرسم نهائياً ولن يكون قابلاً للتعديل.</p>
                  <p className="text-sm font-black mt-2">هل ترغبون في المتابعة؟</p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-sm font-black text-slate-900">سيقوم النظام بتنفيذ ما يلي:</p>
                  <ul className="mt-3 text-sm font-bold text-slate-700 space-y-1 list-none">
                    <li>✔ نقل الرسم إلى الأرشيف النهائي المؤمَّن</li>
                    <li>✔ تثبيت نسختي ما قبل الخطاب وما بعده</li>
                    <li>✔ اعتماد بصمة SHA-256 وفق FIPS 180-4</li>
                    <li>✔ تفعيل وضع القفل النهائي ومنع التعديل أو الحذف</li>
                    <li>✔ تسجيل عملية الأرشفة في سجل الأمان</li>
                    <li>✔ تحديث الفهرسة وإنشاء رابط تحقق مؤمَّن</li>
                  </ul>
                  <a
                    href="https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex mt-3 text-xs font-black text-violet-700 hover:underline"
                  >
                    مرجع SHA-256 / FIPS 180-4
                  </a>
                </div>

                {finalArchiveError && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-rose-700 text-sm font-black">
                    {finalArchiveError}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFinalArchiveConfirmOpen(false)}
                    disabled={archivePostJudgeMutation.isPending}
                    className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={archivePostJudgeMutation.isPending}
                    onClick={async () => {
                      if (!id || !sessionToken) return;
                      try {
                        setFinalArchiveError(null);
                        setJudgeSendError(null);
                        await ensureSealed();
                        const result: any = await archivePostJudgeMutation.mutateAsync({
                          sessionToken,
                          signedDeedId: id,
                          device: {
                            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                          },
                        });
                        setArchivedFinallyAt(result.sealedAt || new Date().toISOString());
                        setIsFinalArchiveConfirmOpen(false);
                        await deedQuery.refetch();
                        navigate('/secure-archive');
                      } catch (e: any) {
                        setFinalArchiveError(e?.message || 'تعذر إيداع الرسم ضمن المحفوظات العدلية النهائية.');
                      }
                    }}
                    className={
                      archivePostJudgeMutation.isPending
                        ? 'px-4 py-2 rounded-2xl text-white font-black text-sm transition-all bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 opacity-70 cursor-not-allowed'
                        : 'px-4 py-2 rounded-2xl text-white font-black text-sm transition-all bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 shadow-lg shadow-purple-500/20'
                    }
                  >
                    {archivePostJudgeMutation.isPending ? 'جاري الإيداع...' : 'تأكيد الإيداع'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
