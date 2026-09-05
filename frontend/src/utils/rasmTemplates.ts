export interface HeaderTemplate {
  id: string;
  name: string;
  path: string;
}

export const NOTARY_HEADERS: HeaderTemplate[] = [
  { id: 'DECOR ADOUL 33', name: 'نموذج مغربي رسمي (جديد)', path: '/logos/adoul-logo.jpg' },
  { id: 'DECOR ADOUL 4', name: 'نموذج وزارة العدل', path: '/logos/morocco-coat.jpg' },
  { id: 'DECOR ADOUL5', name: 'نموذج 3 (5)', path: '/templates/headers/DECOR ADOUL5.docx' },
  { id: 'DECOR QDOUL1', name: 'نموذج 4 (1)', path: '/templates/headers/DECOR QDOUL1.docx' },
  { id: 'DoCOR QDOUL6', name: 'نموذج 5 (6)', path: '/templates/headers/DoCOR QDOUL6.docx' },
];

export interface HeaderOptions {
  documentType?: string;
  appellateCourt?: string;
  primaryCourt?: string;
  courtName?: string;
}

export const getDocumentTypeArabicLabel = (docType?: string): string => {
  if (!docType) return 'محرر عدلي رسمي';
  const clean = docType.trim().replace(/_/g, ' ');
  if (clean.startsWith('رسم ')) return clean;
  switch (clean) {
    case 'زواج':
      return 'رسم زواج';
    case 'زواج مختلط':
      return 'رسم زواج مختلط';
    case 'استمرار الزوجية':
      return 'رسم استمرار الزوجية';
    case 'طلاق':
      return 'رسم طلاق';
    case 'رجعة':
      return 'رسم رجعة';
    case 'بيع وشراء':
      return 'رسم بيع وشراء';
    case 'بيع وشراء معنوي':
      return 'رسم شراء (شخص معنوي)';
    case 'بيع وشراء ملكية مشتركة':
      return 'رسم شراء في الملكية المشتركة';
    case 'وصية':
      return 'رسم وصية';
    case 'إراثة':
      return 'رسم إراثة';
    case 'هبة':
      return 'رسم هبة';
    case 'صدقة':
      return 'رسم صدقة';
    case 'رهن':
      return 'رسم رهن';
    case 'إقرار':
      return 'رسم إقرار';
    case 'مقاسمة':
      return 'رسم مقاسمة';
    case 'وكالة':
      return 'رسم وكالة';
    case 'كفالة':
      return 'رسم كفالة';
    case 'ثبوت نسب ببينة السماع':
      return 'رسم ثبوت نسب';
    default:
      return clean.startsWith('رسم') ? clean : `رسم ${clean}`;
  }
};

export const getHeaderHtml = (headerId: string, options?: HeaderOptions) => {
  const goldText = '#cfa11d';
  const redBar = '#8e2b17';

  const docTypeLabel = getDocumentTypeArabicLabel(options?.documentType);
  
  const rawAppellate = options?.appellateCourt ? options.appellateCourt.replace(/^محكمة الاستئناف\s*(بـ|ب|في)?\s*/i, '').trim() : '';
  const appellateCourtText = rawAppellate ? `محكمة الاستئناف بـ ${rawAppellate}` : 'محكمة الاستئناف';

  const rawPrimary = (options?.primaryCourt || options?.courtName || '')
    ? (options?.primaryCourt || options?.courtName || '').replace(/^المحكمة الابتدائية\s*(بـ|ب|في)?\s*/i, '').trim()
    : '';
  const primaryCourtText = rawPrimary ? `المحكمة الابتدائية بـ ${rawPrimary}` : 'المحكمة الابتدائية';

  switch (headerId) {
    case 'DECOR ADOUL 33':
    case 'DECOR ADOUL 4':
    default:
      return `
        <table dir="rtl" style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-family: 'Amiri', Arial, sans-serif;">
          <tr>
            <!-- Right Column: Ministry Info -->
            <td style="width: 38%; text-align: right; vertical-align: top; padding: 10px;">
              <div style="color: ${goldText}; font-size: 22px; font-weight: 900; margin-bottom: 4px;">المملكة المغربية</div>
              <div style="color: #1a2a3a; font-size: 16px; font-weight: 700; border-bottom: 2px solid ${redBar}; display: inline-block; padding-bottom: 4px; margin-bottom: 8px;">وزارة الـعـدل</div>
              <div style="color: #444; font-size: 13px; font-weight: bold; line-height: 1.6;">
                ${appellateCourtText}<br/>
                ${primaryCourtText}<br/>
                قسم قضاء الأسرة والتوثيق
              </div>
            </td>

            <!-- Center Column: Seal -->
            <td style="width: 24%; text-align: center; vertical-align: middle;">
              <div style="width: 105px; height: 105px; margin: 0 auto; background: white; border: 3px double ${goldText}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <img src="/logos/morocco-coat.jpg" style="width: 80px; height: 80px; object-fit: contain;" alt="شعار المملكة" />
              </div>
            </td>

            <!-- Left Column: Deed Info -->
            <td style="width: 38%; text-align: left; vertical-align: top; padding: 10px;">
              <div style="display: inline-block; background: linear-gradient(to right, ${redBar}, #b33927); color: white; padding: 6px 20px; border-radius: 50px; font-weight: 900; font-size: 13px; margin-bottom: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.15);">
                محرر عدلي رسمي
              </div>
              <div style="text-align: left;">
                <div style="font-size: 22px; color: #2c3e50; font-weight: 900; margin-bottom: 5px;">هيئة العدول بالمغرب</div>
                <div style="display: inline-block; background: #fffbe6; border: 1.5px solid ${goldText}; color: ${redBar}; padding: 4px 16px; border-radius: 6px; font-size: 15px; font-weight: 900;">
                  ${docTypeLabel}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="3" style="padding-top: 15px;">
              <div style="height: 2px; background: linear-gradient(to right, transparent, ${goldText}, transparent); width: 100%;"></div>
            </td>
          </tr>
        </table>
      `;
  }
};

export const wrapInFullHtml = (content: string, headerHtml: string) => {
  return `
    <div id="rasm-document-wrapper" dir="rtl" style="
      width: 760px;
      margin: 0 auto; 
      padding: 40px 50px; 
      background: #fff; 
      font-family: 'Amiri', 'Traditional Arabic', serif, Arial;
      font-size: 17px;
      line-height: 2.1;
      text-align: justify;
      color: #1a1a1a;
      direction: rtl;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
    ">
      ${headerHtml}
      
      <div id="rasm-document-content" style="margin-top: 25px; direction: rtl; text-align: justify; min-height: 400px; padding: 0 5px; font-family: 'Amiri', 'Traditional Arabic', serif; font-size: 17px; line-height: 2.2;">
        ${content}
      </div>

      <div id="rasm-signature-blocks" style="margin-top: 70px; border-top: 1px dashed #cbd5e1; padding-top: 25px; display: flex; flex-direction: row-reverse; justify-content: space-between;">
        <div style="text-align: center; width: 30%;">
           <p style="font-weight: 900; font-size: 14px; margin-bottom: 35px; color: #475569;">توقيع العدل الأول</p>
           <div style="color: #94a3b8; font-size: 11px; font-weight: bold; border: 1px dashed #cbd5e1; padding: 8px; border-radius: 6px;">ختم التحقق الإلكتروني</div>
        </div>
        <div style="text-align: center; width: 30%;">
           <p style="font-weight: 900; font-size: 14px; margin-bottom: 35px; color: #475569;">توقيع العدل الثاني</p>
           <div style="color: #94a3b8; font-size: 11px; font-weight: bold; border: 1px dashed #cbd5e1; padding: 8px; border-radius: 6px;">ختم التحقق الإلكتروني</div>
        </div>
        <div style="text-align: center; width: 30%;">
           <p style="font-weight: 900; font-size: 14px; margin-bottom: 35px; color: #475569;">قاضي التوثيق</p>
           <div style="color: #94a3b8; font-size: 11px; font-weight: bold; border: 1px dashed #cbd5e1; padding: 8px; border-radius: 6px;">طابع المحكمة الابتدائية</div>
        </div>
      </div>

      <div style="margin-top: 35px; text-align: center; color: #94a3b8; font-size: 11px; font-weight: bold; border-top: 1px solid #f1f5f9; padding-top: 10px;">
        تم تحرير هذه الوثيقة وفق مقتضيات خطة العدالة عبر منصة التوثيق العدلي الموحد — وزارة العدل المغربية
      </div>
    </div>
  `;
};
