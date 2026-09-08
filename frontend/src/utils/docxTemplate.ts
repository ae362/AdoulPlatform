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

const TOP_HEADER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
       xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
       xmlns:o="urn:schemas-microsoft-com:office:office"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
       xmlns:v="urn:schemas-microsoft-com:vml"
       xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:w10="urn:schemas-microsoft-com:office:word"
       xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
       xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
       xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
       xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
       xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
       mc:Ignorable="w14 wp14">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Header"/>
      <w:bidi/>
      <w:jc w:val="right"/>
      <w:rPr>
        <w:rFonts w:ascii="Amiri" w:hAnsi="Amiri" w:eastAsia="Amiri" w:cs="Amiri"/>
        <w:sz w:val="19"/>
        <w:szCs w:val="19"/>
        <w:color w:val="555555"/>
        <w:rtl/>
        <w:lang w:val="ar-SA"/>
      </w:rPr>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Amiri" w:hAnsi="Amiri" w:eastAsia="Amiri" w:cs="Amiri"/>
        <w:sz w:val="19"/>
        <w:szCs w:val="19"/>
        <w:color w:val="555555"/>
        <w:rtl/>
        <w:lang w:val="ar-SA"/>
      </w:rPr>
      <w:t xml:space="preserve">الصفحة </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE"/>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Amiri" w:hAnsi="Amiri" w:eastAsia="Amiri" w:cs="Amiri"/>
        <w:sz w:val="19"/>
        <w:szCs w:val="19"/>
        <w:color w:val="555555"/>
        <w:rtl/>
        <w:lang w:val="ar-SA"/>
      </w:rPr>
      <w:t xml:space="preserve"> من </w:t>
    </w:r>
    <w:fldSimple w:instr="NUMPAGES"/>
  </w:p>
</w:hdr>`;

/**
 * Injects OpenXML top-header pagination directly into a DOCX zip container.
 */
export function injectTopHeaderPaginationIntoDocxZip(zip: any): void {
  // 1. Write or override word/header1.xml
  zip.file('word/header1.xml', TOP_HEADER_XML);

  // 2. Ensure [Content_Types].xml includes header override
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml = ctFile.asText();
    if (!ctXml.includes('PartName="/word/header1.xml"')) {
      ctXml = ctXml.replace(
        '</Types>',
        '  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>\n</Types>'
      );
      zip.file('[Content_Types].xml', ctXml);
    }
  }

  // 3. Register relationship in word/_rels/document.xml.rels
  const relsFile = zip.file('word/_rels/document.xml.rels');
  let headerRelId = 'rIdHeader1';
  if (relsFile) {
    let relsXml = relsFile.asText();
    if (!relsXml.includes('Target="header1.xml"')) {
      const matchIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)];
      let maxId = 10;
      for (const m of matchIds) {
        const val = parseInt(m[1], 10);
        if (Number.isFinite(val) && val > maxId) maxId = val;
      }
      headerRelId = `rId${maxId + 1}`;
      relsXml = relsXml.replace(
        '</Relationships>',
        `  <Relationship Id="${headerRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>\n</Relationships>`
      );
      zip.file('word/_rels/document.xml.rels', relsXml);
    } else {
      const existingMatch = relsXml.match(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="header1\.xml"/);
      if (existingMatch) {
        headerRelId = existingMatch[1];
      }
    }
  }

  // 4. Bind headerReference inside w:sectPr in word/document.xml
  const docFile = zip.file('word/document.xml');
  if (docFile) {
    let docXml = docFile.asText();
    const headerRefTag = `<w:headerReference w:type="default" r:id="${headerRelId}"/>`;
    if (!docXml.includes(headerRefTag)) {
      docXml = docXml.replace(/<w:sectPr([^>]*)>/g, (_match, attrs) => {
        return `<w:sectPr${attrs}>${headerRefTag}`;
      });
      zip.file('word/document.xml', docXml);
    }
  }
}

/**
 * Applies top-header pagination to a DOCX blob.
 */
export async function applyTopHeaderPaginationToBlob(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  injectTopHeaderPaginationIntoDocxZip(zip);
  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  }) as Blob;
}
