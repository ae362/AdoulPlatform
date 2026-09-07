// DOCX template injection helpers (no placeholders required)
// @ts-ignore
import PizZip from 'pizzip';

import {
  htmlToWordBodyInnerXml,
  plainTextToWordBodyInnerXml,
  replaceDocumentXmlBody,
  buildMinimalDocxZipXml,
} from './docxRtl';

export type TemplateMetaData = {
  draft_text?: string;
  body_text?: string;
  text_content?: string;
  content?: string;
  Draft?: string;
  Content?: string;
  file_number?: string;
  date_gregorian?: string;
  date_hijri?: string;
  document_type?: string;
};

export function injectHtmlIntoDocxZip(zip: any, html: string) {
  const docFile = zip.file('word/document.xml');
  const docXml = docFile?.asText?.() as string | undefined;
  if (!docXml) throw new Error('Missing word/document.xml in template');

  const bodyInnerXml = htmlToWordBodyInnerXml(html);
  zip.file('word/document.xml', replaceDocumentXmlBody(docXml, bodyInnerXml));
}

export async function generateDocxBlobFromTemplate(htmlOrText: string, templatePath = '/templates/headers/DECOR ADOUL 33.docx'): Promise<Blob> {
  try {
    const resp = await fetch(templatePath, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
    if (!resp.ok) {
      throw new Error(`Failed to fetch template: ${templatePath}`);
    }
    const arrayBuffer = await resp.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const isHtml = /<[a-z][\s\S]*>/i.test(htmlOrText) || htmlOrText.includes('</p>') || htmlOrText.includes('</div>');
    if (isHtml) {
      injectHtmlIntoDocxZip(zip, htmlOrText);
    } else {
      injectPlainTextIntoDocxZip(zip, htmlOrText);
    }
    return zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    }) as Blob;
  } catch (err) {
    console.warn('[generateDocxBlobFromTemplate] Fallback to html/text only docx generator:', err);
    const isHtml = /<[a-z][\s\S]*>/i.test(htmlOrText) || htmlOrText.includes('</p>') || htmlOrText.includes('</div>');
    return isHtml ? buildDocxBlobFromHtmlOnly(htmlOrText) : buildDocxBlobFromTextOnly(htmlOrText);
  }
}

export function buildDocxBlobFromHtmlOnly(html: string) {
  const zip = new PizZip();
  const bodyInnerXml = htmlToWordBodyInnerXml(html);
  const { documentXml, contentTypes, rels, docRels } = buildMinimalDocxZipXml(bodyInnerXml);

  zip.file('[Content_Types].xml', contentTypes);
  zip.folder('_rels')?.file('.rels', rels);
  zip.folder('word')?.file('document.xml', documentXml);
  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', docRels);

  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  }) as Blob;
}

/**
 * Injects plain text into an existing DOCX zip object.
 * Preserves headers/footers/backgrounds by inserting text inside the body.
 */
export function injectPlainTextIntoDocxZip(zip: any, text: string) {
  const docFile = zip.file('word/document.xml');
  const docXml = docFile?.asText?.() as string | undefined;
  if (!docXml) throw new Error('Missing word/document.xml in template');

  const safeText = String(text ?? '').trim();
  const bodyInnerXml = plainTextToWordBodyInnerXml(safeText);
  zip.file('word/document.xml', replaceDocumentXmlBody(docXml, bodyInnerXml));
}

/**
 * Creates a brand new minimal DOCX blob from plain text.
 */
export function buildDocxBlobFromTextOnly(text: string) {
  const zip = new PizZip();
  const bodyInnerXml = plainTextToWordBodyInnerXml(text);
  const { documentXml, contentTypes, rels, docRels } = buildMinimalDocxZipXml(bodyInnerXml);

  zip.file('[Content_Types].xml', contentTypes);
  zip.folder('_rels')?.file('.rels', rels);
  zip.folder('word')?.file('document.xml', documentXml);
  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', docRels);

  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  }) as Blob;
}
