import * as htmlPdf from 'html-pdf-node';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MarriageRasmPdfPayload {
  meta?: {
    fileNumber?: string;
    dateGregorian?: string;
    dateHijri?: string;
    time?: string;
    notaryPrimary?: string;
    notarySecondary?: string;
    primaryCourt?: string;
  };
  marriageDetails?: {
    authorizationNumber?: string;
    authorizationDate?: string;
    authorizationCourt?: string;
    registryBookType?: string;
    registryNumber?: string;
    registryPage?: string;
    registryCount?: string;
    dowryAmount?: number;
    dowryAmountInWords?: string;
    isDowryReceived?: string;
    dowryAdvance?: number;
    dowryAdvanceInWords?: string;
    dowryDeferred?: number;
    dowryDeferredInWords?: string;
  };
  husband?: {
    name?: string;
    fatherName?: string;
    motherName?: string;
    dateOfBirth?: string;
    birthCertificateNumber?: string;
    birthCertificateDate?: string;
    birthCertificateCommune?: string;
    birthCertificateCity?: string;
    nationality?: string;
    maritalStatus?: string;
    profession?: string;
    address?: string;
    idNumber?: string;
  };
  wife?: {
    name?: string;
    fatherName?: string;
    motherName?: string;
    dateOfBirth?: string;
    birthCertificateNumber?: string;
    birthCertificateDate?: string;
    birthCertificateCommune?: string;
    birthCertificateCity?: string;
    nationality?: string;
    maritalStatus?: string;
    profession?: string;
    address?: string;
    idNumber?: string;
    guardianName?: string;
    guardianDOB?: string;
    guardianNationalID?: string;
    guardianAddress?: string;
    guardianProfession?: string;
  };
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

function safeJoin(parts: Array<string | undefined | null>, sep = ' '): string {
  return parts.filter((p) => p && String(p).trim().length > 0).map((p) => String(p).trim()).join(sep);
}

function formatDateOrEmpty(value?: string): string {
  return value?.trim?.() ? value : '';
}

function formatArabicDayName(dateGregorian?: string): string {
  if (!dateGregorian) return '';
  const d = new Date(dateGregorian);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('ar-MA', { weekday: 'long' }).format(d);
  } catch {
    return '';
  }
}

function formatArabicTimeNow(): string {
  const now = new Date();
  try {
    return new Intl.DateTimeFormat('ar-MA', { hour: '2-digit', minute: '2-digit' }).format(now);
  } catch {
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
}

function formatArabicTime(value?: string): string {
  const raw = value?.trim?.();
  if (!raw) return formatArabicTimeNow();

  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return raw;

  const now = new Date();
  now.setHours(Number(match[1]), Number(match[2]), 0, 0);
  try {
    return new Intl.DateTimeFormat('ar-MA', { hour: '2-digit', minute: '2-digit' }).format(now);
  } catch {
    return raw;
  }
}

export class MarriageRasmPdfService {
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

  public async generate(payload: MarriageRasmPdfPayload): Promise<Buffer> {
    const [coat, adoul] = await Promise.all([this.getCoatDataUrl(), this.getAdoulLogoDataUrl()]);
    const html = this.buildHtml(payload, coat, adoul);
    const options: htmlPdf.Options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '14mm' },
    };
    const file = { content: html };
    return (await htmlPdf.generatePdf(file, options)) as Buffer;
  }

  private buildHtml(payload: MarriageRasmPdfPayload, coatDataUrl: string, adoulLogoDataUrl: string): string {
    const meta = payload.meta ?? {};
    const marriage = payload.marriageDetails ?? {};
    const husband = payload.husband ?? {};
    const wife = payload.wife ?? {};

    const dateG = formatDateOrEmpty(meta.dateGregorian);
    const dateH = formatDateOrEmpty(meta.dateHijri);
    const dayName = formatArabicDayName(meta.dateGregorian);
    const timeText = formatArabicTime(meta.time);

    const groomParents = safeJoin([husband.fatherName, husband.motherName], ' و ');
    const brideParents = safeJoin([wife.fatherName, wife.motherName], ' و ');

    const groomBirthPlace = safeJoin([husband.birthCertificateCity, husband.birthCertificateCommune], ' - ');
    const brideBirthPlace = safeJoin([wife.birthCertificateCity, wife.birthCertificateCommune], ' - ');

    const dowryTotal = marriage.dowryAmount ?? '';
    const dowryWords = marriage.dowryAmountInWords ?? '';
    const dowryAdvance = marriage.dowryAdvance ?? '';
    const dowryAdvanceWords = marriage.dowryAdvanceInWords ?? '';
    const dowryDeferred = marriage.dowryDeferred ?? '';
    const dowryDeferredWords = marriage.dowryDeferredInWords ?? '';

    const primaryCourt = meta.primaryCourt ?? '';
    const adoulNames = safeJoin([meta.notaryPrimary, meta.notarySecondary], ' و ');

    const guardianLine = wife.guardianName
      ? `أنكحها إياه وليها/أبوها السيد ${escapeHtml(wife.guardianName)}${
          wife.guardianDOB ? ` المزداد بتاريخ ${escapeHtml(wife.guardianDOB)}` : ''
        }${wife.guardianProfession ? ` مهنته ${escapeHtml(wife.guardianProfession)}` : ''}${
          wife.guardianAddress ? ` الساكن بـ ${escapeHtml(wife.guardianAddress)}` : ''
        }${wife.guardianNationalID ? ` رقم بطاقته الوطنية ${escapeHtml(wife.guardianNationalID)}` : ''}، بإذنها ورضاها.`
      : 'أنكحها إياه وليها/أبوها بإذنها ورضاها.';

    const dowryLine = (() => {
      if (!marriage.isDowryReceived) {
        return `على صداق مبارك قدره ونهايته <b>${escapeHtml(dowryTotal)}</b> درهم (${escapeHtml(dowryWords)}).`;
      }
      if (marriage.isDowryReceived === 'مقبوض') {
        return `على صداق مبارك قدره ونهايته <b>${escapeHtml(dowryTotal)}</b> درهم (${escapeHtml(dowryWords)})، قبضته الزوجة اعترافًا فأبرأته منه فبرئ.`;
      }
      if (marriage.isDowryReceived === 'مؤجل') {
        return `على صداق مبارك قدره ونهايته <b>${escapeHtml(dowryTotal)}</b> درهم (${escapeHtml(
          dowryWords,
        )})، يؤديه لها الزوج قبل الدخول.`;
      }
      // "بينهما" / partial
      if (dowryAdvance !== '' || dowryDeferred !== '') {
        return `على صداق مبارك قدره ونهايته <b>${escapeHtml(dowryTotal)}</b> درهم (${escapeHtml(
          dowryWords,
        )})، منه معجل قدره <b>${escapeHtml(dowryAdvance)}</b> درهم (${escapeHtml(
          dowryAdvanceWords,
        )})، ومؤجل قدره <b>${escapeHtml(dowryDeferred)}</b> درهم (${escapeHtml(dowryDeferredWords)}).`;
      }
      return `على صداق مبارك قدره ونهايته <b>${escapeHtml(dowryTotal)}</b> درهم (${escapeHtml(dowryWords)}).`;
    })();

    const headerHtml = `
      <div class="header">
        <div class="header__logos">
          ${coatDataUrl ? `<img class="logo" src="${coatDataUrl}" alt="coat" />` : '<div></div>'}
          ${adoulLogoDataUrl ? `<img class="logo logo--small" src="${adoulLogoDataUrl}" alt="adoul" />` : '<div></div>'}
        </div>
        <div class="header__text">
          <div class="kicker">المملكة المغربية</div>
          <div class="kicker">وزارة العدل</div>
          <div class="kicker">${escapeHtml(primaryCourt)}${primaryCourt ? ' — ' : ''}قسم التوثيق</div>
          <div class="title">رسم زواج</div>
          <div class="meta">
            <div><span class="meta__k">رقم الملف:</span> ${escapeHtml(meta.fileNumber ?? '')}</div>
            <div><span class="meta__k">التاريخ:</span> ${escapeHtml(dateG)} <span class="muted">(${escapeHtml(dateH)})</span></div>
            <div><span class="meta__k">العدلان:</span> ${escapeHtml(adoulNames)}</div>
          </div>
        </div>
      </div>
    `;

    const bodyHtml = `
      <div class="body">
        <p class="para">
          الحمد لله وبعد، في الساعة <b>${escapeHtml(timeText)}</b> ${dayName ? `يوم <b>${escapeHtml(dayName)}</b>` : ''} ${dateH ? `تاريخ <b>${escapeHtml(dateH)}</b>` : ''} ${dateG ? `الموافق لـ <b>${escapeHtml(dateG)}</b>` : ''}،
          تلقى العدلان أمنهما الله ${escapeHtml(adoulNames)} المنتصبان للإشهاد بقسم التوثيق ${primaryCourt ? `بـ ${escapeHtml(primaryCourt)}` : ''}، الشهادة المتعلقة بعقد الزواج، وفق المعطيات التالية:
        </p>

        <div class="card">
          <div class="card__title">مرجع الإذن القضائي (إن وجد)</div>
          <div class="grid grid--2">
            <div class="kv"><div class="k">رقم الإذن/الملف</div><div class="v">${escapeHtml(marriage.authorizationNumber ?? '')}</div></div>
            <div class="kv"><div class="k">تاريخ الإذن</div><div class="v">${escapeHtml(marriage.authorizationDate ?? '')}</div></div>
            <div class="kv"><div class="k">المحكمة</div><div class="v">${escapeHtml(marriage.authorizationCourt ?? '')}</div></div>
            <div class="kv"><div class="k">مرجع التضمين</div><div class="v">${escapeHtml(
              safeJoin(
                [
                  marriage.registryBookType ? `كتاب: ${marriage.registryBookType}` : '',
                  marriage.registryNumber ? `عدد: ${marriage.registryNumber}` : '',
                  marriage.registryCount ? `ورقة/صحيفة: ${marriage.registryCount}` : '',
                  marriage.registryPage ? `صفحة: ${marriage.registryPage}` : '',
                ],
                ' — ',
              ),
            )}</div></div>
          </div>
        </div>

        <div class="grid grid--2">
          <div class="card">
            <div class="card__title">بيانات الزوج</div>
            <div class="kv"><div class="k">الاسم الكامل</div><div class="v">${escapeHtml(husband.name ?? '')}</div></div>
            <div class="kv"><div class="k">الوالدان</div><div class="v">${escapeHtml(groomParents)}</div></div>
            <div class="kv"><div class="k">تاريخ ومكان الازدياد</div><div class="v">${escapeHtml(
              safeJoin([husband.dateOfBirth, groomBirthPlace], ' — '),
            )}</div></div>
            <div class="kv"><div class="k">بطاقة التعريف الوطنية</div><div class="v">${escapeHtml(husband.idNumber ?? '')}</div></div>
            <div class="kv"><div class="k">الجنسية والحالة</div><div class="v">${escapeHtml(
              safeJoin([husband.nationality, husband.maritalStatus], ' — '),
            )}</div></div>
            <div class="kv"><div class="k">المهنة والعنوان</div><div class="v">${escapeHtml(
              safeJoin([husband.profession, husband.address], ' — '),
            )}</div></div>
          </div>

          <div class="card">
            <div class="card__title">بيانات الزوجة</div>
            <div class="kv"><div class="k">الاسم الكامل</div><div class="v">${escapeHtml(wife.name ?? '')}</div></div>
            <div class="kv"><div class="k">الوالدان</div><div class="v">${escapeHtml(brideParents)}</div></div>
            <div class="kv"><div class="k">تاريخ ومكان الازدياد</div><div class="v">${escapeHtml(
              safeJoin([wife.dateOfBirth, brideBirthPlace], ' — '),
            )}</div></div>
            <div class="kv"><div class="k">بطاقة التعريف الوطنية</div><div class="v">${escapeHtml(wife.idNumber ?? '')}</div></div>
            <div class="kv"><div class="k">الجنسية والحالة</div><div class="v">${escapeHtml(
              safeJoin([wife.nationality, wife.maritalStatus], ' — '),
            )}</div></div>
            <div class="kv"><div class="k">المهنة والعنوان</div><div class="v">${escapeHtml(
              safeJoin([wife.profession, wife.address], ' — '),
            )}</div></div>
          </div>
        </div>

        <p class="para">
          ${dowryLine}
          تزوجها على الكتاب والسنة واليُمن والأمان، وما جاء في محكم القرآن من قوله تعالى:
          <span class="quote">﴿ فإمساكٌ بمعروفٍ أو تسريحٌ بإحسان ﴾</span>.
        </p>

        <p class="para">
          ${guardianLine}
        </p>

        <p class="para">
          وتم الإشهاد دون قيد أو شرط، وبإشعار الزوجين بمقتضيات المادة 49 من مدونة الأسرة، وحرر بتاريخِه.
        </p>

        <div class="signature-grid">
          <div class="sig">
            <div class="sig__k">توقيع العدل الأول</div>
            <div class="sig__line"></div>
          </div>
          <div class="sig">
            <div class="sig__k">توقيع العدل الثاني</div>
            <div class="sig__line"></div>
          </div>
        </div>
      </div>
    `;

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
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
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
        .kicker { font-size: 12px; letter-spacing: 0.3px; color: #334155; font-weight: 700; }
        .title { margin-top: 8px; font-size: 24px; font-weight: 900; }
        .meta { margin-top: 10px; display: grid; gap: 4px; font-size: 12px; color: #334155; }
        .meta__k { font-weight: 800; color: #0f172a; }
        .muted { color: #64748b; }

        .body { margin-top: 14px; }
        .para { line-height: 2.0; font-size: 13px; margin: 10px 0; }
        .quote { display: inline-block; padding: 2px 8px; border: 1px dashed #94a3b8; border-radius: 10px; margin: 0 6px; background: #fff; }

        .grid { display: grid; gap: 12px; }
        .grid--2 { grid-template-columns: 1fr 1fr; }
        .kv { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; background: #ffffff; }
        .k { color: #334155; font-weight: 800; font-size: 12px; }
        .v { margin-top: 4px; font-size: 13px; }

        .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; background: #ffffff; }
        .card__title { font-weight: 900; margin-bottom: 10px; font-size: 13px; color: #0b1220; }

        .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
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
          ${bodyHtml}
        </body>
      </html>
    `;
  }
}
