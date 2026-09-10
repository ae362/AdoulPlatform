import { describe, expect, it } from 'vitest';
import { pickBestSavedDocsAttachment, deduplicateAttachments } from './savedDocsPicker';

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

describe('deduplicateAttachments', () => {
  it('suppresses companion DOCX and primary deed files when deed has no external attachments', () => {
    const primaryDoc = {
      streamUrl: 'https://example.com/deed.pdf',
      title: 'المستند المعتمد.pdf',
    };

    const attachments = [
      {
        id: 'att-docx',
        name: 'judge_attachment_docx.docx',
        fileName: 'judge_attachment_docx.docx',
        url: 'https://example.com/judge_attachment_docx.docx',
        category: 'وثيقة موجهة للقاضي',
        rawCategory: 'judge_attachment_docx',
        type: 'DOCX',
      },
      {
        id: 'att-primary-pdf',
        name: 'المستند المعتمد.pdf',
        fileName: 'المستند المعتمد.pdf',
        url: 'https://example.com/deed.pdf',
        category: 'الرسم الأساسي المعتمد',
        type: 'PDF',
      },
    ];

    const result = deduplicateAttachments(attachments, primaryDoc);
    expect(result).toHaveLength(0);
  });

  it('keeps genuine external user attachments while filtering out companion artifacts', () => {
    const primaryDoc = {
      streamUrl: 'https://example.com/deed.pdf',
      title: 'المستند المعتمد.pdf',
    };

    const attachments = [
      {
        id: 'companion-docx',
        name: 'rasm_draft.docx',
        fileName: 'rasm_draft.docx',
        url: 'https://example.com/rasm_draft.docx',
        category: 'وثيقة موجهة للقاضي',
        rawCategory: 'judge_attachment_docx',
        type: 'DOCX',
      },
      {
        id: 'cin-card',
        name: 'بطاقة التعريف الوطنية.png',
        fileName: 'بطاقة التعريف الوطنية.png',
        url: 'https://example.com/cin.png',
        category: 'بطاقة التعريف الوطنية',
        rawCategory: 'id_images',
        type: 'IMAGE',
      },
    ];

    const result = deduplicateAttachments(attachments, primaryDoc);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cin-card');
  });
});
