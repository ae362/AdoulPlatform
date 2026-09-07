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
  fileType: 'PDF' | 'DOCX' | 'IMAGE' | 'HTML';
  streamUrl: string | null;
  editableUrl?: string | null;
  docxUrl?: string | null;
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
  return name.endsWith('.pdf') || url.includes('.pdf') || url.startsWith('data:application/pdf');
}

export function isImageAttachment(a: SavedDocAttachment) {
  const mime = lower(a.mimeType);
  if (mime.startsWith('image/')) return true;
  const name = lower(a.fileName);
  const url = lower(a.fileUrl);
  return (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    url.includes('.png') ||
    url.includes('.jpg') ||
    url.includes('.jpeg') ||
    url.startsWith('data:image/')
  );
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

  const pdf = attachments.filter(isPdfAttachment);
  const docx = attachments.filter(isDocxAttachment);
  const images = attachments.filter(isImageAttachment);

  if (preferPdf) {
    if (latestDraftVersionId) {
      const exactAuditPdf = pdf.find((a) => {
        const cat = lower(a.category);
        const metaVersionId = normalize((a.metadata as any)?.versionId || (a.metadata as any)?.version_id);
        return (cat === 'audit_final_pdf' || cat === 'audit_draft_pdf') && metaVersionId === latestDraftVersionId;
      });
      if (exactAuditPdf) return { attachment: exactAuditPdf, reason: 'prefer_pdf_audit_exact_version' };
    }

    const auditFinalPdf = pdf.find((a) => lower(a.category) === 'audit_final_pdf');
    if (auditFinalPdf) return { attachment: auditFinalPdf, reason: 'prefer_pdf_audit_final' };

    const judgePdf = pdf.find((a) => lower(a.category) === 'judge_attachment');
    if (judgePdf) return { attachment: judgePdf, reason: 'prefer_pdf_judge_attachment' };

    const auditDraftPdf = pdf.find((a) => lower(a.category) === 'audit_draft_pdf');
    if (auditDraftPdf) return { attachment: auditDraftPdf, reason: 'prefer_pdf_audit_draft' };

    const documentPdf = pdf.find((a) => lower(a.category) === 'document' || lower(a.category) === 'primary_attachment');
    if (documentPdf) return { attachment: documentPdf, reason: 'prefer_pdf_document' };

    if (pdf[0]) return { attachment: pdf[0], reason: 'prefer_pdf_any' };
    if (docx[0]) return { attachment: docx[0], reason: 'prefer_pdf_mode_no_pdf_fallback_docx' };
    if (images[0]) return { attachment: images[0], reason: 'prefer_pdf_mode_fallback_image' };
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
 * Hierarchy:
 * 1. Primary compiled PDF from submission / payload (previewUrl, finalPdfUrl, latestSigningPdfUrl)
 * 2. Primary PDF attachment from deed_attachments (audit_final_pdf, judge_attachment, etc.)
 * 3. Payload direct PDF / DOCX file
 * 4. DOCX attachments
 * 5. Fallback ONLY to raw HTML / draft text if no compiled binary asset exists.
 */
export function pickNormalizedDocument(
  submissionPayload: any = {},
  attachments: SavedDocAttachment[] = []
): NormalizedDocument {
  const payload = submissionPayload?.payload || submissionPayload || {};

  // 1. PRIMARY COMPILED PDF STREAM (from submission record or payload pointers)
  const candidatePdfUrls = [
    { url: submissionPayload?.pdf_preview_url, name: 'المستند المعتمد.pdf' },
    { url: payload?.pdf_preview_url, name: 'المستند المعتمد.pdf' },
    { url: submissionPayload?.previewUrl || submissionPayload?.preview_url, name: submissionPayload?.previewName || submissionPayload?.preview_name || 'المستند المعتمد.pdf' },
    { url: submissionPayload?.finalPdfUrl || submissionPayload?.final_pdf_url, name: 'المستند النهائي المعتمد.pdf' },
    { url: payload?.previewUrl || payload?.preview_url, name: payload?.previewName || payload?.preview_name || 'المستند المعتمد.pdf' },
    { url: payload?.finalPdfUrl || payload?.final_pdf_url, name: 'المستند النهائي.pdf' },
    { url: payload?.latestSigningPdfUrl, name: 'مستند التوقيع المعتمد.pdf' },
    { url: payload?.latestDraftPdfUrl, name: 'مسودة الرسم المعتمدة.pdf' },
  ];

  for (const candidate of candidatePdfUrls) {
    const url = normalize(candidate.url);
    if (url && (url.toLowerCase().endsWith('.pdf') || url.includes('.pdf') || url.startsWith('data:application/pdf') || url.startsWith('blob:') || url.startsWith('http'))) {
      return {
        id: 'primary-compiled-pdf',
        title: candidate.name,
        fileType: 'PDF',
        streamUrl: url,
        metadata: {
          category: 'compiled_pdf_stream',
          source: 'server_pipeline',
        },
      };
    }
  }

  // 2. Primary Deed Attachment from DB (deed_attachments)
  if (Array.isArray(attachments) && attachments.length > 0) {
    const best = pickBestSavedDocsAttachment({ attachments, preferPdf: true });
    if (best.attachment && best.attachment.fileUrl) {
      const isPdf = isPdfAttachment(best.attachment);
      const isDocx = isDocxAttachment(best.attachment);
      const isImg = isImageAttachment(best.attachment);

      return {
        id: best.attachment.id || `doc_${Date.now()}`,
        title: best.attachment.fileName || 'المستند القضائي المعتمد',
        fileType: isPdf ? 'PDF' : isDocx ? 'DOCX' : isImg ? 'IMAGE' : 'HTML',
        streamUrl: best.attachment.fileUrl,
        metadata: {
          category: best.attachment.category,
          reason: best.reason,
          ...(best.attachment.metadata || {}),
        },
      };
    }
  }

  // 3. Direct manual rasm file or attachment in payload
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
      const isImg = mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)/i.test(name) || resolvedUrl.startsWith('data:image/');

      return {
        id: file.id || 'payload-primary-file',
        title: name,
        fileType: isPdf ? 'PDF' : isDocx ? 'DOCX' : isImg ? 'IMAGE' : 'HTML',
        streamUrl: resolvedUrl,
        metadata: {
          category: file.category || 'manual_upload',
          source: 'payload',
        },
      };
    }
  }

  // 4. Auto-generated HTML / text Draft (Fallback ONLY when no binary PDF/DOCX exists)
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

/**
 * Deduplicate attachments list so redundant DOCX/PDF dual entries for the same deed
 * or primary deed files are merged / suppressed from appearing as duplicate cards in the sidebar.
 */
export function deduplicateAttachments<T extends { fileName?: string; name?: string; url?: string; fileUrl?: string; category?: string; type?: string; isPrimary?: boolean }>(
  attachments: T[],
  primaryDoc?: { url?: string | null; streamUrl?: string | null; fileName?: string | null; name?: string | null; title?: string | null } | null
): T[] {
  const primaryUrl = String(primaryDoc?.streamUrl || primaryDoc?.url || '').trim().toLowerCase();
  const primaryName = String(primaryDoc?.title || primaryDoc?.fileName || primaryDoc?.name || '').trim().toLowerCase().replace(/\.(pdf|docx?|dotx?)$/i, '');

  const isPrimaryDeedCategory = (cat: string) => {
    const c = cat.toLowerCase();
    return (
      c === 'judge_attachment' ||
      c === 'judge_attachment_docx' ||
      c === 'audit_final_pdf' ||
      c === 'audit_final_docx' ||
      c === 'audit_draft_pdf' ||
      c === 'audit_draft_docx' ||
      c === 'primary_attachment' ||
      c === 'manualrasmfile' ||
      c === 'الرسم الأساسي المعتمد'
    );
  };

  const seenKeys = new Set<string>();
  const out: T[] = [];

  for (const att of attachments) {
    if ((att as any)?.isPrimary) continue;
    const url = String(att.url || att.fileUrl || '').trim().toLowerCase();
    const name = String(att.fileName || att.name || '').trim().toLowerCase();
    const baseName = name.replace(/\.(pdf|docx?|dotx?|png|jpe?g)$/i, '');
    const cat = String(att.category || '').toLowerCase();

    // If matches primary document by url, skip
    if (primaryUrl && url && (url === primaryUrl || url.split('?')[0] === primaryUrl.split('?')[0])) {
      continue;
    }
    // If categorized as primary deed attachment, skip (already represented by primary deed card)
    if (isPrimaryDeedCategory(cat)) {
      continue;
    }
    // If filename matches primary deed name, skip duplicate
    if (primaryName && baseName && (baseName === primaryName || primaryName.includes(baseName) || baseName.includes(primaryName))) {
      continue;
    }

    const dedupKey = `${baseName || name}_${url.split('?')[0]}`;
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    out.push(att);
  }

  return out;
}
