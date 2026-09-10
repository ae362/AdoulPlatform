import { useMemo, useCallback, useEffect } from 'react';
import { trpc } from '../../../trpc';

export interface UseAuditHubDataParams {
  sessionToken?: string | null;
  rasmId?: string | null;
  activeTab?: string;
  setSelectedAttachmentTabDoc?: React.Dispatch<React.SetStateAction<any>>;
  setSelectedVaultDoc?: React.Dispatch<React.SetStateAction<any>>;
  setForcedViewerDoc?: React.Dispatch<React.SetStateAction<any>>;
}

export const useAuditHubData = ({
  sessionToken,
  rasmId,
  activeTab,
  setSelectedAttachmentTabDoc,
  setSelectedVaultDoc,
  setForcedViewerDoc,
}: UseAuditHubDataParams = {}) => {
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const targetId = rasmId || searchParams.get('id') || searchParams.get('rasmId') || '';
  const shouldForceRefetch = searchParams.get('refetch') === 'true' || Boolean(searchParams.get('cb'));

  const utils = trpc.useUtils ? trpc.useUtils() : (trpc as any).useContext();

  useEffect(() => {
    // Unconditional State Teardown: reset doc selection when ID or refetch flag changes
    if (setSelectedAttachmentTabDoc) setSelectedAttachmentTabDoc(null);
    if (setSelectedVaultDoc) setSelectedVaultDoc(null);
    if (setForcedViewerDoc) setForcedViewerDoc(null);

    if (!targetId) return;
    // Always invalidate on document ID change — do not gate behind shouldForceRefetch.
    // This guarantees fresh data when the user switches documents or returns from the Judge portal.
    utils.feesAgent.documents.getSavedRasm.invalidate();
    (utils.feesAgent as any).getMyJudgeSubmission?.invalidate?.();
    (utils.feesAgent as any).getLatestApprovedJudgeSubmissionByFileNumber?.invalidate?.();
  }, [targetId, shouldForceRefetch]); // eslint-disable-line react-hooks/exhaustive-deps

  const rasmQuery = trpc.feesAgent.documents.getSavedRasm.useQuery(
    { sessionToken: sessionToken || '', id: targetId },
    { 
      enabled: Boolean(targetId),
      staleTime: 0,             // Always fetch fresh — never serve cached PDF stream
      refetchOnMount: 'always', // Force a network hit every time the component mounts
      // Auto-poll every 2.5s when the backend says the PDF is not yet compiled.
      // Stops automatically once pdfCompilationReady flips to true.
      refetchInterval: (arg: any) => {
        const payloadObj = arg?.state?.data?.payload || arg?.data?.payload || arg?.payload;
        return payloadObj?.pdfCompilationReady === false ? 2500 : false;
      },
    }
  );

  const payload = (rasmQuery.data as any)?.payload as any;
  const judgeSubmissionId = payload?.judgeSubmissionId || payload?.step7JudgeSubmissionId || undefined;

  const judgeSubmissionQuery = (trpc as any).feesAgent.getMyJudgeSubmission.useQuery(
    { sessionToken: sessionToken || '', submissionId: judgeSubmissionId || '' },
    { enabled: !!sessionToken && !!judgeSubmissionId, retry: 0 }
  );

  const fileNumberForJudgeLookup =
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
    const canonicalPreviewUrl = String((effectiveJudgeSubmission as any)?.previewUrl || (effectiveJudgeSubmission as any)?.finalPdfUrl || (effectiveJudgeSubmission as any)?.preview_url || '').trim();
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

    // 2. Direct compiled PDF from rasmQuery.data or payload pointers
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
  }, [effectiveJudgePayload, effectiveJudgeSubmission, isPdfLikeDoc, judgeAttachmentDocs]);

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
      if (setSelectedAttachmentTabDoc) setSelectedAttachmentTabDoc(null);
      return;
    }

    if (setSelectedAttachmentTabDoc) {
      setSelectedAttachmentTabDoc((prev: any) => {
        if (!prev) return attachmentTabDocs[0];
        const prevKey = `${String(prev?.url || prev?.fileUrl || '').trim()}||${String(prev?.fileName || prev?.name || '').trim()}`;
        const stillExists = attachmentTabDocs.find((doc: any) => {
          const nextKey = `${String(doc?.url || doc?.fileUrl || '').trim()}||${String(doc?.fileName || doc?.name || '').trim()}`;
          return nextKey === prevKey;
        });
        return stillExists || attachmentTabDocs[0];
      });
    }
  }, [activeTab, attachmentTabDocs, setSelectedAttachmentTabDoc]);

  const baseSelectedDoc = useMemo(() => {
    const rasmData = rasmQuery.data as any;
    const rasmPayload = (rasmData?.payload as any) || {};

    const pdfUrl =
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
      rasmPayload?.pdfPreviewUrl ||
      rasmData?.previewUrl ||
      rasmData?.preview_url ||
      null;

    const docxUrl =
      rasmData?.primary_docx_url ||
      rasmData?.primaryDocxUrl ||
      rasmPayload?.primary_docx_url ||
      rasmPayload?.primaryDocxUrl ||
      rasmData?.latest_draft_docx_url ||
      rasmData?.latestDraftDocxUrl ||
      null;

    if (pdfUrl) {
      return {
        id: `rasm-canonical-pdf-${String(rasmData?.id || 'active')}`,
        category: 'audit_final_pdf',
        fileName: rasmData?.previewName || 'المحرر القضائي المعتمد.pdf',
        name: rasmData?.previewName || 'المحرر القضائي المعتمد.pdf',
        fileUrl: pdfUrl,
        url: pdfUrl,
        docxUrl: docxUrl || undefined,
        mimeType: 'application/pdf',
        type: 'application/pdf',
        isJudgePrimary: true,
      };
    }

    if (docxUrl) {
      return {
        id: `rasm-canonical-docx-${String(rasmData?.id || 'active')}`,
        category: 'audit_final_docx',
        fileName: 'المحرر القضائي المعتمد.docx',
        name: 'المحرر القضائي المعتمد.docx',
        fileUrl: docxUrl,
        url: docxUrl,
        docxUrl: docxUrl,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        isWord: true,
        isJudgePrimary: true,
      };
    }

    const isApprovedSubmission =
      isApprovedJudgeStatus(effectiveJudgeSubmission?.status) ||
      (rasmQuery.data as any)?.payload?.pdfCompilationReady === false ||
      (rasmQuery.data as any)?.payload?.isJudgeApprovedDeed === true;

    if (isApprovedSubmission && !pdfUrl) {
      return null;
    }

    return judgePrimaryDoc || judgeWordAttachmentDoc || judgeAttachmentDoc || null;
  }, [judgeAttachmentDoc, judgePrimaryDoc, judgeWordAttachmentDoc, rasmQuery.data, effectiveJudgeSubmission]);

  // Derive PDF compilation status from the backend-injected flag or effective status.
  const pdfCompilationReady = (rasmQuery.data as any)?.payload?.pdfCompilationReady;
  const isApprovedDeed =
    pdfCompilationReady === false ||
    (rasmQuery.data as any)?.payload?.isJudgeApprovedDeed === true ||
    isApprovedJudgeStatus(effectiveJudgeSubmission?.status);

  const hasCanonicalPdfUrl = Boolean(
    (rasmQuery.data as any)?.canonical_approved_pdf ||
    (rasmQuery.data as any)?.signed_pdf_url ||
    (rasmQuery.data as any)?.pdf_preview_url ||
    (rasmQuery.data as any)?.previewUrl ||
    ((rasmQuery.data as any)?.payload as any)?.canonical_approved_pdf ||
    ((rasmQuery.data as any)?.payload as any)?.signed_pdf_url ||
    effectiveJudgeSubmission?.previewUrl ||
    judgeAttachmentDocs.some(isPdfLikeDoc)
  );

  const isAwaitingPdf: boolean =
    (pdfCompilationReady === false || (isApprovedDeed && !hasCanonicalPdfUrl)) &&
    Boolean(targetId) &&
    !rasmQuery.isLoading;

  return {
    rasmQuery,
    docData: rasmQuery.data,
    payload,
    judgeSubmissionId,
    judgeSubmissionQuery,
    latestApprovedByFileNumberQuery,
    effectiveJudgeSubmission,
    effectiveJudgePayload,
    judgeAttachmentDocs,
    judgeAttachmentDoc,
    judgeAcceptanceNotes,
    isPdfLikeDoc,
    isWordLikeDoc,
    judgeWordAttachmentDoc,
    judgePrimaryDoc,
    baseSelectedDoc,
    attachmentTabDocs,
    // PDF compilation race-condition state
    pdfCompilationReady: pdfCompilationReady ?? true,
    isApprovedDeed,
    isAwaitingPdf,
  };
};
