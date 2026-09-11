import * as htmlPdf from 'html-pdf-node';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MarriagePdfData {
  file_number?: string;
  file_year?: string;

  court_appeal?: string;
  court_first_instance?: string;
  court_family_section?: string;
  court_city?: string;

  request_date_gregorian?: string;
  request_date_hijri?: string;

  inclusion_date?: string;
  inclusion_hijri?: string;

  marriage_authorization_no?: string;
  engagement_cert_num?: string;
  engagement_cert_date?: string;

  meeting_time?: string;
  meeting_day?: string;
  hijri_day?: string;
  hijri_month?: string;
  hijri_year?: string;
  gregorian_day?: string;
  gregorian_month?: string;
  gregorian_year?: string;

  witness1_name?: string;
  witness2_name?: string;

  registry_book_type?: string;
  registry_number?: string | number;
  registry_count?: string | number;
  registry_letter?: string;
  registry_page?: string | number;

  husband_name?: string;
  husband_address?: string;
  husband_cin?: string;
  husband_birth_date?: string;
  husband_birth_place?: string;
  husband_birth_cert_num?: string;
  husband_birth_year?: string;
  husband_nationality?: string;
  husband_marital_status?: string;
  husband_residence?: string;
  husband_occupation?: string;

  wife_name?: string;
  wife_address?: string;
  wife_cin?: string;
  wife_birth_date?: string;
  wife_birth_place?: string;
  wife_birth_cert_num?: string;
  wife_birth_year?: string;
  wife_nationality?: string;
  wife_marital_status?: string;
  wife_residence?: string;
  wife_occupation?: string;
  wife_father_name?: string;
  wife_father_birth_date?: string;
  wife_father_cin?: string;

  dowry_amount?: number | string;
  contracted_by?: string;

  interactive_document_pages?: string[];
}


export class HtmlPdfFillerService {
  private logoDataUrl: string | null = null;
  private adoulLogoDataUrl: string | null = null;

  private async readLogoBase64(filename: string): Promise<string> {
    const candidatePaths = [
      path.resolve(process.cwd(), 'frontend', 'public', 'logos', filename),
      path.resolve(__dirname, 'frontend', 'public', 'logos', filename),
      path.resolve(__dirname, '..', 'frontend', 'public', 'logos', filename),
      path.resolve(__dirname, 'dist', 'frontend', 'public', 'logos', filename),
    ];
    for (const candidate of candidatePaths) {
      try {
        const buffer = await fs.readFile(candidate);
        return `data:image/jpeg;base64,${buffer.toString('base64')}`;
      } catch {
        // try next
      }
    }
    return '';
  }

  private async getLogoDataUrl(): Promise<string> {
    if (this.logoDataUrl) return this.logoDataUrl;
    this.logoDataUrl = await this.readLogoBase64('morocco-coat.jpg');
    return this.logoDataUrl;
  }

  private async getAdoulLogoDataUrl(): Promise<string> {
    if (this.adoulLogoDataUrl) return this.adoulLogoDataUrl;
    this.adoulLogoDataUrl = await this.readLogoBase64('adoul-logo.jpg');
    return this.adoulLogoDataUrl;
  }

  private async addInteractiveFields(pdfBuffer: Buffer): Promise<Buffer> {
    return pdfBuffer;
  }

  private applyInteractivePlaceholders(content: string, replacements: Record<string, string>): string {
    let html = content;
    for (const [token, replacement] of Object.entries(replacements)) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(escaped, 'g'), replacement ?? '');
    }
    return html;
  }
    // OLD TEMPLATE: 4-page marriage certificate (for "create filled pdf" button)
  public async generateMarriagePdf(
    data: MarriagePdfData,
  ): Promise<Buffer> {
    const [logoDataUrl, adoulLogoDataUrl] = await Promise.all([
      this.getLogoDataUrl(),
      this.getAdoulLogoDataUrl(),
    ]);
    const html = this.buildMarriageCertificateHtml(
      data,
      logoDataUrl,
      adoulLogoDataUrl,
    );

    const options: htmlPdf.Options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    };

    const file = { content: html };
    const pdfBuffer = (await htmlPdf.generatePdf(file, options)) as Buffer;
    return this.addInteractiveFields(pdfBuffer);
  }

  // NEW TEMPLATE: Authorization document (for "create template" button)
  public async generateAuthorizationTemplate(
    data: MarriagePdfData,
  ): Promise<Buffer> {
    const [logoDataUrl, adoulLogoDataUrl] = await Promise.all([
      this.getLogoDataUrl(),
      this.getAdoulLogoDataUrl(),
    ]);
    const html = this.buildAuthorizationHtml(data, logoDataUrl, adoulLogoDataUrl);

    const options: htmlPdf.Options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    };

    const file = { content: html };
    const pdfBuffer = (await htmlPdf.generatePdf(file, options)) as Buffer;
    return this.addInteractiveFields(pdfBuffer);
  }

  private buildMarriageCertificateHtml(
    data: MarriagePdfData,
    logoDataUrl: string,
    adoulLogoDataUrl: string,
  ): string {
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const safe = (v?: string | number | null) => {
      if (v === undefined || v === null || v === '' || Number.isNaN(v)) {
        return '';
      }
      return escapeHtml(v.toString());
    };
    const display = (value: string, placeholder = '.............') =>
      value && value.trim().length > 0 ? value : placeholder;

    const year = safe(data.file_year) || '2025';
    const fileNumber = safe(data.file_number) || '.............';
    const stripPrefix = (value: string, pattern: RegExp) =>
      value ? value.replace(pattern, '').trim() : '';
    const courtAppeal =
      safe(data.court_appeal) || 'محكمة الاستئناف بتطوان';
    const courtFirst =
      safe(data.court_first_instance) || 'المحكمة الابتدائية بطنجة';
    const familySection =
      safe(data.court_family_section) || 'قسم قضاء الأسرة';
    const courtCity = safe(data.court_city) || 'طنجة';
    const requestDateG = safe(data.request_date_gregorian);
    const requestDateH = safe(data.request_date_hijri);

    const husbandName = safe(data.husband_name);
    const husbandAddress = safe(
      data.husband_address ?? data.husband_residence,
    );
    const husbandCin = safe(data.husband_cin);
    const husbandBirthDate = safe(data.husband_birth_date);
    const husbandBirthPlace = safe(data.husband_birth_place);
    const husbandBirthCertNum = safe(data.husband_birth_cert_num);
    const husbandNationality = safe(data.husband_nationality);
    const husbandMaritalStatus = safe(data.husband_marital_status);
    const husbandResidence = safe(data.husband_residence);
    const husbandOccupation = safe(data.husband_occupation);

    const wifeName = safe(data.wife_name);
    const wifeAddress = safe(data.wife_address ?? data.wife_residence);
    const wifeCin = safe(data.wife_cin);
    const wifeBirthDate = safe(data.wife_birth_date);
    const wifeBirthPlace = safe(data.wife_birth_place);
    const wifeBirthCertNum = safe(data.wife_birth_cert_num);
    const wifeNationality = safe(data.wife_nationality);
    const wifeMaritalStatus = safe(data.wife_marital_status);
    const wifeResidence = safe(data.wife_residence);
    const wifeOccupation = safe(data.wife_occupation);
    const wifeFatherName = safe(data.wife_father_name);
    const wifeFatherBirthDate = safe(data.wife_father_birth_date);
    const wifeFatherCIN = safe(data.wife_father_cin);

    const inclusionDate = safe(data.inclusion_date);
    const inclusionHijri = safe(data.inclusion_hijri);
    const marriageAuthNumber = safe(data.marriage_authorization_no);
    const engagementCertNum = safe(data.engagement_cert_num);
    const engagementCertDate = safe(data.engagement_cert_date);
    const dowryAmount = safe(data.dowry_amount);
    const contractedBy = safe(data.contracted_by);

    const registryBookType = safe(data.registry_book_type);
    const registryNumber = safe(data.registry_number);
    const registryCount = safe(data.registry_count);
    const registryLetter = safe(data.registry_letter);
    const registryPage = safe(data.registry_page);
    const registryBookLabel = registryBookType || 'سجلات الزواج';

    const meetingTime = safe(data.meeting_time);
    const meetingDay = safe(data.meeting_day);
    const hijriDay = safe(data.hijri_day);
    const hijriMonth = safe(data.hijri_month);
    const hijriYear = safe(data.hijri_year);
    const gregorianDay = safe(data.gregorian_day);
    const gregorianMonth = safe(data.gregorian_month);
    const gregorianYear = safe(data.gregorian_year) || year;
    const witness1Name = safe(data.witness1_name);
    const witness2Name = safe(data.witness2_name);
    const docDate = requestDateG || inclusionDate || '';
    const docHijri = requestDateH || inclusionHijri || '';
    const certificateNumber = marriageAuthNumber || fileNumber;
    const appealCity = stripPrefix(courtAppeal, /محكمة الاستئناف\s*ب?/);
    const firstInstanceCity = stripPrefix(
      courtFirst,
      /المحكمة الابتدائية\s*ب?/,
    );
    const husbandBirthSentence = husbandBirthDate
      ? `المولود بتاريخ <span class="final-highlight">${display(husbandBirthDate)}</span>`
      : '';
    const husbandNationalitySentence = husbandNationality
      ? `جنسيته <span class="final-highlight">${display(husbandNationality)}</span>`
      : '';
    const husbandOccupationSentence = husbandOccupation
      ? `ويعمل <span class="final-highlight">${display(husbandOccupation)}</span>`
      : '';
    const wifeBirthSentence = wifeBirthDate
      ? `المولودة بتاريخ <span class="final-highlight">${display(wifeBirthDate)}</span>`
      : '';
    const wifeNationalitySentence = wifeNationality
      ? `جنسيتها <span class="final-highlight">${display(wifeNationality)}</span>`
      : '';
    const wifeOccupationSentence = wifeOccupation
      ? `وتشتغل <span class="final-highlight">${display(wifeOccupation)}</span>`
      : '';
    const fatherBirthSentence = wifeFatherBirthDate
      ? `المولود بتاريخ <span class="final-highlight">${display(wifeFatherBirthDate)}</span>`
      : '';

    const placeholderMap: Record<string, string> = {
      '{{court_city}}': display(courtCity),
      '{{court_appeal}}': display(courtAppeal),
      '{{court_first_instance}}': display(courtFirst),
      '{{court_family_section}}': display(familySection),
      '{{file_number}}': display(fileNumber),
      '{{file_year}}': display(year),
      '{{marriage_authorization_no}}': display(marriageAuthNumber),
      '{{request_date_gregorian}}': display(docDate),
      '{{request_date_hijri}}': display(docHijri),
      '{{witness1_name}}': display(witness1Name),
      '{{witness2_name}}': display(witness2Name),
      '{{registry_number}}': display(registryNumber),
      '{{registry_count}}': display(registryCount),
      '{{registry_page}}': display(registryPage),
      '{{registry_letter}}': display(registryLetter),
      '{{registry_book_type}}': display(registryBookType),
      '{{inclusion_date}}': display(inclusionDate),
      '{{inclusion_hijri}}': display(inclusionHijri),
      '{{husband_name}}': husbandName,
      '{{husband_birth_place}}': display(husbandBirthPlace),
      '{{husband_birth_date}}': display(husbandBirthDate),
      '{{husband_birth_cert_num}}': display(husbandBirthCertNum),
      '{{husband_cin}}': display(husbandCin),
      '{{husband_occupation}}': display(husbandOccupation),
      '{{husband_nationality}}': display(husbandNationality),
      '{{husband_marital_status}}': display(husbandMaritalStatus),
      '{{husband_residence}}': display(husbandResidence),
      '{{wife_name}}': display(wifeName),
      '{{wife_birth_place}}': display(wifeBirthPlace),
      '{{wife_birth_date}}': display(wifeBirthDate),
      '{{wife_birth_cert_num}}': display(wifeBirthCertNum),
      '{{wife_cin}}': display(wifeCin),
      '{{wife_occupation}}': display(wifeOccupation),
      '{{wife_nationality}}': display(wifeNationality),
      '{{wife_marital_status}}': display(wifeMaritalStatus),
      '{{wife_residence}}': display(wifeResidence),
      '{{wife_father_name}}': display(wifeFatherName),
      '{{engagement_cert_date}}': display(engagementCertDate),
      '{{engagement_cert_num}}': display(engagementCertNum),
      '{{contracted_by}}': display(contractedBy),
      '{{dowry_amount}}': display(dowryAmount),
      '{{morocco_logo}}': logoDataUrl || '',
      '{{adoul_logo}}': adoulLogoDataUrl || '',
      '{{meeting_time}}': display(meetingTime),
      '{{meeting_day}}': display(meetingDay),
    };
    const interactivePages = data.interactive_document_pages ?? [];
    const renderCustomPage = (pageIndex: number) => {
      const html = interactivePages[pageIndex];
      if (!html || !html.trim()) {
        return null;
      }
      const replaced = this.applyInteractivePlaceholders(html, placeholderMap);
      return `
<div class="page">
  <div class="page-inner">
    ${replaced}
  </div>
</div>`;
    };

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:'Amiri','Arial',serif;
  direction:rtl;
  text-align:right;
  font-size:12px;
  line-height:1.6;
}
.page{
  position:relative;
  width:210mm;
  height:297mm;
  page-break-after:always;
}
.page:last-child{
  page-break-after:auto;
}
.page-inner{
  position:absolute;
  top:5mm;
  right:5mm;
  bottom:5mm;
  left:5mm;
  border:1.8px solid #000;
  padding:8mm 10mm;
}

/* header */
.header-row{
  display:flex;
  flex-direction:row;
  justify-content:space-between;
  align-items:flex-start;
  gap:10mm;
}
.header-right{
  text-align:right;
  font-size:10px;
  flex:1;
}
.header-right div{
  margin-bottom:1mm;
}
.header-emblem{
  width:26mm;
  text-align:center;
}
.header-emblem img{
  width:24mm;
  height:auto;
}
.header-adoul img{
  width:20mm;
}
.header-center{
  flex:1;
  text-align:center;
  font-size:11px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:1mm;
  font-weight:bold;
}

.main-title{
  text-align:center;
  font-size:18px;
  font-weight:bold;
  margin-top:24mm;
  margin-bottom:16mm;
}
.center-title{
  text-align:center;
  font-size:16px;
  font-weight:bold;
  margin:6mm 0;
}

/* field lines */
.field-block{
  width:100%;
  margin-bottom:3mm;
}
.field-line{
  display:flex;
  flex-direction:row-reverse;
  direction:rtl;
  align-items:flex-end;
  margin-bottom:6mm;
  font-size:13px;
  text-align:right;
  gap:4mm;
}
.field-label{
  white-space:nowrap;
}
.field-dots{
  flex:1;
  border-bottom:1px dotted #000;
  min-height:5mm;
  position:relative;
}
.field-value{
  position:absolute;
  right:2mm;
  top:50%;
  transform:translateY(-55%);
  font-size:12px;
}

/* generic note box */
.note-box{
  border:1px solid #000;
  padding:4mm 5mm;
  margin-top:18mm;
  font-size:11px;
}
.note-title{
  font-weight:bold;
  margin-bottom:2mm;
}

/* dotted description lines (for documents etc.) */
.doc-section-title{
  text-align:center;
  font-size:15px;
  font-weight:bold;
  margin-top:8mm;
  margin-bottom:6mm;
}
.doc-lines{
  width:100%;
  font-size:12px;
}
.doc-line{
  display:flex;
  flex-direction:row;
  direction:rtl;
  align-items:flex-end;
  margin-bottom:5mm;
  text-align:right;
  gap:3mm;
}
.doc-bullet{
  margin-left:3mm;
}
.doc-text{
  white-space:nowrap;
}

/* bottom certification */
.bottom-cert{
  margin-top:10mm;
  font-size:11px;
}
.bottom-cert-line{
  margin-bottom:3mm;
}

/* generic helpers */
.text-small{font-size:10px}
.text-center{text-align:center}
.mt-4{margin-top:4mm}
.mt-6{margin-top:6mm}
.mt-8{margin-top:8mm}

/* PAGE 3 styles */
.section-block{
  margin-top:4mm;
}
.section-title{
  font-size:13px;
  font-weight:bold;
  margin-bottom:2mm;
  text-decoration:underline;
}
.info-lines{
  font-size:12px;
}
.info-line{
  display:flex;
  flex-direction:row;
  direction:rtl;
  align-items:flex-end;
  margin-bottom:4mm;
  text-align:right;
  gap:4mm;
}
.info-label{
  white-space:nowrap;
}
.info-dots{
  flex:1;
  border-bottom:1px dotted #000;
  min-height:4mm;
}

/* signatures row */
.sig-row{
  margin-top:16mm;
  display:flex;
  justify-content:space-between;
  font-size:11px;
}
.sig-col{
  text-align:center;
  flex:1;
}
.sig-col span{
  display:block;
  margin-top:10mm;
}

/* PAGE 4 styles */
.long-text{
  font-size:11px;
  margin-top:6mm;
}
.long-text p{
  margin-bottom:3mm;
}
.inline-line{
  border-bottom:1px dotted #000;
  display:inline-block;
  min-width:25mm;
  height:4mm;
  vertical-align:baseline;
}
.registry-block{
  margin-top:10mm;
}
.registry-title{
  font-weight:bold;
  margin-bottom:3mm;
}
.registry-lines .registry-line{
  margin-bottom:4mm;
}
.footer-approval{
  margin-top:14mm;
  font-size:11px;
}
.footer-approval-line{
  margin-bottom:3mm;
}
.final-text{
  font-size:12px;
  line-height:2;
  margin-top:6mm;
}
.final-paragraph{
  margin-bottom:4mm;
  text-align:justify;
  text-indent:6mm;
}
.final-highlight{
  font-weight:bold;
  display:inline-block;
  min-width:18mm;
}
.royal-header{
  text-align:center;
  font-weight:bold;
  font-size:16px;
  line-height:1.6;
}
.royal-header div{
  margin-bottom:2mm;
}
.royal-info{
  margin-top:6mm;
  display:flex;
  justify-content:space-between;
  font-size:12px;
  font-weight:bold;
}
.royal-info div span{
  display:inline-block;
  min-width:25mm;
  text-align:center;
  border-bottom:1px dotted #555;
  padding:0 2mm;
}
.final-divider{
  text-align:center;
  font-size:14px;
  font-weight:bold;
  margin:8mm 0 6mm;
}
.signature-block{
  margin-top:8mm;
  font-size:12px;
  line-height:1.8;
}
.signature-line{
  margin-top:4mm;
  display:flex;
  justify-content:flex-end;
  gap:8mm;
  font-weight:bold;
}
</style>
</head>
<body>

<!-- PAGE 1 -->
${
  renderCustomPage(0) ||
  `
<div class="page">
  <div class="page-inner">

    <div class="header-row">
      <div class="header-emblem header-adoul">
        ${
          adoulLogoDataUrl
            ? `<img src="${adoulLogoDataUrl}" alt="شعار العدول">`
            : ''
        }
      </div>
      <div class="header-center"></div>
      <div class="header-emblem">
        ${
          logoDataUrl
            ? `<img src="${logoDataUrl}" alt="شعار المملكة">`
            : ''
        }
      </div>
    </div>

    <div class="header-right" style="margin-top:6mm;">
      <div>ملف الزواج</div>
      <div class="text-small">رقم: ${fileNumber} / ${year}</div>
    </div>

    <div class="main-title">ملف عقد الزواج</div>

    <div class="field-block">
      <div class="field-line">
        <div class="field-dots">
          <div class="field-value">${husbandName}</div>
        </div>
        <div class="field-label">اسم الخاطب:</div>
      </div>
      <div class="field-line">
        <div class="field-dots">
          <div class="field-value">${husbandAddress}</div>
        </div>
        <div class="field-label">عنوانه:</div>
      </div>
      <div class="field-line mt-4">
        <div class="field-dots">
          <div class="field-value">${wifeName}</div>
        </div>
        <div class="field-label">اسم المخطوبة:</div>
      </div>
      <div class="field-line">
        <div class="field-dots">
          <div class="field-value">${wifeAddress}</div>
        </div>
        <div class="field-label">عنوانها:</div>
      </div>
    </div>

    <div class="note-box">
      <div class="note-title">
        ملحوظة: تطبيقا لمقتضيات المادة 65 من مدونة الأسرة يتعين أن يتضمن ملف عقد الزواج الوثائق التالية:
      </div>
      <ul class="text-small" style="padding-right:4mm">
        <li>طلب موجه إلى السيد قاضي الأسرة المكلف بالزواج بالمحكمة الابتدائية ب${courtCity} من طرف الخاطب أو نائبه الشرعي.</li>
        <li>نسخة كاملة من رسم الولادة أو عقد الازدياد لكل من الخاطب والمخطوبة.</li>
        <li>صورة مطابقة للأصل من بطاقة التعريف الوطنية أو بطاقة الإقامة لكل من الخاطب والمخطوبة.</li>
        <li>شهادة السكنى أو بطاقة الإقامة تبين محل سكنى كل واحد من الطرفين.</li>
        <li>شهادة طبية لكل من الخاطب والمخطوبة تثبت سلامتهما من الأمراض المعدية والخطيرة.</li>
        <li>نسخة من السجل العدلي عند الاقتضاء بالنسبة لكل واحد من الزوجين.</li>
        <li>كل وثيقة أخرى يراها القاضي ضرورية للتحقق من أهلية الخطيبين أو وضعهما الشخصي.</li>
      </ul>
    </div>

  </div>
</div>
`
}

<!-- PAGE 2 -->
${
  renderCustomPage(1) ||
  `
<div class="page">
  <div class="page-inner">

    <div class="header-row">
      <div class="header-emblem header-adoul">
        ${
          adoulLogoDataUrl
            ? `<img src="${adoulLogoDataUrl}" alt="شعار العدول">`
            : ''
        }
      </div>
      <div class="header-center"></div>
      <div class="header-emblem">
        ${
          logoDataUrl
            ? `<img src="${logoDataUrl}" alt="شعار المملكة">`
            : ''
        }
      </div>
    </div>

    <div class="doc-section-title">وثائق الخاطب</div>

    <div class="doc-lines">
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">شهادة الازدياد عدد</div>
        <div class="field-dots"></div>
        <div class="doc-text">مسلمة من جماعة</div>
        <div class="field-dots"></div>
        <div class="doc-text">بتاريخ</div>
        <div class="field-dots"></div>
      </div>
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">نسخة كاملة من رسم الولادة عدد</div>
        <div class="field-dots"></div>
        <div class="doc-text">مسلمة من جماعة</div>
        <div class="field-dots"></div>
        <div class="doc-text">بتاريخ</div>
        <div class="field-dots"></div>
      </div>
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">صورة مطابقة للأصل من بطاقة التعريف الوطنية رقم</div>
        <div class="field-dots"></div>
        <div class="doc-text">مسلمة من</div>
        <div class="field-dots"></div>
      </div>
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">شهادة السكنى أو بطاقة الإقامة</div>
        <div class="field-dots"></div>
        <div class="doc-text">مسلمة من</div>
        <div class="field-dots"></div>
        <div class="doc-text">بتاريخ</div>
        <div class="field-dots"></div>
      </div>
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">شهادة طبية تثبت سلامة الخاطب من الأمراض المعدية والخطيرة</div>
        <div class="field-dots"></div>
      </div>
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">نسخة من السجل العدلي عند الاقتضاء</div>
        <div class="field-dots"></div>
      </div>
    </div>

    <div class="doc-section-title" style="margin-top:14mm">وثائق المخطوبة</div>

    <div class="doc-lines">
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">شهادة الازدياد عدد</div>
        <div class="field-dots"></div>
        <div class="doc-text">مسلمة من جماعة</div>
        <div class="field-dots"></div>
        <div class="doc-text">بتاريخ</div>
        <div class="field-dots"></div>
      </div>
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">نسخة كاملة من رسم الولادة عدد</div>
        <div class="field-dots"></div>
        <div class="doc-text">مسلمة من جماعة</div>
        <div class="field-dots"></div>
        <div class="doc-text">بتاريخ</div>
        <div class="field-dots"></div>
      </div>
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">صورة مطابقة للأصل من بطاقة التعريف الوطنية رقم</div>
        <div class="field-dots"></div>
        <div class="doc-text">مسلمة من</div>
        <div class="field-dots"></div>
      </div>
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">شهادة السكنى أو بطاقة الإقامة</div>
        <div class="field-dots"></div>
        <div class="doc-text">مسلمة من</div>
        <div class="field-dots"></div>
        <div class="doc-text">بتاريخ</div>
        <div class="field-dots"></div>
      </div>
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">شهادة طبية تثبت سلامة المخطوبة من الأمراض المعدية والخطيرة</div>
        <div class="field-dots"></div>
      </div>
      <div class="doc-line">
        <div class="doc-bullet">•</div>
        <div class="doc-text">نسخة من السجل العدلي عند الاقتضاء</div>
        <div class="field-dots"></div>
      </div>
    </div>

    <div class="bottom-cert">
      <div class="bottom-cert-line">
        تشهد قاصرة الأسرة المكلفة بالزواج بالمحكمة الابتدائية ب${courtCity} أن الوثائق أعلاه قد أدرجت بالملف المذكور.
      </div>
      <div class="bottom-cert-line">
        وحرر ب${courtCity} بتاريخ
        <span class="inline-line">${
          requestDateG || ''
        }</span>
        الموافق ل
        <span class="inline-line">${requestDateH}</span>
      </div>
      <div class="bottom-cert-line">
        الإمضاء:
        <span class="inline-line"></span>
      </div>
    </div>

  </div>
</div>
`
}

<!-- PAGE 3 -->
${
  renderCustomPage(2) ||
  `
<div class="page">
  <div class="page-inner">

    <div class="header-row">
      <div class="header-emblem header-adoul">
        ${
          adoulLogoDataUrl
            ? `<img src="${adoulLogoDataUrl}" alt="شعار العدول">`
            : ''
        }
      </div>
      <div class="header-center"></div>
      <div class="header-emblem">
        ${
          logoDataUrl
            ? `<img src="${logoDataUrl}" alt="شعار المملكة">`
            : ''
        }
      </div>
    </div>

    <div class="center-title">طلب الإذن بتوثيق عقد الزواج</div>

    <div class="text-small mt-4">
      إلى السيد رئيس قسم قضاء الأسرة بالمحكمة الابتدائية ب${courtCity}، قاضي الأسرة المكلف بالزواج.
    </div>

    <div class="section-block mt-6">
      <div class="section-title">معلومات عن الخاطب طالب الإذن بتوثيق الزواج</div>
      <div class="info-lines">
        <div class="info-line">
          <div class="info-label">الاسم الشخصي والعائلي:</div>
          <div class="info-dots">${husbandName}</div>
        </div>
        <div class="info-line">
          <div class="info-label">تاريخ الازدياد ومكانه:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">الجنسية:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">رقم البطاقة الوطنية أو الوثيقة التعريفية:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">الحالة العائلية الحالية:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">الحالة الصحية مع بيان نوع العجز إن وجد:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">المهنة:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">محل السكنى أو الإقامة:</div>
          <div class="info-dots">${husbandAddress}</div>
        </div>
      </div>
    </div>

    <div class="section-block mt-6">
      <div class="section-title">معلومات عن الراغبة في الزواج بعد الإذن</div>
      <div class="info-lines">
        <div class="info-line">
          <div class="info-label">الاسم الشخصي والعائلي:</div>
          <div class="info-dots">${wifeName}</div>
        </div>
        <div class="info-line">
          <div class="info-label">تاريخ الازدياد ومكانه:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">الجنسية:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">رقم البطاقة الوطنية أو الوثيقة التعريفية:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">الحالة العائلية الحالية:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">الحالة الصحية مع بيان نوع العجز إن وجد:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">المهنة:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">محل السكنى أو الإقامة:</div>
          <div class="info-dots">${wifeAddress}</div>
        </div>
      </div>
    </div>

    <div class="section-block mt-6">
      <div class="section-title">معلومات عن الزواج المرغوب الإذن فيه</div>
      <div class="info-lines">
        <div class="info-line">
          <div class="info-label">نوع الزواج (أول، ثان، تعدد، زواج توثيقي):</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">الصـداق وقدره وكيفية أدائه:</div>
          <div class="info-dots"></div>
        </div>
        <div class="info-line">
          <div class="info-label">الشروط الخاصة المتفق عليها بين الطرفين إن وجدت:</div>
          <div class="info-dots"></div>
        </div>
      </div>
    </div>

    <div class="text-small mt-6">
      أصرح بأن جميع المعطيات الواردة أعلاه صحيحة، وألتمس من سيادتكم الإذن بتوثيق عقد الزواج وفق المقتضيات القانونية السارية.
    </div>

    <div class="sig-row">
      <div class="sig-col">
        <div>الزوج</div>
        <span>الإمضاء</span>
      </div>
      <div class="sig-col">
        <div>الزوجة</div>
        <span>الإمضاء</span>
      </div>
      <div class="sig-col">
        <div>الولي عند الاقتضاء</div>
        <span>الإمضاء</span>
      </div>
    </div>

    <div class="text-small mt-6">
      وحرر ب${courtCity} بتاريخ
      <span class="inline-line">${requestDateG}</span>
      الموافق ل
      <span class="inline-line">${requestDateH}</span>
    </div>

  </div>
</div>
`
}

<!-- PAGE 4 -->
${
  renderCustomPage(3) ||
  `
<div class="page">
  <div class="page-inner">

    <div class="header-row">
      <div class="header-emblem header-adoul">
        ${
          adoulLogoDataUrl
            ? `<img src="${adoulLogoDataUrl}" alt="???? ??????">`
            : ''
        }
      </div>
      <div class="header-center"></div>
      <div class="header-emblem">
        ${
          logoDataUrl
            ? `<img src="${logoDataUrl}" alt="???? ???????">`
            : ''
        }
      </div>
    </div>

    <div class="royal-header">
      <div>????????????????? ???????????????????</div>
      <div>????? ?????</div>
      <div>????? ????????? ?${display(appealCity || courtCity)}</div>
      <div>??????? ?????????? ? ${display(firstInstanceCity || courtCity)}</div>
      <div>??? ???? ??????</div>
    </div>

    <div class="royal-info">
      <div>????? ??????? ?????? ???: <span>${display(fileNumber)} / ${display(year)}</span></div>
      <div>??? ?????: <span>${display(marriageAuthNumber)}</span></div>
      <div class="center-title" style="margin-top:6mm;">??? ?????? ??? ??????</div>
    </div>

    <div class="final-text">
      <p class="final-paragraph">
        ??? ???????/?:
        <span class="final-highlight">${display(contractedBy)}</span>
        ???? ?????? ?????? ??????? ???? ???? ?????? ???????? ?????????? ?
        <span class="final-highlight">${display(courtCity)}</span>.
      </p>

      <p class="final-paragraph">
        ???? ??? ????? ?????? ??? ???:
        <span class="final-highlight">${display(registryNumber)}</span>
        ??????:
        <span class="final-highlight">${display(inclusionDate)}</span>
        ???? ???? ?? ?????:
        <span class="final-highlight">${display(husbandName)}</span>
        ??????? ?:
        <span class="final-highlight">${display(husbandBirthPlace)}</span>
        ??:
        <span class="final-highlight">${display(husbandBirthDate)}</span>
        ??? ??? ?????? ???:
        <span class="final-highlight">${display(husbandBirthCertNum)}</span>
        ??????:
        <span class="final-highlight">${display(courtCity)}</span>
        ?????? ??????? ???:
        <span class="final-highlight">${display(husbandCin)}</span>
        ?????:
        <span class="final-highlight">${display(husbandOccupation)}</span>
        ??????:
        <span class="final-highlight">${display(husbandNationality)}</span>
        ????? ????????:
        <span class="final-highlight">${display(husbandMaritalStatus)}</span>
        ?????? ?:
        <span class="final-highlight">${display(husbandResidence)}</span>.
      </p>

      <p class="final-paragraph">
        ??? ?????? ?? ??????: ..... ?????? ??????? ???: ..... ????? ??????? ?? ??????: ..... ??????? ????? ???? ??????? ???: .... ???: .... ?? ??????? ??: ...... ??????? ??? ????? ?? ?????? ??? ????? ?? ?????? ???????? ????? ??? ???? ????:
        <span class="final-highlight">${display(dowryAmount)}</span>
        ????.
      </p>

      <p class="final-paragraph">
        ?? ??????:
        <span class="final-highlight">${display(wifeName)}</span>
        ???????? ?:
        <span class="final-highlight">${display(wifeBirthPlace)}</span>
        ??:
        <span class="final-highlight">${display(wifeBirthDate)}</span>
        ?? ???????:
        <span class="final-highlight">${display(wifeFatherName)}</span>
        ??? ??? ??????? ???:
        <span class="final-highlight">${display(wifeBirthCertNum)}</span>
        ??????:
        <span class="final-highlight">${display(courtCity)}</span>
        ??????? ??????? ???:
        <span class="final-highlight">${display(wifeCin)}</span>
        ??????:
        <span class="final-highlight">${display(wifeOccupation)}</span>
        ???????:
        <span class="final-highlight">${display(wifeNationality)}</span>
        ?????? ????????:
        <span class="final-highlight">${display(wifeMaritalStatus)}</span>
        ??????? ?:
        <span class="final-highlight">${display(wifeResidence)}</span>.
      </p>

      <p class="final-paragraph">
        ??? ?????? ?? ??????: ..... ?????? ??????? ???: ..... ????? ??????? ?? ??????: ..... ??????? ????? ???? ??????? ???: .... ???: .... ?? ??????? ??: ...... ??????? ??? ????? ?? ?????? ??? ????? ?? ????? ??????? ????? ??? ???? ????: ..... ????.
      </p>

      <p class="final-paragraph">
        ??? ?????:
        <span class="final-highlight">${display(wifeFatherName)}</span>
        ??????? ??????:
        <span class="final-highlight">${display(wifeFatherBirthDate)}</span>
        ?????? ??????? ???:
        <span class="final-highlight">${display(wifeFatherCIN)}</span>.
      </p>

      <p class="final-paragraph">
        ????? ??? ????? ??????? ???:
        <span class="final-highlight">${display(marriageAuthNumber)}</span>
        ??????:
        <span class="final-highlight">${display(inclusionDate)}</span>
        ????? ??? ??????? ?????? ??? ?? ????? ?????? ???? ?????.
        ????? ?????? 65 ?? ????? ?????? .
      </p>
    </div>

    <div class="final-divider">??????????????????????????????????????????</div>

    <div class="final-text">
      <p class="final-paragraph">
        ???? ??????? ????????? ??????? ?????? ??? ???????? ?????? ??? ?????? ??????? ???? ??????? ??????? ????? ?? ????? ??????.
      </p>
    </div>

    <div class="signature-block">
      <div>
        ???? ??:
        <span class="final-highlight">${display(courtCity)}</span>
        ??????:
        <span class="final-highlight">${display(docDate)}</span>
      </div>
      <div class="signature-line">
        ????? ?????? ?????? ????????
      </div>
    </div>

  </div>
</div>
`
}

</div>

</body>
</html>`;
  }

  private buildAuthorizationHtml(
    data: any,
    logoDataUrl: string,
    adoulLogoDataUrl: string,
  ): string {
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const safe = (v?: string | number | null) => {
      if (v === undefined || v === null || v === '' || Number.isNaN(v)) {
        return '..........';
      }
      return escapeHtml(v.toString());
    };
    
    // Map actual form fields to template variables
    const fileNumber = safe(data.file_number);
    const fileDate = safe(data.request_date_gregorian);
    const hijriDate = safe(data.request_date_hijri);
    const courtCity = safe(data.court_city);
    const courtAppeal = safe(data.court_appeal);
    const courtFirstInstance = safe(data.court_first_instance);
    
    // Time and date details (customizable)
    const meetingTime = safe(data.meeting_time);
    const meetingDay = safe(data.meeting_day);
    const hijriDay = safe(data.hijri_day);
    const hijriMonth = safe(data.hijri_month);
    const hijriYear = safe(data.hijri_year);
    const gregorianDay = safe(data.gregorian_day);
    const gregorianMonth = safe(data.gregorian_month);
    const gregorianYear = safe(data.gregorian_year);
    
    // Witnesses (customizable)
    const witness1Name = safe(data.witness1_name);
    const witness2Name = safe(data.witness2_name);
    
    // Registry information
    const registryNumber = safe(data.registry_number);
    const registryPage = safe(data.registry_page);
    const registryCount = safe(data.registry_count);
    const registryLetter = safe(data.registry_letter);
    
    // Husband data
    const husbandName = safe(data.husband_name);
    const husbandBirthDate = safe(data.husband_birth_date);
    const husbandBirthPlace = safe(data.husband_birth_place);
    const husbandBirthCertNum = safe(data.husband_birth_cert_num);
    const husbandBirthYear = safe(data.husband_birth_year);
    const husbandNationality = safe(data.husband_nationality);
    const husbandCIN = safe(data.husband_cin);
    const husbandResidence = safe(data.husband_residence);
    
    // Wife data
    const wifeName = safe(data.wife_name);
    const wifeBirthDate = safe(data.wife_birth_date);
    const wifeBirthPlace = safe(data.wife_birth_place);
    const wifeBirthCertNum = safe(data.wife_birth_cert_num);
    const wifeBirthYear = safe(data.wife_birth_year);
    const wifeNationality = safe(data.wife_nationality);
    const wifeCIN = safe(data.wife_cin);
    const wifeResidence = safe(data.wife_residence);
    const wifeFatherName = safe(data.wife_father_name);
    const wifeFatherBirthDate = safe(data.wife_father_birth_date);
    const wifeFatherCIN = safe(data.wife_father_cin);
    
    // Marriage authorization details
    const marriageAuthNum = safe(data.marriage_authorization_no);
    const engagementCertNum = safe(data.engagement_cert_num);
    const engagementCertDate = safe(data.engagement_cert_date);
    
    // Other data
    const dowryAmount = safe(data.dowry_amount);
    const fileYear = safe(data.file_year);

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>وثيقة الزواج - ${fileNumber}</title>
<style>
@page {
  margin: 2cm 1.5cm;
  size: A4;
}
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: 'Amiri', 'Traditional Arabic', 'Arial', serif;
  direction: rtl;
  text-align: right;
  font-size: 14px;
  line-height: 2;
  color: #1a1a1a;
  background: #ffffff;
  padding: 15px 20px;
}
.document-header {
  text-align: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 3px double #333;
}
.document-logos{
  display:flex;
  flex-direction:row;
  justify-content:space-between;
  align-items:center;
  margin-bottom:10px;
}
.document-logo{
  width:32mm;
  text-align:center;
}
.document-logo img{
  width:30mm;
  height:auto;
}
.document-header h1 {
  font-size: 20px;
  font-weight: bold;
  color: #000;
  margin-bottom: 8px;
}
.document-header .doc-info {
  font-size: 12px;
  color: #555;
  margin-top: 5px;
}
.highlight {
  font-weight: bold;
  display: inline-block;
}
.content {
  text-align: justify;
  text-justify: inter-word;
  margin: 20px 0;
  padding: 0 10px;
}
.content p {
  margin-bottom: 15px;
  line-height: 2.2;
}
.document-footer {
  margin-top: 40px;
  padding-top: 15px;
  border-top: 2px solid #ccc;
  text-align: center;
  font-size: 11px;
  color: #666;
}
@media print {
  body {
    padding: 0;
  }
  .highlight {
    font-weight: bold;
  }
}
</style>
</head>
<body>

<div class="document-header">
  <div class="document-logos">
    <div class="document-logo">
      ${
        logoDataUrl
          ? `<img src="${logoDataUrl}" alt="شعار المملكة">`
          : ''
      }
    </div>
    <div class="document-logo document-logo-adoul">
      ${
        adoulLogoDataUrl
          ? `<img src="${adoulLogoDataUrl}" alt="شعار العدول">`
          : ''
      }
    </div>
  </div>
  <h1>🕌 وثيقة عقد الزواج</h1>
  <div class="doc-info">
    <span>رقم الملف: <strong>${fileNumber}</strong></span>
    <span style="margin: 0 15px;">|</span>
    <span>التاريخ: <strong>${fileDate}</strong></span>
    <span style="margin: 0 15px;">|</span>
    <span>المحكمة: <strong>${courtCity}</strong></span>
  </div>
</div>

<div class="content">

<p>
<strong>الحمد لله وحده</strong>، وعن إذن من يجب رقم <span class="highlight">${fileNumber}</span> بتاريخ <span class="highlight">${fileDate}</span> من قاضي الأسرة المكلف بالزواج <span class="highlight">بابتدائية ${courtCity}</span>، وعلى الساعة <span class="highlight">${meetingTime}</span> <span class="highlight">${meetingDay}</span> <span class="highlight">${hijriDay}</span> <span class="highlight">${hijriMonth}</span> عام <span class="highlight">${hijriYear}</span> موافق <span class="highlight">${gregorianDay}</span> <span class="highlight">${gregorianMonth}</span> سنة <span class="highlight">${gregorianYear}</span> (<span class="highlight">${hijriDate}</span>)، تلقى العدلان <span class="highlight">${witness1Name}</span> و<span class="highlight">${witness2Name}</span> المنتصبان بالإشهاد بدائرة المحكمة الاستئنافية <span class="highlight">${courtAppeal}</span> قسم التوثيق <span class="highlight">ب${courtCity}</span> الشهادة المدرجة بمذكرة الحفظ كأونيهما رقم <span class="highlight">${registryPage}</span> صحيفة <span class="highlight">${registryCount}</span> عدد <span class="highlight">${registryNumber}</span>.
</p>

<p>
<strong>نصها:</strong> الحمد لله، تزوج على بركة الله السيد <span class="highlight">${husbandName}</span> المولود <span class="highlight">ب${husbandBirthPlace}</span> بتاريخ <span class="highlight">${husbandBirthDate}</span> حسب رسم ولادته عدد <span class="highlight">${husbandBirthCertNum}</span> لسنة <span class="highlight">${husbandBirthYear}</span>، <span class="highlight">${husbandNationality}</span>، يسكن <span class="highlight">ب${husbandResidence}</span>، بطاقته الوطنية رقم <span class="highlight">${husbandCIN}</span>.
</p>

<p>
زوجته المباركة عليه الآنسة <span class="highlight">${wifeName}</span> المولودة <span class="highlight">ب${wifeBirthPlace}</span> بتاريخ <span class="highlight">${wifeBirthDate}</span> حسب رسم ولادتها عدد <span class="highlight">${wifeBirthCertNum}</span> لسنة <span class="highlight">${wifeBirthYear}</span>، <span class="highlight">${wifeNationality}</span>، حالتها عازبة حسب تصريحها وشهادتها للخطوبة رقم <span class="highlight">${engagementCertNum}</span> بتاريخ <span class="highlight">${engagementCertDate}</span> مع مقرر زواجها رقم <span class="highlight">${marriageAuthNum}</span> من <span class="highlight">ابتدائية ${courtCity}</span> بتاريخ <span class="highlight">${fileDate}</span>، تسكن <span class="highlight">${wifeResidence}</span>، بطاقتها الوطنية رقم <span class="highlight">${wifeCIN}</span>.
</p>

<p>
الحل للزواج الخالية من موانعه على صداق مسمى قدره <span class="highlight">${dowryAmount} درهم</span>، قضته اعترافاً بواسطة والدها <span class="highlight">${wifeFatherName}</span> المولود بتاريخ <span class="highlight">${wifeFatherBirthDate}</span>، بطاقته رقم <span class="highlight">${wifeFatherCIN}</span>، وفق الكتاب والسنة وعلى اليمين والأمان وما يتلى في كتاب الله من إمساك بمعروف أو تسريح بإحسان، بإذنها ورضاها وتفويضها إياه على ذلك.
</p>

<p>
وقبل كل من الزوجين النكاح المسطور بعد صدور الإيجاب والقبول من الزوجين، وأعلمها بمسألة تنظيم الأموال المكتسبة بعد الزواج، فالله يؤلف بينهما لما يحبه ويرضاه. عرفوا قدره، شهد به عليهم وبناته، وعرف بهم بما ذكر أعلاه، وحرر في تاريخ التلقي صدره عبد ربه.
</p>

</div>

<div class="document-footer">
  <p>📋 هذه الوثيقة صادرة عن ${courtCity} | رقم السجل: ${registryNumber} | التاريخ: ${fileDate}</p>
  <p style="margin-top: 5px; font-size: 10px;">تم إنشاء هذه الوثيقة إلكترونياً - للمراجعة والتدقيق</p>
</div>

</body>
</html>`;
  }
}
