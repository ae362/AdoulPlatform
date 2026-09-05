function sanitizeXmlText(input: string) {
  const s = String(input ?? '');
  // XML 1.0 disallows most ASCII/C1 control chars except: TAB (0x09), LF (0x0A), CR (0x0D).
  // Word/contenteditable can introduce \f (0x0C) or other controls which would corrupt document.xml.
  return s
    .replace(/\f/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
}

export function escapeXml(text: string) {
  const clean = sanitizeXmlText(text);
  return clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type InlineStyle = {
  bold?: boolean;
  italic?: boolean;
};

function buildRunXml(text: string, style: InlineStyle) {
  const safe = escapeXml(text);
  const runPrParts: string[] = [
    '<w:rFonts w:ascii="Traditional Arabic" w:hAnsi="Traditional Arabic" w:eastAsia="Traditional Arabic" w:cs="Traditional Arabic"/>',
    '<w:sz w:val="28"/>',
    '<w:szCs w:val="28"/>',
    '<w:color w:val="000000"/>',
    '<w:rtl/>',
    '<w:lang w:val="ar-SA"/>'
  ];
  if (style.bold) runPrParts.push('<w:b/>', '<w:bCs/>');
  if (style.italic) runPrParts.push('<w:i/>', '<w:iCs/>');

  return (
    '<w:r>' +
    `<w:rPr>${runPrParts.join('')}</w:rPr>` +
    `<w:t xml:space="preserve">${safe}</w:t>` +
    '</w:r>'
  );
}

function buildBreakRunXml() {
  return '<w:r><w:rPr><w:rFonts w:ascii="Traditional Arabic" w:hAnsi="Traditional Arabic" w:cs="Traditional Arabic"/><w:sz w:val="28"/><w:szCs w:val="28"/><w:color w:val="000000"/><w:rtl/><w:lang w:val="ar-SA"/></w:rPr><w:br/></w:r>';
}

export function buildRtlParagraphXml(runsXml: string) {
  return (
    '<w:p>' +
    '<w:pPr>' +
    '<w:pStyle w:val="Normal"/>' +
    '<w:bidi/>' +
    '<w:jc w:val="right"/>' +
    '<w:spacing w:after="0" w:line="360" w:lineRule="auto"/>' +
    '<w:ind w:right="140" w:left="140"/>' +
    '<w:pBdr>' +
    '<w:top w:val="nil"/>' +
    '<w:left w:val="nil"/>' +
    '<w:bottom w:val="nil"/>' +
    '<w:right w:val="nil"/>' +
    '<w:between w:val="nil"/>' +
    '</w:pBdr>' +
    '</w:pPr>' +
    runsXml +
    '</w:p>'
  );
}

function flattenTextContent(root: HTMLElement) {
  const text = root.textContent ?? '';
  return text.replace(/\r\n/g, '\n');
}

export function htmlToPlainText(html: string) {
  if (typeof document === 'undefined') {
    // Best-effort fallback for non-DOM environments
    return (html || '')
      .replace(/<br\s*\/?>(\s*)/gi, '\n')
      .replace(/<\/?p[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = normalizeHtml(html);

  // Convert <br> to \n markers
  wrapper.querySelectorAll('br').forEach((br) => {
    br.replaceWith(document.createTextNode('\n'));
  });

  // Paragraph boundaries
  wrapper.querySelectorAll('p,div,li').forEach((el) => {
    el.appendChild(document.createTextNode('\n'));
  });

  return flattenTextContent(wrapper)
    .split('\n')
    .map((l) => l.replace(/[ ]{2,}/g, ' ').trimEnd())
    .join('\n')
    .trim();
}

function buildParagraphFromElement(el: Element, listPrefix?: string) {
  const runs: string[] = [];

  if (listPrefix) {
    runs.push(buildRunXml(listPrefix, { bold: true }));
  }

  const walk = (node: Node, style: InlineStyle) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.nodeValue ?? '';
      if (value) runs.push(buildRunXml(value, style));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === 'br') {
      runs.push(buildBreakRunXml());
      return;
    }

    const nextStyle: InlineStyle = { ...style };
    if (tag === 'strong' || tag === 'b') nextStyle.bold = true;
    if (tag === 'em' || tag === 'i') nextStyle.italic = true;

    // For nested blocks inside a paragraph, just walk children.
    element.childNodes.forEach((child) => walk(child, nextStyle));
  };

  el.childNodes.forEach((child) => walk(child, {}));

  // Ensure at least one run so Word doesn't drop the paragraph
  if (runs.length === 0) {
    runs.push(buildRunXml('', {}));
  }

  return buildRtlParagraphXml(runs.join(''));
}

export function htmlToWordBodyInnerXml(html: string) {
  if (typeof document === 'undefined') {
    const lines = htmlToPlainText(html).split(/\n/);
    return lines.map((l) => buildRtlParagraphXml(buildRunXml(l, {}))).join('');
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = normalizeHtml(html);

  const paragraphs: string[] = [];

  const blockSelector = 'p,div,h1,h2,h3,h4,h5,h6';
  const blocks = Array.from(wrapper.querySelectorAll(blockSelector));

  // If there are no block tags, treat whole content as one paragraph.
  if (blocks.length === 0) {
    paragraphs.push(buildParagraphFromElement(wrapper));
    return paragraphs.join('');
  }

  for (const block of blocks) {
    paragraphs.push(buildParagraphFromElement(block));
  }

  // Simple list support: flatten into prefixed paragraphs.
  const lists = Array.from(wrapper.querySelectorAll('ul,ol'));
  for (const list of lists) {
    const isOrdered = list.tagName.toLowerCase() === 'ol';
    const items = Array.from(list.querySelectorAll(':scope > li'));
    items.forEach((li, idx) => {
      const prefix = isOrdered ? `${idx + 1}) ` : '• ';
      paragraphs.push(buildParagraphFromElement(li, prefix));
    });
  }

  return paragraphs.join('');
}

export function plainTextToWordBodyInnerXml(text: string) {
  const lines = (text || '').split(/\r?\n/);
  if (lines.length === 0) return buildRtlParagraphXml(buildRunXml('', {}));
  return lines
    .map((l) => buildRtlParagraphXml(buildRunXml(l, {})))
    .join('');
}

export function replaceDocumentXmlBody(documentXml: string, newBodyInnerXml: string) {
  const bodyOpen = /<w:body[^>]*>/.exec(documentXml);
  if (!bodyOpen || bodyOpen.index === undefined) {
    throw new Error('Invalid document.xml: missing <w:body>');
  }

  const bodyOpenEnd = bodyOpen.index + bodyOpen[0].length;
  const bodyCloseIndex = documentXml.indexOf('</w:body>');
  if (bodyCloseIndex === -1) {
    throw new Error('Invalid document.xml: missing </w:body>');
  }

  const bodyInner = documentXml.slice(bodyOpenEnd, bodyCloseIndex);
  const sectIdx = bodyInner.lastIndexOf('<w:sectPr');
  const sectXml = sectIdx !== -1 ? bodyInner.slice(sectIdx) : '';

  const nextBodyInner = newBodyInnerXml + sectXml;
  return documentXml.slice(0, bodyOpenEnd) + nextBodyInner + documentXml.slice(bodyCloseIndex);
}

export function buildMinimalDocxZipXml(bodyInnerXml: string) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>
    ${bodyInnerXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

  return { documentXml, contentTypes, rels, docRels };
}
