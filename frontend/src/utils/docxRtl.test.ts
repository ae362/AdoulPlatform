import { describe, it, expect } from 'vitest';
import { replaceDocumentXmlBody } from './docxRtl';

describe('replaceDocumentXmlBody', () => {
  it('replaces body content but preserves sectPr', () => {
    const xml =
      '<w:document><w:body>' +
      '<w:p><w:r><w:t>OLD</w:t></w:r></w:p>' +
      '<w:sectPr><w:pgSz w:w="1"/></w:sectPr>' +
      '</w:body></w:document>';

    const next = replaceDocumentXmlBody(xml, '<w:p><w:r><w:t>NEW</w:t></w:r></w:p>');

    expect(next).toContain('<w:body>');
    expect(next).toContain('<w:t>NEW</w:t>');
    expect(next).toContain('<w:sectPr>');
    expect(next).toContain('w:pgSz');
    expect(next).not.toContain('<w:t>OLD</w:t>');
  });
});
