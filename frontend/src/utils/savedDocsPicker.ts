export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const PDF_MIME = 'application/pdf';

export type SavedDocAttachment = {
  id: string;
  category: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  metadata: Record<string, unknown> | null;
};

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
  return name.endsWith('.docx') || url.includes('.docx');
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
  // Backend virtual attachments are commonly shaped like: audit:final_docx:<versionId>
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
    // Category-ordered PDF preference: edited PDF > original PDF > any PDF > DOCX.
    // 1) Audit draft/final PDF matching the pinned version ID.
    if (latestDraftVersionId) {
      const exactAuditPdf = pdf.find((a) => {
        const cat = lower(a.category);
        const metaVersionId = normalize((a.metadata as any)?.versionId);
        return (cat === 'audit_draft_pdf' || cat === 'audit_final_pdf') && metaVersionId === latestDraftVersionId;
      });
      if (exactAuditPdf) return { attachment: exactAuditPdf, reason: 'prefer_pdf_audit_exact_version' };
    }
    // 2) Any audit draft/final PDF.
    const auditPdf = pdf.find((a) => {
      const cat = lower(a.category);
      return cat === 'audit_draft_pdf' || cat === 'audit_final_pdf';
    });
    if (auditPdf) return { attachment: auditPdf, reason: 'prefer_pdf_audit' };
    // 3) Original document PDF (rasm PDF saved from FeesAgent).
    const documentPdf = pdf.find((a) => lower(a.category) === 'document');
    if (documentPdf) return { attachment: documentPdf, reason: 'prefer_pdf_document' };
    // 4) Any PDF.
    if (pdf[0]) return { attachment: pdf[0], reason: 'prefer_pdf_any' };
    // 5) Fall back to DOCX.
    if (docx[0]) return { attachment: docx[0], reason: 'prefer_pdf_mode_no_pdf_fallback_docx' };
    return { attachment: attachments[0] || null, reason: 'prefer_pdf_mode_no_pdf_no_docx_fallback_first' };
  }

  // 1) Exact pointer match (authoritative)
  if (latestDraftDocxUrl) {
    const exact = docx.find((a) => normalize(a.fileUrl) === latestDraftDocxUrl);
    if (exact) return { attachment: exact, reason: 'latestDraftDocxUrl_exact_match' };
  }

  // 2) Audit draft heuristics (audit-drafts path, audit category, metadata)
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

  // 3) Judge DOCX (immutable base)
  const judgeDocx = docx.find((a) => lower(a.category) === 'judge_attachment_docx');
  if (judgeDocx) return { attachment: judgeDocx, reason: 'judge_attachment_docx' };

  // 4) Any DOCX
  if (docx[0]) return { attachment: docx[0], reason: 'any_docx' };

  // 5) Finally PDF
  if (pdf[0]) return { attachment: pdf[0], reason: 'no_docx_fallback_pdf' };

  return { attachment: attachments[0] || null, reason: 'no_docx_no_pdf_fallback_first' };
}
