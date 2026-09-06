import { useMemo, useCallback, useEffect } from 'react';
import { trpc } from '../../../trpc';

export interface UseAuditHubDataParams {
  sessionToken?: string | null;
  rasmId?: string | null;
  activeTab?: string;
  setSelectedAttachmentTabDoc?: React.Dispatch<React.SetStateAction<any>>;
}

export const useAuditHubData = ({
  sessionToken,
  rasmId,
  activeTab,
  setSelectedAttachmentTabDoc
}: UseAuditHubDataParams) => {
  const rasmQuery = trpc.feesAgent.documents.getSavedRasm.useQuery(
    { sessionToken: sessionToken || '', id: rasmId || '' },
    { 
      enabled: !!sessionToken && !!rasmId,
      retry: 0
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

      const category = (att.category || fallbackCategory || 'judge_attachment').toString();
      return {
        id: `judge-submission-attachment-${category}-${name}-${String(att.size || '')}`,
        category,
        fileName: name,
        name,
        fileUrl: url,
        url,
        mimeType: type,
        type,
        isJudgePrimary:
          Boolean(att?.isJudgePrimary) ||
          category.toLowerCase().includes('judge_attachment') ||
          Boolean((att?.field || '').toString().includes('manualRasmFile')),
      };
    };

    const out: any[] = [];

    const singleDoc = normalizeToDoc(effectiveJudgePayload?.attachment, 'judge_attachment');
    if (singleDoc) out.push(singleDoc);

    const list = Array.isArray(effectiveJudgePayload?.attachments) ? effectiveJudgePayload.attachments : [];
    for (const att of list) {
      const d = normalizeToDoc(att, att?.category);
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
    const canonicalPreviewUrl = String((effectiveJudgeSubmission as any)?.previewUrl || '').trim();
    if (canonicalPreviewUrl) {
      return {
        id: `judge-primary-preview-${String((effectiveJudgeSubmission as any)?.id || '')}`,
        category: 'judge_attachment',
        fileName:
          String((effectiveJudgeSubmission as any)?.previewName || 'judge-preview.pdf').trim() || 'judge-preview.pdf',
        name:
          String((effectiveJudgeSubmission as any)?.previewName || 'judge-preview.pdf').trim() || 'judge-preview.pdf',
        fileUrl: canonicalPreviewUrl,
        url: canonicalPreviewUrl,
        mimeType: String((effectiveJudgeSubmission as any)?.previewMimeType || 'application/pdf'),
        type: String((effectiveJudgeSubmission as any)?.previewMimeType || 'application/pdf'),
        isJudgePrimary: true,
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
      return {
        id: `judge-primary-${category}-${name}-${String(att.size || '')}`,
        category,
        fileName: name,
        name,
        fileUrl: url,
        url,
        mimeType: type,
        type,
        isJudgePrimary: true,
      };
    };

    const list = Array.isArray(effectiveJudgePayload?.attachments) ? effectiveJudgePayload.attachments : [];
    const manual = list.find((a: any) => (a?.field || '').toString().includes('manualRasmFile'));
    const judgeCategory = list.find((a: any) => (a?.category || '').toString().toLowerCase() === 'judge_attachment');

    const primaryAttachment = manual || judgeCategory || null;
    const primaryAttachmentDoc = normalizeToDoc(primaryAttachment, primaryAttachment?.category);
    if (primaryAttachmentDoc) return primaryAttachmentDoc;

    const singleDoc = normalizeToDoc(effectiveJudgePayload?.attachment, 'judge_attachment');
    if (singleDoc) return singleDoc;

    if (effectiveJudgePayload?.rasmHtml) {
      return {
        id: 'judge-smart-rasm',
        fileName: 'المحرر القضائي (المعتمد)',
        rasmHtml: effectiveJudgePayload.rasmHtml,
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
        isJudgePrimary: true,
      };
    }

    return null;
  }, [effectiveJudgePayload, effectiveJudgeSubmission]);

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

    const isMainRasmCategory = (category: string) =>
      category === 'primary_attachment' ||
      category === 'deed' ||
      category === 'rasm' ||
      category === 'contract' ||
      category === 'title_documents' ||
      category === 'post_registration' ||
      category.includes('judge_attachment');

    const rawSaved = Array.isArray((rasmQuery.data as any)?.attachments) ? rasmQuery.data.attachments : [];
    const savedDocs = rawSaved
      .map(normalizeSavedAttachment)
      .filter(Boolean)
      .filter((att: any) => {
        const category = String(att?.category || '').toLowerCase();
        return !category.startsWith('audit_');
      });

    const mainDocUrls = new Set(
      [judgePrimaryDoc, judgeAttachmentDoc]
        .map((doc: any) => String(doc?.url || doc?.fileUrl || '').trim())
        .filter(Boolean)
    );
    const mainDocNames = new Set(
      [judgePrimaryDoc, judgeAttachmentDoc]
        .map((doc: any) => String(doc?.fileName || doc?.name || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const merged = [...judgeAttachmentDocs, ...savedDocs];
    const seen = new Set<string>();
    return merged.filter((doc: any) => {
      const category = String(doc?.category || '').toLowerCase();
      const url = String(doc?.url || doc?.fileUrl || '').trim();
      const fileName = String(doc?.fileName || doc?.name || '').trim().toLowerCase();
      if (Boolean(doc?.isJudgePrimary) || isMainRasmCategory(category)) {
        return false;
      }
      if (url && mainDocUrls.has(url)) return false;
      if (fileName && mainDocNames.has(fileName)) return false;

      const key = `${String(doc?.url || '').trim()}||${String(doc?.fileName || doc?.name || '').trim()}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [judgeAttachmentDoc, judgeAttachmentDocs, judgePrimaryDoc, (rasmQuery.data as any)?.attachments]);

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

  return {
    rasmQuery,
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
    attachmentTabDocs
  };
};
