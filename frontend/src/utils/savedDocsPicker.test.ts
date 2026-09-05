import { describe, expect, it } from 'vitest';
import { pickBestSavedDocsAttachment } from './savedDocsPicker';

const mk = (overrides: Partial<any>) => ({
  id: 'att-1',
  category: 'document',
  fileName: 'file.pdf',
  fileUrl: 'https://example.com/file.pdf',
  mimeType: 'application/pdf',
  fileSize: null,
  metadata: null,
  ...overrides,
});

describe('pickBestSavedDocsAttachment', () => {
  it('prefers latest audit-draft DOCX over PDF category=document', () => {
    const pdf = mk({ id: 'pdf1', category: 'document', fileName: 'document-123.pdf', fileUrl: 'https://x/doc.pdf', mimeType: 'application/pdf' });
    const judge = mk({ id: 'j1', category: 'judge_attachment_docx', fileName: 'judge.docx', fileUrl: 'https://x/judge.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const audit = mk({
      id: 'audit:final_docx:ver-777',
      category: 'audit_final_docx',
      fileName: 'audit-final.docx',
      fileUrl: 'https://supabase.co/storage/v1/object/public/documents/audit-drafts/ver-777.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      metadata: { source: 'audit_doc_versions', versionId: 'ver-777' },
    });

    const res = pickBestSavedDocsAttachment({
      attachments: [pdf, judge, audit],
      latestDraftVersionId: 'ver-777',
      latestDraftDocxUrl: audit.fileUrl,
      preferPdf: false,
    });

    expect(res.attachment?.id).toBe(audit.id);
    expect(res.reason).toMatch(/latestDraftDocxUrl|audit_draft_docx/);
  });

  it('prefers judge DOCX when no audit draft DOCX exists', () => {
    const pdf = mk({ id: 'pdf1', category: 'document', fileName: 'document-123.pdf', fileUrl: 'https://x/doc.pdf', mimeType: 'application/pdf' });
    const judge = mk({ id: 'j1', category: 'judge_attachment_docx', fileName: 'judge.docx', fileUrl: 'https://x/judge.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const res = pickBestSavedDocsAttachment({ attachments: [pdf, judge], preferPdf: false });
    expect(res.attachment?.id).toBe(judge.id);
    expect(res.reason).toBe('judge_attachment_docx');
  });

  it('falls back to PDF when no DOCX exists', () => {
    const pdf = mk({ id: 'pdf1', category: 'document', fileName: 'document-123.pdf', fileUrl: 'https://x/doc.pdf', mimeType: 'application/pdf' });
    const res = pickBestSavedDocsAttachment({ attachments: [pdf], preferPdf: false });
    expect(res.attachment?.id).toBe(pdf.id);
    expect(res.reason).toBe('no_docx_fallback_pdf');
  });

  it('prefers PDF in explicit pdf mode (signing/preview)', () => {
    const pdf = mk({ id: 'pdf1', category: 'document', fileName: 'document-123.pdf', fileUrl: 'https://x/doc.pdf', mimeType: 'application/pdf' });
    const docx = mk({ id: 'd1', category: 'judge_attachment_docx', fileName: 'judge.docx', fileUrl: 'https://x/judge.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const res = pickBestSavedDocsAttachment({ attachments: [docx, pdf], preferPdf: true });
    expect(res.attachment?.id).toBe(pdf.id);
    expect(res.reason).toBe('prefer_pdf_document');
  });
});
