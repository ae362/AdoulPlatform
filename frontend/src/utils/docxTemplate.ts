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
  const nextDocXml = replaceDocumentXmlBody(docXml, bodyInnerXml);
  zip.file('word/document.xml', nextDocXml);
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

  // Simplified robust insertion: Find <w:body> and insert after the first paragraph (banner)
  const bodyMatch = /<w:body[^>]*>/.exec(docXml);
  if (!bodyMatch) {
    zip.file('word/document.xml', replaceDocumentXmlBody(docXml, bodyInnerXml));
    return;
  }

  const bodyStartIdx = bodyMatch.index + bodyMatch[0].length;
  const bodyEndIdx = docXml.indexOf('</w:body>', bodyStartIdx);
  if (bodyEndIdx === -1) {
    zip.file('word/document.xml', replaceDocumentXmlBody(docXml, bodyInnerXml));
    return;
  }

  // Look for first paragraph ending </w:p> to attempt skipping banner
  const firstParaEndIdx = docXml.indexOf('</w:p>', bodyStartIdx);
  const sectMatch = /<w:sectPr[^>]*>/.exec(docXml);
  const sectPrIdx = sectMatch ? sectMatch.index : -1;

  let insertionPoint = bodyStartIdx;
  
  // If first paragraph exists and is before sectPr, insert after it.
  if (firstParaEndIdx !== -1 && firstParaEndIdx < bodyEndIdx) {
    if (sectPrIdx === -1 || firstParaEndIdx < sectPrIdx) {
       insertionPoint = firstParaEndIdx + 6;
    }
  }

  // Safety: don't insert after sectPr
  if (sectPrIdx !== -1 && insertionPoint > sectPrIdx) {
    insertionPoint = sectPrIdx;
  }

  // Ensure clean XML insertion
  const cleanBodyInner = bodyInnerXml.replace(/>\s+</g, '><').trim();
  
  const finalDocXml = docXml.slice(0, insertionPoint) + cleanBodyInner + docXml.slice(insertionPoint);
  zip.file('word/document.xml', finalDocXml);
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
  }) as Blob;
}
