import * as htmlPdf from 'html-pdf-node';
import * as fs from 'fs/promises';
import * as path from 'path';

export type RasmType = 'بيع_وشراء' | 'هبة' | 'مقاسمة' | 'احصاء_متروك';

export interface RasmParty {
  name?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  idNumber?: string;
  idIssueDate?: string;
  profession?: string;
  share?: string;
  nationality?: string;
}

export interface RasmProperty {
  type?: string;
  propertyName?: string;
  location?: string;
  province?: string;
  area_m2?: number;
  length_m?: number;
  width_m?: number;
  boundaries?: { north?: string; south?: string; east?: string; west?: string };
  titleDocuments?: Array<{
    feeType?: string;
    bookReference?: string;
    number?: string;
    letter?: string;
    page?: string;
    count?: string;
    date?: string;
    correspondingDate?: string;
  }>;
}

export interface RasmFinance {
  price?: number;
  priceInWords?: string;
  paymentMethod?: string;
  transferDetails?: string;
}

export interface RasmPartitionDivision {
  beneficiaries?: Array<{ name?: string; share?: string }>;
  propertyDescription?: string;
  area?: string;
  length?: string;
  width?: string;
  boundaries?: { north?: string; south?: string; east?: string; west?: string };
  divisionValue?: number;
  divisionValueInWords?: string;
}

export interface RasmPdfPayload {
  documentType: RasmType;
  meta?: {
    fileNumber?: string;
    dateGregorian?: string;
    dateHijri?: string;
    notaryPrimary?: string;
    notarySecondary?: string;
  };
  sellers?: RasmParty[];
  buyers?: RasmParty[];
  applicants?: Array<RasmParty & { capacity?: string }>;
  inheritanceDeeds?: Array<{ book?: string; page?: string; number?: string; date?: string; notary?: string }>;
  inheritanceDescription?: string;
  partitionDivisions?: RasmPartitionDivision[];
  properties?: RasmProperty[];
  finance?: RasmFinance;
}

function escapeHtml(value: unknown): string {
  const str = value === undefined || value === null ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value?: string): string {
  if (!value) return '';
  return value;
}

function arabicTitleForType(type: RasmType): string {
  switch (type) {
    case 'بيع_وشراء':
      return '\u0631\u0633\u0645 \u0628\u064a\u0639 \u0648\u0634\u0631\u0627\u0621';
    case 'هبة':
      return '\u0631\u0633\u0645 \u0639\u0642\u062f \u0647\u0628\u0629';
    case 'مقاسمة':
      return '\u0631\u0633\u0645 \u0645\u0642\u0627\u0633\u0645\u0629';
    case 'احصاء_متروك':
      return '\u0631\u0633\u0645 \u0625\u062d\u0635\u0627\u0621 \u0645\u062a\u0631\u0648\u0643';
    default:
      return '\u0631\u0633\u0645';
  }
}

export class RasmPdfService {
  private coatDataUrl: string | null = null;
  private adoulLogoDataUrl: string | null = null;

  private async readLogoBase64(filename: string): Promise<string> {
    const candidatePaths = [
      path.resolve(process.cwd(), 'frontend', 'public', 'logos', filename),
      path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', 'logos', filename),
    ];
    for (const candidate of candidatePaths) {
      try {
        const buffer = await fs.readFile(candidate);
        const ext = path.extname(filename).toLowerCase();
        const mime =
          ext === '.png'
            ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg'
              ? 'image/jpeg'
              : 'application/octet-stream';
        return `data:${mime};base64,${buffer.toString('base64')}`;
      } catch {
        // try next
      }
    }
    return '';
  }

  private async getCoatDataUrl(): Promise<string> {
    if (this.coatDataUrl) return this.coatDataUrl;
    this.coatDataUrl = await this.readLogoBase64('morocco-coat.jpg');
    return this.coatDataUrl;
  }

  private async getAdoulLogoDataUrl(): Promise<string> {
    if (this.adoulLogoDataUrl) return this.adoulLogoDataUrl;
    this.adoulLogoDataUrl = await this.readLogoBase64('adoul-logo.jpg');
    return this.adoulLogoDataUrl;
  }

  public async generate(payload: RasmPdfPayload): Promise<Buffer> {
    const [coat, adoul] = await Promise.all([this.getCoatDataUrl(), this.getAdoulLogoDataUrl()]);
    const html = this.buildHtml(payload, coat, adoul);

    const options: htmlPdf.Options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' },
    };

    const file = { content: html };
    return (await htmlPdf.generatePdf(file, options)) as Buffer;
  }

  private buildHtml(payload: RasmPdfPayload, coatDataUrl: string, adoulLogoDataUrl: string): string {
    const title = arabicTitleForType(payload.documentType);
    const meta = payload.meta ?? {};
    const fileNumber = meta.fileNumber ?? '';
    const dateG = formatDate(meta.dateGregorian);
    const dateH = formatDate(meta.dateHijri);

    const section = (heading: string, contentHtml: string) => `
      <section class="section">
        <div class="section__heading">${escapeHtml(heading)}</div>
        <div class="section__content">${contentHtml}</div>
      </section>
    `;

    const listTable = (rows: Array<Record<string, unknown>>, columns: Array<{ key: string; label: string }>) => {
      if (!rows.length) return '<div class="muted">\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0639\u0637\u064a\u0627\u062a.</div>';
      return `
        <table class="table">
          <thead>
            <tr>
              ${columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>
                ${columns.map((c) => `<td>${escapeHtml((row as any)[c.key] ?? '')}</td>`).join('')}
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      `;
    };

    const partiesBlock = (titleLabel: string, people?: RasmParty[]) =>
      section(
        titleLabel,
        listTable(
          (people ?? []).map((p) => ({
            name: p.name ?? '',
            idNumber: p.idNumber ?? '',
            address: p.address ?? '',
            share: p.share ?? '',
          })),
          [
            { key: 'name', label: '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644' },
            { key: 'idNumber', label: '\u0631\u0642\u0645 \u0627\u0644\u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0648\u0637\u0646\u064a (CIN)' },
            { key: 'address', label: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646' },
            { key: 'share', label: '\u0627\u0644\u062d\u0635\u0629' },
          ],
        ),
      );

    const propertiesBlock = section(
      '\u0627\u0644\u0639\u0642\u0627\u0631 / \u0627\u0644\u0645\u0644\u0643',
      listTable(
        (payload.properties ?? []).map((p) => ({
          type: p.type ?? '',
          propertyName: p.propertyName ?? '',
          location: p.location ?? '',
          province: p.province ?? '',
          area: p.area_m2 ?? '',
        })),
        [
          { key: 'type', label: '\u0627\u0644\u0646\u0648\u0639' },
          { key: 'propertyName', label: '\u0627\u0644\u062a\u0639\u0631\u064a\u0641' },
          { key: 'location', label: '\u0627\u0644\u0645\u0648\u0642\u0639' },
          { key: 'province', label: '\u0627\u0644\u0625\u0642\u0644\u064a\u0645/\u0627\u0644\u062c\u0647\u0629' },
          { key: 'area', label: '\u0627\u0644\u0645\u0633\u0627\u062d\u0629 (m\u00b2)' },
        ],
      ),
    );

    const financeBlock = section(
      '\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629',
      `
        <div class="grid">
          <div class="kv"><div class="k">\u0627\u0644\u062b\u0645\u0646</div><div class="v">${escapeHtml(
            payload.finance?.price ?? '',
          )}</div></div>
          <div class="kv"><div class="k">\u0628\u0627\u0644\u062d\u0631\u0648\u0641</div><div class="v">${escapeHtml(
            payload.finance?.priceInWords ?? '',
          )}</div></div>
          <div class="kv"><div class="k">\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u0623\u062f\u0627\u0621</div><div class="v">${escapeHtml(
            payload.finance?.paymentMethod ?? '',
          )}</div></div>
          <div class="kv"><div class="k">\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062a\u062d\u0648\u064a\u0644</div><div class="v">${escapeHtml(
            payload.finance?.transferDetails ?? '',
          )}</div></div>
        </div>
      `,
    );

    const inheritanceBlock =
      payload.documentType === 'احصاء_متروك'
        ? [
            section(
              '\u0637\u0627\u0644\u0628/\u0637\u0627\u0644\u0628\u0648 \u0627\u0644\u0625\u062d\u0635\u0627\u0621',
              listTable(
                (payload.applicants ?? []).map((a) => ({
                  name: a.name ?? '',
                  capacity: (a as any).capacity ?? '',
                  idNumber: a.idNumber ?? '',
                  address: a.address ?? '',
                })),
                [
                  { key: 'name', label: '\u0627\u0644\u0627\u0633\u0645' },
                  { key: 'capacity', label: '\u0627\u0644\u0635\u0641\u0629' },
                  { key: 'idNumber', label: 'CIN' },
                  { key: 'address', label: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646' },
                ],
              ),
            ),
            section(
              '\u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u0645\u0624\u0633\u0633\u0629',
              listTable(
                (payload.inheritanceDeeds ?? []).map((d) => ({
                  book: d.book ?? '',
                  number: d.number ?? '',
                  page: d.page ?? '',
                  date: d.date ?? '',
                  notary: d.notary ?? '',
                })),
                [
                  { key: 'book', label: '\u0627\u0644\u0643\u062a\u0627\u0628' },
                  { key: 'number', label: '\u0627\u0644\u0639\u062f\u062f' },
                  { key: 'page', label: '\u0627\u0644\u0635\u062d\u064a\u0641\u0629' },
                  { key: 'date', label: '\u0627\u0644\u062a\u0627\u0631\u064a\u062e' },
                  { key: 'notary', label: '\u0627\u0644\u0639\u062f\u0644' },
                ],
              ),
            ),
            section(
              '\u0628\u064a\u0627\u0646 \u0627\u0644\u0645\u062a\u0631\u0648\u0643',
              `<div class="para">${escapeHtml(payload.inheritanceDescription ?? '') || '\u2014'}</div>`,
            ),
          ]
        : [];

    const partitionBlock =
      payload.documentType === 'مقاسمة'
        ? [
            section(
              '\u0645\u0639\u0637\u064a\u0627\u062a \u0627\u0644\u0645\u0642\u0627\u0633\u0645\u0629',
              (payload.partitionDivisions ?? []).length
                ? (payload.partitionDivisions ?? [])
                    .map((d, idx) => {
                      const beneficiaries = (d.beneficiaries ?? [])
                        .map((b) => `<li>${escapeHtml(b.name ?? '')} \u2014 ${escapeHtml(b.share ?? '')}</li>`)
                        .join('');
                      return `
                        <div class="card">
                          <div class="card__title">\u062d\u0635\u0629 ${idx + 1}</div>
                          <div class="para">${escapeHtml(d.propertyDescription ?? '')}</div>
                          <div class="grid grid--2">
                            <div class="kv"><div class="k">\u0627\u0644\u0645\u0633\u0627\u062d\u0629</div><div class="v">${escapeHtml(
                              d.area ?? '',
                            )}</div></div>
                            <div class="kv"><div class="k">\u0627\u0644\u0642\u064a\u0645\u0629</div><div class="v">${escapeHtml(
                              d.divisionValue ?? '',
                            )} \u2014 ${escapeHtml(d.divisionValueInWords ?? '')}</div></div>
                          </div>
                          <div class="card__subtitle">\u0627\u0644\u0645\u0633\u062a\u0641\u064a\u062f\u0648\u0646</div>
                          <ul class="list">${beneficiaries || `<li class="muted">\u2014</li>`}</ul>
                        </div>
                      `;
                    })
                    .join('')
                : '<div class="muted">\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0642\u0627\u0633\u0645\u0627\u062a \u0645\u0633\u062c\u0644\u0629.</div>',
            ),
          ]
        : [];

    const intro = section(
      '\u062a\u0645\u0647\u064a\u062f',
      `
        <div class="para">
          \u0647\u0630\u0647 \u0645\u0633\u0648\u062f\u0629 \u0631\u0633\u0645 \u062a\u0645 \u0625\u0646\u0634\u0627\u0624\u0647\u0627 \u0622\u0644\u064a\u064b\u0627 \u0627\u0639\u062a\u0645\u0627\u062f\u064b\u0627 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a \u0627\u0644\u0645\u062f\u062e\u0644\u0629 \u0636\u0645\u0646 \u062e\u0637\u0648\u0627\u062a \u0627\u0644\u062a\u0644\u0642\u064a.
          \u064a\u0631\u062c\u0649 \u0645\u0631\u0627\u062c\u0639\u062a\u0647\u0627 \u0648\u062a\u062d\u064a\u064a\u0646\u0647\u0627 \u0642\u0628\u0644 \u0627\u0644\u0627\u0639\u062a\u0645\u0627\u062f.
        </div>
      `,
    );

    const headerHtml = `
      <div class="header">
        <div class="header__logos">
          ${coatDataUrl ? `<img class="logo" src="${coatDataUrl}" alt="coat" />` : '<div></div>'}
          ${adoulLogoDataUrl ? `<img class="logo logo--small" src="${adoulLogoDataUrl}" alt="adoul" />` : '<div></div>'}
        </div>
        <div class="header__text">
          <div class="kicker">\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0645\u063a\u0631\u0628\u064a\u0629</div>
          <div class="title">${escapeHtml(title)}</div>
          <div class="meta">
            <div><span class="meta__k">\u0631\u0642\u0645 \u0627\u0644\u0645\u0644\u0641:</span> ${escapeHtml(fileNumber)}</div>
            <div><span class="meta__k">\u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u064a\u0644\u0627\u062f\u064a:</span> ${escapeHtml(dateG)}</div>
            <div><span class="meta__k">\u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0647\u062c\u0631\u064a:</span> ${escapeHtml(dateH)}</div>
            <div><span class="meta__k">\u0627\u0644\u0639\u062f\u0644\u0627\u0646:</span> ${escapeHtml(
              [meta.notaryPrimary, meta.notarySecondary].filter(Boolean).join(' \u2014 '),
            )}</div>
          </div>
        </div>
      </div>
    `;

    const bodySections = [
      intro,
      partiesBlock('\u0627\u0644\u0623\u0637\u0631\u0627\u0641: \u0627\u0644\u0628\u0627\u0626\u0639/\u0627\u0644\u0648\u0627\u0647\u0628', payload.sellers),
      partiesBlock('\u0627\u0644\u0623\u0637\u0631\u0627\u0641: \u0627\u0644\u0645\u0634\u062a\u0631\u064a/\u0627\u0644\u0645\u0648\u0647\u0648\u0628 \u0644\u0647', payload.buyers),
      ...(payload.documentType === 'بيع_وشراء' || payload.documentType === 'هبة' ? [propertiesBlock, financeBlock] : []),
      ...inheritanceBlock,
      ...partitionBlock,
      section(
        '\u062a\u0648\u0642\u064a\u0639',
        `
          <div class="signature-grid">
            <div class="sig">
              <div class="sig__k">\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0639\u062f\u0644 \u0627\u0644\u0623\u0648\u0644</div>
              <div class="sig__line"></div>
            </div>
            <div class="sig">
              <div class="sig__k">\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0639\u062f\u0644 \u0627\u0644\u062b\u0627\u0646\u064a</div>
              <div class="sig__line"></div>
            </div>
          </div>
        `,
      ),
    ];

    const css = `
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: #0f172a;
          font-family: Tahoma, Arial, "Noto Naskh Arabic", "Amiri", sans-serif;
          direction: rtl;
        }
        .header {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 14px;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
        }
        .header__logos {
          display: grid;
          gap: 10px;
          align-content: start;
          justify-items: center;
        }
        .logo { width: 96px; height: auto; }
        .logo--small { width: 88px; }
        .kicker { font-size: 12px; letter-spacing: 0.5px; color: #334155; font-weight: 700; }
        .title { margin-top: 6px; font-size: 22px; font-weight: 900; }
        .meta { margin-top: 10px; display: grid; gap: 4px; font-size: 12px; color: #334155; }
        .meta__k { font-weight: 700; color: #0f172a; }

        .section { margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .section__heading {
          padding: 10px 12px;
          background: #0b1220;
          color: white;
          font-weight: 800;
          font-size: 13px;
        }
        .section__content { padding: 12px; background: white; }
        .para { line-height: 1.9; font-size: 13px; color: #0f172a; }
        .muted { color: #64748b; font-size: 12px; }

        .grid { display: grid; gap: 10px; }
        .grid--2 { grid-template-columns: 1fr 1fr; }
        .kv { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; background: #f8fafc; }
        .k { color: #334155; font-weight: 800; font-size: 12px; }
        .v { margin-top: 4px; font-size: 13px; }

        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { border: 1px solid #e2e8f0; padding: 8px; vertical-align: top; font-size: 12px; }
        .table th { background: #f1f5f9; color: #0f172a; font-weight: 800; }

        .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #ffffff; margin-bottom: 10px; }
        .card__title { font-weight: 900; margin-bottom: 6px; }
        .card__subtitle { margin-top: 10px; font-weight: 800; color: #334155; font-size: 12px; }
        .list { margin: 8px 0 0; padding: 0 18px 0 0; }
        .list li { margin: 4px 0; }

        .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sig { border: 1px dashed #94a3b8; border-radius: 12px; padding: 12px; }
        .sig__k { font-weight: 800; color: #334155; font-size: 12px; margin-bottom: 12px; }
        .sig__line { height: 44px; border-bottom: 2px solid #0f172a; }
      </style>
    `;

    return `
      <!doctype html>
      <html lang="ar">
        <head>
          <meta charset="utf-8" />
          ${css}
        </head>
        <body>
          ${headerHtml}
          ${bodySections.join('')}
        </body>
      </html>
    `;
  }
}

