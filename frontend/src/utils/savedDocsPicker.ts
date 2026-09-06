export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const PDF_MIME = 'application/pdf';
export const HTML_MIME = 'text/html';

export type SavedDocAttachment = {
  id: string;
  category: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize?: number | null;
  metadata: Record<string, unknown> | null;
};

export interface NormalizedDocument {
  id: string;
  title: string;
  fileType: 'PDF' | 'DOCX' | 'HTML';
  streamUrl: string | null;
  rawContent?: string | null;
  metadata: Record<string, unknown>;
}

function normalize(s: unknown) {
  return String(s ?? '').trim();
}

function lower(s: unknown) {
  return normalize(s).toLowerCase();
}

export function isDocxAttachment(a: SavedDocAttachment) {
  const mime = lower(a.mimeType);
  if (mime === DOCX_MIME) return true;
  if (mime.includes('wordprocessingml')) return true;
  const name = lower(a.fileName);
  const url = lower(a.fileUrl);
  return name.endsWith('.docx') || name.endsWith('.doc') || url.includes('.docx') || url.includes('.doc');
}

export function isPdfAttachment(a: SavedDocAttachment) {
  const mime = lower(a.mimeType);
  if (mime === PDF_MIME) return true;
  if (mime.includes('pdf')) return true;
  const name = lower(a.fileName);
  const url = lower(a.fileUrl);
  return name.endsWith('.pdf') || url.includes('.pdf');
}

function looksLikeAuditDraftUrl(url: string) {
  const u = lower(url);
  return u.includes('/audit-drafts/') || u.includes('audit-drafts/');
}

function parseVersionIdFromVirtualAttachmentId(attachmentId: string) {
  const s = normalize(attachmentId);
  const parts = s.split(':');
  if (parts.length >= 3 && parts[0] === 'audit') return parts[parts.length - 1] || null;
  return null;
}

export function pickBestSavedDocsAttachment(opts: {
  attachments: SavedDocAttachment[];
  latestDraftVersionId?: string | null;
  latestDraftDocxUrl?: string | null;
  preferPdf?: boolean;
}): { attachment: SavedDocAttachment | null; reason: string } {
  const attachments = opts.attachments || [];
  const preferPdf = Boolean(opts.preferPdf);
  const latestDraftVersionId = normalize(opts.latestDraftVersionId);
  const latestDraftDocxUrl = normalize(opts.latestDraftDocxUrl);

  const docx = attachments.filter(isDocxAttachment);
  const pdf = attachments.filter(isPdfAttachment);

  if (preferPdf) {
    if (latestDraftVersionId) {
      const exactAuditPdf = pdf.find((a) => {
        const cat = lower(a.category);
        const metaVersionId = normalize((a.metadata as any)?.versionId);
        return (cat === 'audit_draft_pdf' || cat === 'audit_final_pdf') && metaVersionId === latestDraftVersionId;
      });
      if (exactAuditPdf) return { attachment: exactAuditPdf, reason: 'prefer_pdf_audit_exact_version' };
    }

    const auditPdf = pdf.find((a) => {
      const cat = lower(a.category);
      return cat === 'audit_draft_pdf' || cat === 'audit_final_pdf';
    });
    if (auditPdf) return { attachment: auditPdf, reason: 'prefer_pdf_audit' };

    const documentPdf = pdf.find((a) => lower(a.category) === 'document');
    if (documentPdf) return { attachment: documentPdf, reason: 'prefer_pdf_document' };

    if (pdf[0]) return { attachment: pdf[0], reason: 'prefer_pdf_any' };
    if (docx[0]) return { attachment: docx[0], reason: 'prefer_pdf_mode_no_pdf_fallback_docx' };
    return { attachment: attachments[0] || null, reason: 'prefer_pdf_mode_no_pdf_no_docx_fallback_first' };
  }

  if (latestDraftDocxUrl) {
    const exact = docx.find((a) => normalize(a.fileUrl) === latestDraftDocxUrl);
    if (exact) return { attachment: exact, reason: 'latestDraftDocxUrl_exact_match' };
  }

  const auditDocx = docx.find((a) => {
    const cat = lower(a.category);
    const metaSource = lower((a.metadata as any)?.source);
    const metaVersionId = normalize((a.metadata as any)?.versionId);
    const derivedVersionId = parseVersionIdFromVirtualAttachmentId(a.id);

    if (latestDraftVersionId) {
      if (metaVersionId && metaVersionId === latestDraftVersionId) return true;
      if (derivedVersionId && derivedVersionId === latestDraftVersionId) return true;
      if (looksLikeAuditDraftUrl(a.fileUrl) && lower(a.fileUrl).includes(lower(latestDraftVersionId))) return true;
    }

    return looksLikeAuditDraftUrl(a.fileUrl) || cat.includes('audit') || metaSource.includes('audit_doc_versions');
  });
  if (auditDocx) return { attachment: auditDocx, reason: 'audit_draft_docx' };

  const judgeDocx = docx.find((a) => lower(a.category) === 'judge_attachment_docx');
  if (judgeDocx) return { attachment: judgeDocx, reason: 'judge_attachment_docx' };

  if (docx[0]) return { attachment: docx[0], reason: 'any_docx' };
  if (pdf[0]) return { attachment: pdf[0], reason: 'no_docx_fallback_pdf' };

  return { attachment: attachments[0] || null, reason: 'no_docx_no_pdf_fallback_first' };
}

/**
 * Permanent, robust document payload picker.
 * Inspects all DB attachments, payload artifacts, embedded base64 files,
 * auto-generated drafts, and summaries to ALWAYS return a valid NormalizedDocument.
 */
export function pickNormalizedDocument(
  submissionPayload: any = {},
  attachments: SavedDocAttachment[] = []
): NormalizedDocument {
  const payload = submissionPayload || {};

  // 1. Primary Deed Attachment (from deed_attachments in DB)
  if (Array.isArray(attachments) && attachments.length > 0) {
    const best = pickBestSavedDocsAttachment({ attachments, preferPdf: true });
    if (best.attachment && best.attachment.fileUrl) {
      const isPdf = isPdfAttachment(best.attachment);
      const isDocx = isDocxAttachment(best.attachment);

      return {
        id: best.attachment.id || `doc_${Date.now()}`,
        title: best.attachment.fileName || 'المستند القضائي المعتمد',
        fileType: isPdf ? 'PDF' : isDocx ? 'DOCX' : 'HTML',
        streamUrl: best.attachment.fileUrl,
        metadata: {
          category: best.attachment.category,
          reason: best.reason,
          ...(best.attachment.metadata || {}),
        },
      };
    }
  }

  // 2. Direct manual rasm file or attachment in payload
  const directFiles = [
    payload.manualRasmFile,
    payload.attachment,
    payload.judgeAttachment,
    payload.judgeAcceptedDoc,
    payload.baseDoc,
    Array.isArray(payload.attachments) ? payload.attachments[0] : null,
  ].filter(Boolean);

  for (const file of directFiles) {
    const url = String(file.fileUrl || file.url || file.publicUrl || '').trim();
    const base64 = typeof file.base64 === 'string' ? file.base64.trim() : '';
    const name = String(file.fileName || file.name || file.filename || 'الرسم القضائي المرفوع');
    const mime = String(file.mimeType || file.type || file.mime_type || '').toLowerCase();

    let resolvedUrl: string | null = url || null;
    if (!resolvedUrl && base64) {
      resolvedUrl = base64.startsWith('data:') ? base64 : `data:${mime || 'application/pdf'};base64,${base64}`;
    }

    if (resolvedUrl) {
      const isPdf = name.toLowerCase().endsWith('.pdf') || mime.includes('pdf') || resolvedUrl.includes('.pdf') || resolvedUrl.startsWith('data:application/pdf');
      const isDocx = name.toLowerCase().endsWith('.docx') || name.toLowerCase().endsWith('.doc') || mime.includes('word') || resolvedUrl.includes('.docx');

      return {
        id: file.id || 'payload-primary-file',
        title: name,
        fileType: isPdf ? 'PDF' : isDocx ? 'DOCX' : 'HTML',
        streamUrl: resolvedUrl,
        metadata: {
          category: file.category || 'manual_upload',
          source: 'payload',
        },
      };
    }
  }

  // 3. Auto-generated HTML / text Draft
  const candidateHtmls = [
    payload.rasmHtml,
    payload.html,
    payload.content,
    payload.draft,
    payload.html_content,
    payload.htmlContent,
    payload.state?.draft,
    payload.state?.html,
    payload.state?.rasmHtml,
    payload.saved_rasms?.html_content,
    payload.saved_rasms?.draft,
    payload.saved_rasms?.html,
    payload.savedRasm?.html_content,
    payload.savedRasm?.draft,
    payload.savedRasm?.html,
    submissionPayload?.html_content,
    submissionPayload?.html,
    submissionPayload?.rasmHtml,
    submissionPayload?.draft,
  ];

  for (const c of candidateHtmls) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return {
        id: 'html-doc',
        title: 'المستند الرسمي برسم التوثيق المعتمد',
        fileType: 'HTML',
        streamUrl: 'html://rasm',
        rawContent: c.trim(),
        metadata: {
          rawContent: c.trim(),
          category: 'primary_draft',
        },
      };
    }
  }

  // 4. Top-level preview URL in submission
  if (payload.previewUrl || submissionPayload?.previewUrl) {
    const pUrl = String(payload.previewUrl || submissionPayload?.previewUrl);
    const pName = String(payload.previewName || submissionPayload?.previewName || 'معاينة المستند');
    const isPdf = pUrl.includes('.pdf') || pName.toLowerCase().endsWith('.pdf');
    return {
      id: 'preview-doc',
      title: pName,
      fileType: isPdf ? 'PDF' : 'DOCX',
      streamUrl: pUrl,
      metadata: {
        category: 'preview_fallback',
      },
    };
  }

  // 5. Fallback structured deed text from summary or metadata
  const fallbackSummary = String(payload.summary || submissionPayload?.summary || payload.documentType || submissionPayload?.documentType || 'رسم توثيقي عدلي').trim();
  return {
    id: 'generated-summary-doc',
    title: payload.documentType || submissionPayload?.documentType || 'المستند الرسمي برسم التوثيق المعتمد',
    fileType: 'HTML',
    streamUrl: 'html://rasm',
    rawContent: fallbackSummary,
    metadata: {
      rawContent: fallbackSummary,
      category: 'summary_fallback',
    },
  };
}
