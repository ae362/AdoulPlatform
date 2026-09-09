import {
  MARRIAGE_DOCUMENT_TYPES,
  SALE_DOCUMENT_TYPES,
} from '../constants/feesAgentLocales';
import type { FeesAgentState, DocumentMeta } from '../types/feesAgentTypes';
import {
  convertGregorianToHijri,
  getArabicWeekdayName,
  convertGregorianDateToWords,
  convertHijriDateToWords,
  convertNumberToArabicWords,
} from '../utils/feesAgentUtils';

// ============================================================================
// XML / WORD PARAGRAPH HELPERS
// ============================================================================

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildWordParagraphXml(line: string): string {
  const safe = escapeXml(line);
  return (
    `<w:p>` +
    `<w:pPr>` +
    `<w:jc w:val="right"/>` +
    `<w:bidi/>` +
    `</w:pPr>` +
    `<w:r>` +
    `<w:rPr><w:rtl/><w:lang w:val="ar-SA"/></w:rPr>` +
    `<w:t xml:space="preserve">${safe}</w:t>` +
    `</w:r>` +
    `</w:p>`
  );
}

export function injectDraftIntoDocxZip(zip: any, draftText: string): void {
  const docFile = zip.file('word/document.xml');
  const docXml = docFile?.asText?.() as string | undefined;
  if (!docXml) throw new Error('Missing word/document.xml in template');

  const paragraphsXml = draftText.split('\n').map(buildWordParagraphXml).join('');
  const bodyOpenMatch = /<w:body[^>]*>/i.exec(docXml);

  if (!bodyOpenMatch || bodyOpenMatch.index === undefined) {
    throw new Error('Invalid document.xml (missing <w:body>)');
  }
  const bodyOpenEnd = bodyOpenMatch.index + bodyOpenMatch[0].length;
  const bodyCloseIndex = docXml.indexOf('</w:body>');
  if (bodyCloseIndex === -1) {
    throw new Error('Invalid document.xml (missing </w:body>)');
  }

  const bodyInner = docXml.slice(bodyOpenEnd, bodyCloseIndex);
  const sectIdxInInner = bodyInner.lastIndexOf('<w:sectPr');

  // If sectPr exists, append before it (so the text stays in the main flow).
  // If sectPr is nested inside a section-break paragraph (<w:pPr><w:sectPr>...),
  // insert before that paragraph to avoid corrupting the XML structure.
  if (sectIdxInInner !== -1) {
    const beforeSect = bodyInner.slice(0, sectIdxInInner);
    const lastPprOpen = beforeSect.lastIndexOf('<w:pPr');
    const lastPprClose = beforeSect.lastIndexOf('</w:pPr>');
    const sectIsInsidePpr = lastPprOpen !== -1 && lastPprOpen > lastPprClose;

    if (sectIsInsidePpr) {
      const lastPStart = beforeSect.lastIndexOf('<w:p');
      if (lastPStart !== -1) {
        const insertAt = bodyOpenEnd + lastPStart;
        const nextXml = docXml.slice(0, insertAt) + paragraphsXml + docXml.slice(insertAt);
        zip.file('word/document.xml', nextXml);
        return;
      }
    }

    const insertAt = bodyOpenEnd + sectIdxInInner;
    const nextXml = docXml.slice(0, insertAt) + paragraphsXml + docXml.slice(insertAt);
    zip.file('word/document.xml', nextXml);
    return;
  }

  // If there's no sectPr, append right before closing body.
  const nextXml = docXml.slice(0, bodyCloseIndex) + paragraphsXml + docXml.slice(bodyCloseIndex);
  zip.file('word/document.xml', nextXml);
}

// ============================================================================
// LEGAL STRING & TEMPLATE GENERATORS
// ============================================================================

export const formatCourtName = (name?: string | null): string => {
  if (!name) return '';
  return name
    .replace(/^(بالمحكمة الابتدائية بـ|بالمحكمة الابتدائية ب|بالمحكمة الابتدائية في|بالمحكمة الابتدائية|المحكمة الابتدائية بـ|المحكمة الابتدائية ب|المحكمة الابتدائية في|المحكمة الابتدائية|بمحكمة الاستئناف بـ|بمحكمة الاستئناف ب|بمحكمة الاستئناف|محكمة الاستئناف بـ|محكمة الاستئناف ب|محكمة الاستئناف في|محكمة الاستئناف)\s*/u, '')
    .trim();
};

export const stripHtmlToPlainText = (html: string): string => {
  if (!html) return '';
  const normalized = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<\s*\/div\s*>/gi, '\n');

  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = normalized;
    const text = (tmp.textContent || tmp.innerText || '').replace(/\u00a0/g, ' ');
    return text
      .split('\n')
      .map((l) => l.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return normalized
    .replace(/<[^>]*>/g, '')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export function generateMarriageRasmHtml(state: FeesAgentState): string {
  const { sellers, buyers, witnesses, meta, marriageDetails, finance, dowry } = state;
  const husband = sellers?.[0] || ({} as any);
  const wife = buyers?.[0] || ({} as any);
  const md = marriageDetails || ({} as any);
  const d = dowry || ({} as any);

  const courtName = formatCourtName(md.courtName || meta?.court) || 'تطوان';
  const courtSection = md.courtSection || 'قسم التوثيق وقضاء الأسرة';
  const appellateCourt = (meta as any)?.appellateCourt || 'تطوان';
  const notary1 = meta?.notaryPrimary || 'الحسن النوادرى';
  const notary2 = meta?.notarySecondary || 'محمد الخياط';

  const regBook = md.registryBookType || 'كناش الأنكحة';
  const regNum = md.registryNumber || '12';
  const regPage = md.registryPage || '45';
  const regCount = md.registryCount || '180';
  const regDate = md.registryDate || meta?.dateGregorian || '---';

  const memoNum = md.memorandumNumber || '04';
  const memoCount = md.memorandumRecordNumber || '85';
  const memoPage = md.memorandumPage || '12';

  const authNum = md.authorizationNumber || '---';
  const authDate = md.authorizationDate || meta?.dateGregorian || '---';
  const authCourt = formatCourtName(md.authorizationCourt || md.courtName || meta?.court) || courtName;

  const dowryAmt = md.dowryAmount || d?.totalAmount || finance?.price || 0;
  const dowryWords = md.dowryAmountInWords || d?.totalAmountArabic || finance?.priceInWords || (dowryAmt ? convertNumberToArabicWords(dowryAmt) : '---');

  const dowryRecStatus = md.isDowryReceived === 'كاملا'
    ? 'قبضت الزوجة جميعه قبضا تاما فأبرأته منه براءة تامة'
    : md.isDowryReceived === 'جزئي'
    ? `قبضت منه معجلا قدره ${md.dowryAdvance || 0} درهم (${md.dowryAdvanceInWords || ''}) والباقي مؤخر كالئ في ذمته قدره ${md.dowryDeferred || 0} درهم (${md.dowryDeferredInWords || ''})`
    : 'صداقا مؤخرا كالئا في ذمة الزوج يحل بأقرب الأجلين';

  const sessionTime = md.sessionTimeWords || meta?.hourInWords || (meta?.time ? `على الساعة ${meta.time}` : 'على الساعة الحادية عشرة صباحا');
  const dateGreg = meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const dateHijri = meta?.dateHijri || convertGregorianToHijri(dateGreg);
  const sessionDay = getArabicWeekdayName(dateGreg) || 'الخميس';
  const sessionDateGregWords = md.sessionDateWords || meta?.dateGregorianInWords || convertGregorianDateToWords(dateGreg);
  const sessionDateHijriWords = meta?.dateHijriInWords || convertHijriDateToWords(dateGreg);

  const husbandBirthCert = husband.birthCertificateNumber
    ? `عقد ولادته رقم <strong>${husband.birthCertificateNumber}</strong> لسنة <strong>${husband.birthCertificateYear || '---'}</strong> جماعة <strong>${husband.birthCertificateCommune || husband.birthCertificateCity || '---'}</strong>`
    : '';

  const wifeBirthCert = wife.birthCertificateNumber
    ? `عقد ولادتها رقم <strong>${wife.birthCertificateNumber}</strong> لسنة <strong>${wife.birthCertificateYear || '---'}</strong> جماعة <strong>${wife.birthCertificateCommune || wife.birthCertificateCity || '---'}</strong>`
    : '';

  const guardianClause = wife.guardianName
    ? `وعقد زواجها وليها ${wife.guardianRelationship || 'وليها'} السيد <strong>${wife.guardianName}</strong> مهنته ${wife.guardianProfession || '---'} الساكن بـ ${wife.guardianAddress || 'معها'} بطاقته الوطنية ${wife.guardianNationalID || '---'}`
    : 'وتولت الزوجة الرشيدة عقد زواجها بنفسها طبقا لمقتضيات مدونة الأسرة';

  const condClause = md.hasSpecialConditions === 'نعم' && md.specialConditionsText
    ? `واشترط في العقد ما نصه: « <strong>${md.specialConditionsText}</strong> »`
    : 'ولم يشترط الزوجان أي شرط خاص في هذا العقد';

  const art49Clause = md.hasAssetManagementAgreement === 'نعم'
    ? 'واتفق الزوجان على تدبير الأموال المكتسبة أثناء قيام الزوجية بموجب وثيقة مستقلة طبقا للمادة 49 من مدونة الأسرة'
    : 'وأشعرا بمقتضيات المادة 49 من مدونة الأسرة الخاصة بتدبير الأموال المكتسبة واكتفيا بأحكام القواعد العامة';

  const witnessesList = witnesses && witnesses.length > 0
    ? witnesses.map((w: any) => `السيد <strong>${w.name}</strong> بطاقته الوطنية رقم <strong>${w.idNumber}</strong>`).join(' و ')
    : 'شاهدين عدلين';

  const marriageNarrative = `
    الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وآله وصحبه.
    على الساعة <strong>${sessionTime}</strong> من يوم <strong>${sessionDay}</strong> <strong>${sessionDateHijriWords}</strong> هجرية، موافق <strong>${sessionDateGregWords}</strong> ميلادية (<strong>${dateHijri}</strong> / <strong>${dateGreg}</strong>)،
    تلقى العدلان أمنهما الله <strong>${notary1}</strong> و <strong>${notary2}</strong> المنتصبان للإشهاد بدائرة محكمة الاستئناف بـ <strong>${appellateCourt}</strong>، قسم التوثيق وقضاء الأسرة بالمحكمة الابتدائية بـ <strong>${courtName}</strong>،
    الشهادة المدرجة بمذكرة حفظ العدل الأول رقم <strong>${memoNum}</strong> صحيفة <strong>${memoPage}</strong> عدد <strong>${memoCount}</strong>، نصها:
    الحمد لله، بعد الإذن الصادر عن السيد قاضي الأسرة المكلف بالزواج بالمحكمة الابتدائية بـ <strong>${authCourt}</strong> تحت رقم <strong>${authNum}</strong> بتاريخ <strong>${authDate}</strong>،
    تزوج على بركة الله وحسن توفيقه الجميل:
    الزوج: السيد <strong>${husband.name || '---'}</strong>، المزداد بـ <strong>${husband.placeOfBirth || '---'}</strong> بتاريخ <strong>${husband.dateOfBirth || '---'}</strong>، من والديه السيد <strong>${husband.fatherName || '---'}</strong> والسيدة <strong>${husband.motherName || '---'}</strong>، ${husbandBirthCert}، مهنته <strong>${husband.profession || '---'}</strong>، والساكن بـ <strong>${husband.address || '---'}</strong>، الحامل للبطاقة الوطنية للتعريف رقم <strong>${husband.idNumber || '---'}</strong>،
    وزوجته: البنت المصونة السيدة <strong>${wife.name || '---'}</strong>، المولودة بـ <strong>${wife.placeOfBirth || '---'}</strong> بتاريخ <strong>${wife.dateOfBirth || '---'}</strong>، من والديها السيد <strong>${wife.fatherName || '---'}</strong> والسيدة <strong>${wife.motherName || '---'}</strong>، ${wifeBirthCert}، مهنتها <strong>${wife.profession || 'بدون مهنة'}</strong>، والساكنة بـ <strong>${wife.address || '---'}</strong>، الحاملة للبطاقة الوطنية للتعريف رقم <strong>${wife.idNumber || '---'}</strong>،
    ${guardianClause}،
    على صداق مبارك قدره ونهايته <strong>${dowryWords}</strong> (<strong>${dowryAmt.toLocaleString()} درهم</strong>)، ${dowryRecStatus}.
    تزوجها على كتاب الله وسنة رسوله المصطفى ﷺ، وباليمن والبركة، سمع منهما العدلان ${witnessesList} الإيجاب والقبول الصريحين التامين الرضائيين،
    ${condClause}، ${art49Clause}.
    وقبل الزوجان هذا النكاح الشرعي وارتضياه وعقداه حسب المسطور، وحفظ للعدل الأول، وحرر الرسم في تاريخه المذكور، عبد ربه تعالى وعبد ربه.
  `
    .replace(/[،,]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return `
    <div style="font-family: 'Traditional Arabic', 'Amiri', 'Segoe UI', Tahoma, serif; direction: rtl; text-align: justify; line-height: 2.2; font-size: 17px; color: #1a202c; padding: 25px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      
      <!-- Top Official Moroccan Royal Header -->
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #059669; padding-bottom: 15px;">
        <div style="font-size: 22px; font-weight: bold; color: #065f46; margin-bottom: 4px;">المملكة المغربية</div>
        <div style="font-size: 18px; font-weight: bold; color: #334155; margin-bottom: 4px;">وزارة العدل</div>
        <div style="font-size: 17px; font-weight: bold; color: #1e293b;">المحكمة الابتدائية بـ ${courtName} - ${courtSection}</div>
        <div style="margin-top: 10px; font-size: 14px; color: #475569; background: #f0fdf4; padding: 6px 12px; border-radius: 6px; display: inline-block; border: 1px solid #bbf7d0;">
          ${regBook} | كناش رقم: <strong style="color: #065f46;">${regNum}</strong> | صحيفة: <strong style="color: #065f46;">${regPage}</strong> | عدد: <strong style="color: #065f46;">${regCount}</strong> | بتاريخ: <strong style="color: #065f46;">${regDate}</strong>
        </div>
      </div>

      <!-- Quranic Ayah -->
      <div style="text-align: center; margin: 18px 0; padding: 12px 20px; background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #047857;">
          قال تعالى: ﴿ وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً إِنَّ فِي ذَٰلِكَ لَآيَاتٍ لِّقَوْمٍ يَتَفَكَّرُونَ ﴾
        </p>
        <span style="font-size: 13px; color: #065f46; font-weight: 600;">صدق الله العظيم</span>
      </div>

      <!-- Unified Continuous Legal Paragraph (Moroccan Rasm Format) -->
      <div style="margin: 20px 0; padding: 22px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;">
        <p style="margin: 0; padding: 0; text-align: justify; text-justify: inter-word; line-height: 2.3; font-size: 18px; color: #0f172a; text-indent: 32px;">
          ${marriageNarrative}
        </p>
      </div>

      <!-- Signatures Box -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 25px; padding-top: 15px; border-top: 2px dashed #94a3b8; text-align: center;">
        <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 25px; font-size: 15px;">توقيع الزوج</div>
          <div style="font-size: 13px; color: #64748b;">${husband.name || 'الزوج'}</div>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 25px; font-size: 15px;">توقيع الزوجة / الولي</div>
          <div style="font-size: 13px; color: #64748b;">${wife.name || 'الزوجة'}</div>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 25px; font-size: 15px;">توقيع العدلين المنتصبين</div>
          <div style="font-size: 13px; color: #64748b;">${notary1} - ${notary2}</div>
        </div>
      </div>

      <!-- Judge Attestation Section -->
      <div style="margin-top: 20px; padding: 12px 16px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; text-align: center;">
        <div style="font-weight: bold; color: #065f46; font-size: 16px; margin-bottom: 4px;">خطاب قاضي التوثيق المكلف بالزواج</div>
        <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.6;">
          الحمد لله وحده، خطب على هذا الرسم طبق رسميته وثبوته بعد مراقبة الإجراءات القانونية واستيفاء الموجبات الشرعية بالمحكمة الابتدائية بـ ${courtName}.
        </p>
        <div style="margin-top: 12px; display: flex; justify-content: space-around; font-size: 13px; color: #71717a;">
          <span>بتاريخ: ..................................</span>
          <span>توقيع وخاتم القاضي المكلف بالتوثيق: ..................................</span>
        </div>
      </div>

    </div>
  `;
}

export function generateSaleRasmHtml(state: FeesAgentState): string {
  const { sellers = [], buyers = [], properties = [], finance, meta, postRegistration } = state;
  const certificates = (state as any).certificates || [];
  const prop = properties[0] || ({} as any);
  const titleDoc = prop.titleDocuments?.[0] || ({} as any);

  const courtName = formatCourtName(meta?.court) || 'شفشاون';
  const appellateCourt = (meta as any)?.appellateCourt || 'تطوان';
  const notary1 = meta?.notaryPrimary || 'الحسن النوادرى';
  const notary2 = meta?.notarySecondary || 'محمد الخياط';

  // Date and Time conversions
  const dateGregorian = meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const dateHijri = meta?.dateHijri || convertGregorianToHijri(dateGregorian);
  const sessionDay = getArabicWeekdayName(dateGregorian) || 'الأربعاء';
  const sessionTime = meta?.hourInWords || (meta?.time ? `على الساعة ${meta.time}` : 'على الساعة ظهر');
  const dateGregorianWords = meta?.dateGregorianInWords || convertGregorianDateToWords(dateGregorian) || 'نونبر سنة أربعة وعشرين وألفين';
  const dateHijriWords = meta?.dateHijriInWords || convertHijriDateToWords(dateGregorian) || 'جمادى الأولى عام ستة وأربعين وأربعمائة وألف';

  // Memorandum of Retention (مذكرة حفظ العدل الأول)
  const memoNumber = (meta as any)?.memoNumber || (meta as any)?.memorandumNumber || '08';
  const memoPage = (meta as any)?.memoPage || (meta as any)?.memorandumPage || '24';
  const memoCount = (meta as any)?.memoCount || (meta as any)?.memorandumRecordNumber || '156';

  // Buyers Clause (المشترون والأنصبة)
  let buyersClause = '';
  if (!buyers || buyers.length === 0) {
    buyersClause = 'اشترى المشتري [بيانات المشتري]';
  } else if (buyers.length === 1) {
    const b = buyers[0];
    const prefix = b.name?.startsWith('السيد') || b.name?.startsWith('السيدة') ? '' : (b.partyType === 'legal' ? 'الشركة المسماة' : 'السيد(ة)');
    const dobPart = b.dateOfBirth ? ` المزداد(ة) في <strong>${b.dateOfBirth}</strong>` : '';
    const cinPart = b.idNumber ? ` بطاقته(ا) الوطنية رقم <strong>${b.idNumber}</strong>` : '';
    const addrPart = b.address ? ` والساكن(ة) بـ <strong>${b.address}</strong>` : '';
    const repPart = b.partyType === 'legal' && b.legalRepresentativeName 
      ? ` في شخص ممثلها القانوني السيد <strong>${b.legalRepresentativeName}</strong> بصفته <strong>${b.legalRepresentativeCapacity || 'ممثلاً قانونياً'}</strong> بموجب السجل التجاري رقم <strong>${b.commercialRegister || '---'}</strong> ومعرف الشركة (ICE) رقم <strong>${b.ice || '---'}</strong>`
      : '';
    buyersClause = `اشترى ${prefix} <strong>${b.name || '---'}</strong>${dobPart}${cinPart}${addrPart}${repPart}`;
  } else if (buyers.length === 2) {
    const b1 = buyers[0];
    const b2 = buyers[1];
    const p1 = b1.name?.startsWith('السيد') || b1.name?.startsWith('السيدة') ? '' : 'السيد(ة)';
    const p2 = b2.name?.startsWith('السيد') || b2.name?.startsWith('السيدة') ? '' : 'السيد(ة)';
    const dob1 = b1.dateOfBirth ? ` المزداد(ة) في <strong>${b1.dateOfBirth}</strong>` : '';
    const cin1 = b1.idNumber ? ` بطاقته(ا) الوطنية رقم <strong>${b1.idNumber}</strong>` : '';
    const addr1 = b1.address ? ` والساكن(ة) بـ <strong>${b1.address}</strong>` : '';
    const dob2 = b2.dateOfBirth ? ` المزداد(ة) في <strong>${b2.dateOfBirth}</strong>` : '';
    const cin2 = b2.idNumber ? ` بطاقته(ا) الوطنية رقم <strong>${b2.idNumber}</strong>` : '';
    const addr2 = b2.address ? ` والساكن(ة) بـ <strong>${b2.address}</strong>` : '';
    const shareText = (b1.share && b2.share && b1.share !== b2.share) 
      ? `بحسب الأنصبة المحددة لكل منهما (${b1.share} للأول و ${b2.share} للثاني)`
      : 'أنصافا سوية بينهما لا فضل لأحدهما على الآخر';
    buyersClause = `اشترى ${p1} <strong>${b1.name || '---'}</strong>${dob1}${cin1}${addr1} و ${p2} <strong>${b2.name || '---'}</strong>${dob2}${cin2}${addr2} <strong>${shareText}</strong>`;
  } else {
    const buyersList = buyers.map((b) => {
      const p = b.name?.startsWith('السيد') || b.name?.startsWith('السيدة') ? '' : 'السيد(ة)';
      const dob = b.dateOfBirth ? ` المزداد(ة) في <strong>${b.dateOfBirth}</strong>` : '';
      const cin = b.idNumber ? ` بطاقته(ا) الوطنية رقم <strong>${b.idNumber}</strong>` : '';
      const addr = b.address ? ` والساكن(ة) بـ <strong>${b.address}</strong>` : '';
      const share = b.share ? ` بنصيب (${b.share})` : '';
      return `${p} <strong>${b.name || '---'}</strong>${dob}${cin}${addr}${share}`;
    }).join(' و ');
    buyersClause = `اشترى كل من: ${buyersList} بالسوية بينهم أو حسب الحصص المذكورة أعلاه`;
  }

  // Sellers Clause (البائعون وسند ملكيتهم ووكالاتهم)
  const buyerTargetPronoun = buyers.length === 1 ? 'له' : buyers.length === 2 ? 'لهما' : 'لهم';
  let sellersClause = '';
  if (!sellers || sellers.length === 0) {
    sellersClause = `من البائعين ${buyerTargetPronoun} [بيانات البائعين]`;
  } else {
    const sellersList = sellers.map((s) => {
      const prefix = s.name?.startsWith('السيد') || s.name?.startsWith('السيدة') ? '' : (s.partyType === 'legal' ? 'الشركة المسماة' : 'السيد(ة)');
      const dob = s.dateOfBirth ? ` المزداد(ة) بتاريخ <strong>${s.dateOfBirth}</strong>` : '';
      const cin = s.idNumber ? ` بطاقته(ا) الوطنية رقم <strong>${s.idNumber}</strong>` : '';
      const addr = s.address ? ` والساكن(ة) بـ <strong>${s.address}</strong>` : '';
      
      // Proxy Representation
      let proxyPart = '';
      if (s.hasSpecialProxy === 'نعم' || s.proxyName) {
        const proxyDOB = s.proxyDOB ? ` المزداد في <strong>${s.proxyDOB}</strong>` : '';
        const proxyCIN = s.proxyNationalID ? ` بطاقته الوطنية رقم <strong>${s.proxyNationalID}</strong>` : '';
        const proxyDeed = `بوكالة خاصة مضمنة بسجل المختلفة رقم <strong>${s.proxyDeedBook || '08'}</strong> تحت عدد <strong>${s.proxyDeedNumber || '430'}</strong> صحيفة <strong>${s.proxyDeedPage || '860'}</strong> بتاريخ <strong>${s.proxyDeedDate || dateGregorian}</strong> توثيق <strong>${s.proxyDeedNotary || 'المملكة المغربية'}</strong>`;
        proxyPart = ` أصالة عن نفسه(ا) ونيابة عن <strong>${s.proxyName}</strong>${proxyDOB}${proxyCIN} بعد إدلائه(ا) ${proxyDeed}`;
      }

      // Legal Entity Representation
      let legalPart = '';
      if (s.partyType === 'legal' && s.legalRepresentativeName) {
        legalPart = ` في شخص ممثلها القانوني السيد <strong>${s.legalRepresentativeName}</strong> بصفته <strong>${s.legalRepresentativeCapacity || 'ممثلاً قانونياً'}</strong> بالسجل التجاري رقم <strong>${s.commercialRegister || '---'}</strong> و (ICE) رقم <strong>${s.ice || '---'}</strong>`;
      }

      return `${prefix} <strong>${s.name || '---'}</strong>${dob}${cin}${addr}${proxyPart}${legalPart}`;
    }).join(' و ');

    // Inheritance / Share origin
    let originPart = '';
    if (state.inheritanceDeeds && state.inheritanceDeeds.length > 0) {
      const inh = state.inheritanceDeeds[0];
      originPart = ` وذلك جميع حظوظهم المنجر لهم إرثاً في موروثهم المشاع بموجب رسم الإراثة الحامل تضمين دفتر التركات رقم <strong>${inh.book || '03'}</strong> صحيفة <strong>${inh.page || '487'}</strong> عدد <strong>${inh.number || '475'}</strong> بتاريخ <strong>${inh.date || '---'}</strong> توثيق <strong>${inh.notary || courtName}</strong>`;
    } else if (sellers[0]?.share) {
      originPart = ` وذلك جميع الحصة والقدر المفرز أو المشاع البالغ قدره <strong>${sellers.map(s => s.share || 'الكامل').join(' و ')}</strong>`;
    } else {
      originPart = ` وذلك جميع الحصة والملك التام المنجر لهم`;
    }

    sellersClause = `من البائعين ${buyerTargetPronoun} وهم: ${sellersList}${originPart}`;
  }

  // Property & Boundaries & Dimensions (المبيع وحدوده ومساحته وأصله)
  const propTypeLabel = prop.propertyName || 'الدار';
  const propLocation = prop.location ? `الواقعة بـ <strong>${prop.location}</strong>` : 'الكائنة بالعنوان المذكور أعلاه';
  const propComponents = titleDoc.notes 
    ? `المشتملة على <strong>${titleDoc.notes}</strong>`
    : (prop.propertyName ? `المشتملة على كافة المرافق والطبقات والمنافع التابعة لها` : 'المشتملة على كافة المرافق والمنافع');
  
  const bEast = prop.boundaries?.east || 'ملك الجوار';
  const bNorth = prop.boundaries?.north || 'ملك الجوار';
  const bWest = prop.boundaries?.west || 'ملك الجوار';
  const bSouth = prop.boundaries?.south || 'ملك الجوار';
  const boundariesText = `حدها شرقا بملك <strong>${bEast}</strong> وشمالا بملك <strong>${bNorth}</strong> وغربا بملك <strong>${bWest}</strong> وجنوبا بملك <strong>${bSouth}</strong>`;

  let dimensionText = '';
  if (prop.length_m && prop.width_m) {
    dimensionText = `مساحتها تقدر <strong>${prop.length_m}</strong> أمتار طولاً و <strong>${prop.width_m}</strong> أمتار عرضاً`;
  } else if (prop.area_m2) {
    dimensionText = `مساحتها تقدر بـ <strong>${prop.area_m2}</strong> متراً مربعاً`;
  } else {
    dimensionText = `بمساحتها وحدودها المعتبرة قانوناً`;
  }

  let titleDocText = '';
  if (titleDoc.bookReference || titleDoc.number) {
    titleDocText = `والمملوكة للبائعين بموجب رسم ${titleDoc.feeType || 'شراء'} الحامل تضمين دفتر الأملاك رقم <strong>${titleDoc.bookReference || '36'}</strong> صحيفة <strong>${titleDoc.page || '308'}</strong> عدد <strong>${titleDoc.number || '217'}</strong> بتاريخ <strong>${titleDoc.date || '---'}</strong> توثيق <strong>${courtName}</strong> وبما للعقار المذكور من المنافع والمرافق وكافة الحقوق الداخلة والخارجة`;
  } else {
    titleDocText = `والمملوكة للبائعين بملكية شرعية ثابتة وبما للعقار المذكور من المنافع والمرافق وكافة الحقوق الداخلة والخارجة`;
  }

  const propertyClause = `في جميع <strong>${propTypeLabel}</strong> ${propLocation} ${propComponents} ${boundariesText} ${dimensionText} ${titleDocText}`;

  // Legal Sale Terms, Price & Discharge (صيغة البيع الشرعية، الثمن، القبض، الإبراء والحلول)
  const priceNum = finance?.price || 0;
  const priceWords = finance?.priceInWords || convertNumberToArabicWords(priceNum) || '---';
  const paymentMethod = finance?.paymentMethod === 'نقد' 
    ? 'نقداً ومعاينة' 
    : finance?.paymentMethod === 'شيك' 
    ? 'بموجب شيك بنكي مسلّم' 
    : finance?.paymentMethod === 'تحويل' 
    ? 'بواسطة تحويل بنكي' 
    : 'اعترافا';

  const buyerDischargePronoun = buyers.length === 1 ? 'أبرأوه' : buyers.length === 2 ? 'أبرأوهما' : 'أبرأوهم';
  const buyerSubstVerb = buyers.length === 1 ? 'وتملك المشترى وحل' : buyers.length === 2 ? 'وتملكا المشترى وحلا' : 'وتملكوا المشترى وحلوا';
  const sellerRefPronoun = buyers.length <= 2 ? 'بائعيهما' : 'بائعيهم';

  const saleTermsClause = `اشتراء صحيحا تاما جائزا ناجزا لا شرط فيه ولا ثنيا ولا خيار بثمن قدره <strong>${priceWords}</strong> (<strong>${priceNum.toLocaleString()} درهم</strong>) قبضه البائعون <strong>${paymentMethod}</strong> و${buyerDischargePronoun} من جميع ذلك براءة تامة ${buyerSubstVerb} فيه محل ${sellerRefPronoun} أتم حلول على السنة في ذلك والمرجع بالدرك بعد النظر والرضا ومعرفة القدر كما يجب.`;

  // Tax Certificate (شهادة الإبراء الضريبي)
  const taxCert = certificates.find((c: any) => c.id === 'tax_cert' || c.type?.includes('ضريب')) || ({} as any);
  const taxNumber = taxCert.number || '1132/2024/356';
  const taxDate = taxCert.date || dateGregorian;
  const taxOffice = taxCert.issuedBy || `قباضة ${courtName}`;
  const taxId = (prop as any)?.taxId || (finance as any)?.taxId || '51702680';
  const taxClause = `بعدما أدلوا بشهادة أداء الضرائب والرسوم المثقل بها العقار الصادرة عن <strong>${taxOffice}</strong> رقم <strong>${taxNumber}</strong> معرف الضريبة على السكن رقم <strong>${taxId}</strong> بتاريخ <strong>${taxDate}</strong>`;

  // Reading & Registration & Closing (التلاوة والتسجيل والخاتمة)
  const draftDate = meta?.dateGregorian || dateGregorian;
  const regDate = postRegistration?.registrationDate || dateGregorian;
  const collectionOrder = postRegistration?.depositNumber || '624510/2024';

  const closingClause = `وتلي على الجميع بالأصالة والنيابة فأكدوه بتوقيعاتهم عليه عقبه بمذكرة الحفظ أعلاه ${taxClause} عرفوا قدره شهد به عليهم وهم بأتمه وحرر في <strong>${draftDate}</strong> وسجل إلكترونياً بتاريخ <strong>${regDate}</strong> أمر بالاستخلاص رقم <strong>${collectionOrder}</strong> عبد ربه وعبد ربه.`;

  // Assemble continuous justified paragraph
  const continuousParagraph = `
    الحمد لله وحده نحن <strong>${notary1}</strong> و <strong>${notary2}</strong> العدلان المنتصبان للإشهاد بدائرة محكمة الاستئناف بـ <strong>${appellateCourt}</strong> قسم التوثيق بالمحكمة الابتدائية بـ <strong>${courtName}</strong> تلقينا على الساعة <strong>${sessionTime}</strong> يوم <strong>${sessionDay}</strong> <strong>${dateHijriWords}</strong> للهجرة موافق <strong>${dateGregorianWords}</strong> (<strong>${dateHijri}</strong> / <strong>${dateGregorian}</strong>) الشهادة المدرجة بمذكرة حفظ العدل الأول رقم <strong>${memoNumber}</strong> صحيفة <strong>${memoPage}</strong> عدد <strong>${memoCount}</strong> نصها: 
    ${buyersClause} 
    ${sellersClause} 
    ${propertyClause} 
    ${saleTermsClause} 
    ${closingClause}
  `
    .replace(/[،,]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Return Full Styled Authentic Deed HTML
  return `
    <div style="font-family: 'Traditional Arabic', 'Amiri', 'Segoe UI', Tahoma, serif; direction: rtl; text-align: justify; line-height: 2.2; font-size: 17px; color: #1a202c; padding: 25px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      
      <!-- Top Official Moroccan Royal Header -->
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px;">
        <div style="font-size: 22px; font-weight: bold; color: #1e3a8a; margin-bottom: 4px;">المملكة المغربية</div>
        <div style="font-size: 18px; font-weight: bold; color: #334155; margin-bottom: 4px;">وزارة العدل</div>
        <div style="font-size: 17px; font-weight: bold; color: #1e293b;">المحكمة الابتدائية بـ ${courtName} - قسم قضاء التوثيق</div>
        <div style="margin-top: 10px; font-size: 14px; color: #475569; background: #f8fafc; padding: 6px 12px; border-radius: 6px; display: inline-block; border: 1px solid #e2e8f0;">
          رسم بيع عقار عدلي | مذكرة الحفظ رقم: <strong style="color: #0f172a;">${memoNumber}</strong> | صحيفة: <strong style="color: #0f172a;">${memoPage}</strong> | عدد: <strong style="color: #0f172a;">${memoCount}</strong> | بتاريخ: <strong style="color: #0f172a;">${dateGregorian}</strong>
        </div>
      </div>

      <!-- Quranic Ayah -->
      <div style="text-align: center; margin: 18px 0; padding: 12px 20px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #15803d;">
          قال تعالى: ﴿ وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا ﴾ - ﴿ وَأَشْهِدُوا إِذَا تَبَايَعْتُمْ ﴾
        </p>
        <span style="font-size: 13px; color: #166534; font-weight: 600;">صدق الله العظيم</span>
      </div>

      <!-- Unified Continuous Legal Paragraph (Classical Moroccan Justified Text) -->
      <div style="margin: 20px 0; padding: 22px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;">
        <p style="margin: 0; padding: 0; text-align: justify; text-justify: inter-word; line-height: 2.3; font-size: 18px; color: #0f172a; text-indent: 32px;">
          ${continuousParagraph}
        </p>
      </div>

      <!-- Signatures Box -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 25px; padding-top: 15px; border-top: 2px dashed #94a3b8; text-align: center;">
        <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 25px; font-size: 15px;">توقيع البائعين</div>
          <div style="font-size: 13px; color: #64748b;">${sellers.map(s => s.name).join(' - ') || 'البائعون'}</div>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 25px; font-size: 15px;">توقيع المشترين</div>
          <div style="font-size: 13px; color: #64748b;">${buyers.map(b => b.name).join(' - ') || 'المشترون'}</div>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 25px; font-size: 15px;">توقيع العدلين المنتصبين</div>
          <div style="font-size: 13px; color: #64748b;">${notary1} - ${notary2}</div>
        </div>
      </div>

      <!-- Judge Attestation Section -->
      <div style="margin-top: 20px; padding: 12px 16px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; text-align: center;">
        <div style="font-weight: bold; color: #1e3a8a; font-size: 16px; margin-bottom: 4px;">خطاب قاضي التوثيق</div>
        <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.6;">
          الحمد لله وحده، خطب على هذا الرسم طبق رسميته وثبوته بعد مراقبة الإجراءات القانونية واستيفاء الموجبات الشرعية بالمحكمة الابتدائية بـ ${courtName}.
        </p>
        <div style="margin-top: 12px; display: flex; justify-content: space-around; font-size: 13px; color: #71717a;">
          <span>بتاريخ: ..................................</span>
          <span>توقيع وخاتم القاضي المكلف بالتوثيق: ..................................</span>
        </div>
      </div>

    </div>
  `;
}

export function generateRasmHtml(state: FeesAgentState): string {
  const { documentType, sellers, buyers, finance, meta } = state;

  // Marriage and marriage-related deeds
  if ((MARRIAGE_DOCUMENT_TYPES as readonly string[]).includes(documentType)) {
    return generateMarriageRasmHtml(state);
  }

  // Real estate sale deeds (Screenshot 2 authentic Moroccan template)
  const isSaleDocument = (SALE_DOCUMENT_TYPES as readonly string[]).includes(documentType) || !documentType || documentType.includes('بيع') || documentType.includes('شراء');

  if (isSaleDocument) {
    return generateSaleRasmHtml(state);
  }

  const sellersBlock = sellers.length
    ? sellers
        .map(
          (seller, index) => `
          <div style="margin-bottom: 10px; border-right: 3px solid #3498db; padding-right: 15px; margin-top: 10px; direction: rtl; text-align: right;">
            <strong style="color: #2980b9;">البائع رقم ${index + 1}:</strong><br/>
            الاسم الكامل: ${seller.name}<br/>
            رقم البطاقة الوطنية: ${seller.idNumber}<br/>
            العنوان: ${seller.address || '---'}<br/>
            الحصة المبيعة: ${seller.share || '100%'}
          </div>
          `,
        )
        .join('')
    : '<p style="direction: rtl; text-align: right;">لم يتم تحديد بائعين</p>';

  const buyersBlock = buyers.length
    ? buyers
        .map(
          (buyer, index) => `
          <div style="margin-bottom: 10px; border-right: 3px solid #27ae60; padding-right: 15px; margin-top: 10px; direction: rtl; text-align: right;">
            <strong style="color: #219150;">المشتري رقم ${index + 1}:</strong><br/>
            الاسم الكامل: ${buyer.name}<br/>
            رقم البطاقة الوطنية: ${buyer.idNumber}<br/>
            العنوان: ${buyer.address || '---'}<br/>
            نصيب المشتري: ${buyer.share || '---'}
          </div>
          `,
        )
        .join('')
    : '<p style="direction: rtl; text-align: right;">لم يتم تحديد مشترين</p>';

  return `
    <div style="text-align: center; margin-bottom: 25px; direction: rtl;">
      <h2 style="margin: 0; color: #2c3e50; font-size: 26px; border-bottom: 2px solid #34495e; display: inline-block; padding-bottom: 10px;">
        عقد ${documentType || 'رسم عدلي'}
      </h2>
      <p style="margin: 10px 0; color: #7f8c8d;">رقم الملف المرجعي: ${meta.fileNumber}</p>
    </div>

    <div style="background: #fdfdfd; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; margin-bottom: 25px; line-height: 1.8; direction: rtl; text-align: right;">
      <p>الحمد لله وحده، وصلى الله وسلم على مولانا رسول الله وعلى آله وصحبه.</p>
      <p>بتاريخ <strong>${meta.dateGregorian}</strong> م، الموافق لـ <strong>${meta.dateHijri}</strong> هـ.</p>
      <p>بـ<strong>قسم التوثيق والعدول</strong> بالمحكمة الابتدائية بـ <strong>................</strong>.</p>
      <p>أمامنا نحن العدلين المنتصبين للإشهاد بنفس الدائرة، حضر الأطراف الآتية بياناتهم السطيرة أسفله:</p>
    </div>

    <h3 style="color: #2c3e50; border-right: 5px solid #2c3e50; padding-right: 15px; background: #f4f7f6; padding-top: 5px; padding-bottom: 5px; direction: rtl; text-align: right;">أولاً: الأطراف المتعاقدة</h3>
    
    <div style="display: block; margin-bottom: 25px; direction: rtl; text-align: right;">
      <div style="background: #ebf5fb; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
        <h4 style="margin-top: 0; color: #2980b9;">الطرف الأول (البائعون):</h4>
        ${sellersBlock}
      </div>
      <div style="background: #e9f7ef; padding: 15px; border-radius: 10px;">
        <h4 style="margin-top: 0; color: #219150;">الطرف الثاني (المشترون):</h4>
        ${buyersBlock}
      </div>
    </div>

    <h3 style="color: #2c3e50; border-right: 5px solid #2c3e50; padding-right: 15px; background: #f4f7f6; padding-top: 5px; padding-bottom: 5px; direction: rtl; text-align: right;">ثانياً: موضوع التعاقد</h3>
    <p style="text-indent: 30px; direction: rtl; text-align: right;">
      بموجب هذا العقد، اتفق الطرفان وهما بكامل قواهما العقلية وبأهلية معتبرة شرعاً وقانوناً، على ما يلي:
      يبيع الطرف الأول للطرف الثاني الذي قبل منه، كافة الملك المسمى <strong>................</strong>
      الكائن بـ <strong>................</strong> والمساحة التقريبية <strong>................</strong>.
    </p>

    <div style="background: #fff9c4; padding: 20px; border-radius: 10px; border: 1px solid #ffeb3b; margin: 25px 0; text-align: center; direction: rtl;">
      <p style="margin: 0; font-size: 20px; font-weight: bold; color: #856404;">
        الثمن الإجمالي للبيع: ${finance.price} درهم
      </p>
      <p style="margin: 5px 0; color: #856404;">(${finance.priceInWords})</p>
    </div>

    <p style="text-indent: 30px; direction: rtl; text-align: right;">
      وقد صرح الطرف الأول أنه توصل بكامل الثمن المذكور أعلاه من يد الطرف الثاني، وأبرأ ذمته منه إبراءً تاماً تاماً.
    </p>

    ${state.postRegistration?.registeredAtFinance ? `
      <div style="margin-top: 30px; border: 2px dashed #bdc3c7; padding: 15px; background: #f9f9f9; border-radius: 8px; direction: rtl; text-align: right;">
        <strong style="color: #7f8c8d;">[ مراجع التسجيل والتمبر الضريبي ]</strong><br/>
        سجل لدى إدارة الضرائب بـ: <strong>${state.postRegistration?.registeredAtFinance || '---'}</strong><br/>
        تحت رقم الإيداع: <strong>${state.postRegistration?.depositNumber || '---'}</strong><br/>
        بتاريخ: <strong>${state.postRegistration?.registrationDate || '---'}</strong>
      </div>
    ` : ''}

    <div style="margin-top: 50px; border-top: 1px solid #eee; pt-20; direction: rtl;">
      <p style="text-align: center; font-style: italic; color: #95a5a6;">هذا ما تم الاتفاق عليه بوعي تام وبالتزامات متبادلة.</p>
    </div>
  `;
}

export function generateDocumentDraft(state: FeesAgentState): string {
  if (!state) return '';
  const sellers = state.sellers || [];
  const buyers = state.buyers || [];
  const properties = state.properties || [];
  const finance = state.finance || { price: 0, priceInWords: '', paymentMethod: '', transferDetails: '', registeredWithTax: '' };
  const meta: DocumentMeta = state.meta || { fileNumber: '', dateGregorian: '', dateHijri: '', notaryPrimary: '', notarySecondary: '', additionalDocuments: [], court: '', hourInWords: '', dateGregorianInWords: '', dateHijriInWords: '' };
  const documentType = state.documentType || '';

  // Marriage and family deeds draft generator
  if ((MARRIAGE_DOCUMENT_TYPES as readonly string[]).includes(documentType)) {
    const husband = sellers[0] || ({} as any);
    const wife = buyers[0] || ({} as any);
    const md = state.marriageDetails || ({} as any);
    const d = state.dowry || ({} as any);

    const court = formatCourtName(md.courtName || meta.court) || 'تطوان';
    const courtSec = md.courtSection || 'قسم التوثيق وقضاء الأسرة';
    const regNum = md.registryNumber || '---';
    const regPage = md.registryPage || '---';
    const regCount = md.registryCount || '---';
    const regDate = md.registryDate || meta.dateGregorian || '---';
    const memoNum = md.memorandumNumber || '---';
    const memoCount = md.memorandumRecordNumber || '---';
    const memoPage = md.memorandumPage || '---';
    const authNum = md.authorizationNumber || '---';
    const authDate = md.authorizationDate || meta.dateGregorian || '---';

    const dowryAmt = md.dowryAmount || d.totalAmount || finance.price || 0;
    const dowryWords = md.dowryAmountInWords || d.totalAmountArabic || finance.priceInWords || '';

    const sessionTime = md.sessionTimeWords || meta.hourInWords || 'في الساعة المحددة قانونا';
    const sessionDate = md.sessionDateWords || meta.dateGregorianInWords || meta.dateGregorian || 'تاريخه';
    const husbandCert = husband.birthCertificateNumber ? `عقد ولادته رقم ${husband.birthCertificateNumber} لسنة ${husband.birthCertificateYear || '---'} المسلم من جماعة ${husband.birthCertificateCommune || husband.birthCertificateCity || '---'}` : '';
    const wifeCert = wife.birthCertificateNumber ? `عقد ولادتها رقم ${wife.birthCertificateNumber} لسنة ${wife.birthCertificateYear || '---'} المسلم من جماعة ${wife.birthCertificateCommune || wife.birthCertificateCity || '---'}` : '';
    const guardianInfo = wife.guardianName ? `وعقد زواجها وليها ${wife.guardianRelationship || 'وليها'} ${wife.guardianName} مهنته ${wife.guardianProfession || '---'} يسكن ${wife.guardianAddress || 'معها'} بطاقته الوطنية ${wife.guardianNationalID || '---'}` : 'وتولت الزوجة الرشيدة عقد زواجها بنفسها';
    const dowryInfo = `على صداق مبارك قدره ونهايته ${dowryWords} (${dowryAmt} درهم) ${md.isDowryReceived === 'كاملا' ? 'قبضت الزوجة جميعه قبضا تاما فأبرأته منه' : md.isDowryReceived === 'جزئي' ? `قبضت منه معجلا قدره ${md.dowryAdvance} درهم والباقي مؤخر كالئ قدره ${md.dowryDeferred} درهم` : 'كالئ في ذمة الزوج'}`;
    const condInfo = md.hasSpecialConditions === 'نعم' ? `واشترط ما نصه ${md.specialConditionsText}` : 'ولم يشترط الزوجان شروطا خاصة';
    const art49Info = md.hasAssetManagementAgreement === 'نعم' ? 'واتفقا على تدبير الأموال بموجب وثيقة مستقلة طبقا للمادة 49' : 'وأشعرا بمقتضيات المادة 49 واكتفيا بأحكام القواعد العامة';

    const narrative = `الحمد لله وبعد ${sessionTime} من ${sessionDate} تلقى العدلان أمنهما الله ${meta.notaryPrimary || 'العدل الأول'} و ${meta.notarySecondary || 'العدل الثاني'} المنتصبان للإشهاد بقسم التوثيق بالمحكمة الابتدائية بـ ${court} الشهادة المدرجة بمذكرة الحفظ للأول رقم ${memoNum} عدد ${memoCount} صفحة ${memoPage} نصها الحمد لله بعد إذن قاضي الأسرة المكلف بالزواج ملف رقم ${authNum} بتاريخ ${authDate} تزوج على بركة الله وحسن عونه وتوفيقه الجميل الزوج السيد ${husband.name || '---'} ولد بـ ${husband.placeOfBirth || '---'} بتاريخ ${husband.dateOfBirth || '---'} من والديه السيد ${husband.fatherName || '---'} والسيدة ${husband.motherName || '---'} ${husbandCert} مهنته ${husband.profession || '---'} يسكن بـ ${husband.address || '---'} بطاقته الوطنية للتعريف رقم ${husband.idNumber || '---'} وزوجته المباركة عليه البنت المصونة ${wife.name || '---'} ولدت بـ ${wife.placeOfBirth || '---'} بتاريخ ${wife.dateOfBirth || '---'} من والديها السيد ${wife.fatherName || '---'} والسيدة ${wife.motherName || '---'} ${wifeCert} مهنتها ${wife.profession || 'بدون مهنة'} تسكن بـ ${wife.address || '---'} بطاقتها الوطنية للتعريف رقم ${wife.idNumber || '---'} ${guardianInfo} ${dowryInfo} تزوجها على كتاب الله وسنة رسوله ﷺ واليمن والأمان سمع منهما شهيداه الإيجاب والقبول الصريحين ${condInfo} ${art49Info} وقبل الزوجان هذا الزواج وارتضياه وحفظ للعدل الأول وحرر الرسم بتاريخه عبد ربه تعالى.`
      .replace(/[،,]/g, '')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return narrative;
  }

  // Real estate sale deeds (Screenshot 2 authentic Moroccan template)
  const isSaleDocDraft = (SALE_DOCUMENT_TYPES as readonly string[]).includes(documentType) || !documentType || documentType.includes('بيع') || documentType.includes('شراء');

  if (isSaleDocDraft && documentType !== 'توكيل_رسمي') {
    const saleHtml = generateSaleRasmHtml(state);
    return stripHtmlToPlainText(saleHtml);
  }

  if (documentType === 'توكيل_رسمي') {
    const principalsBlock = buyers.map((p, i) => `
الموكل رقم ${i + 1}:
  الاسم الكامل: ${p.name || '---'}
  رقم البطاقة الوطنية: ${p.idNumber || '---'}
  العنوان: ${p.address || '---'}
  المهنة: ${p.profession || '---'}
  الحالة المدنية: ${p.maritalStatus || '---'}
  ${p.actingCapacity === 'legal_representative' ? `
  بصفته ممثلاً قانونياً لـ:
    اسم الشركة/الهيئة: ${p.legalEntityName || '---'}
    الشكل القانوني: ${p.legalForm || '---'}
    ICE: ${p.ice || '---'}
    السجل التجاري: ${p.commercialRegister || '---'}
    المقر الاجتماعي: ${p.headquartersAddress || '---'}
    صفة الممثل: ${p.legalRepresentativeCapacity || '---'}
  ` : '  (باسمه الشخصي)'}
`).join('\n');

    const agentsBlock = sellers.map((p, i) => `
الوكيل رقم ${i + 1}:
  الاسم الكامل: ${p.name || '---'}
  رقم البطاقة الوطنية: ${p.idNumber || '---'}
  العنوان: ${p.address || '---'}
  المهنة: ${p.profession || '---'}
`).join('\n');

    const scope = state.tawkilScope || {};
    let scopeText = '';

    if (scope.professionalJudicial) {
      const items = [];
      if (scope.professionalJudicial.courts) items.push('المحاكم');
      if (scope.professionalJudicial.lawyers) items.push('المحامين');
      if (scope.professionalJudicial.notaries) items.push('العدول والموثقين');
      if (scope.professionalJudicial.judicialCommissioners) items.push('المفوضين القضائيين');
      if (scope.professionalJudicial.experts) items.push('الخبراء');
      if (items.length) scopeText += `\nأ. التمثيل أمام الجهات المهنية والقضائية:\n  - ${items.join('\n  - ')}`;
    }

    if (scope.publicAdministration) {
      const items = [];
      if (scope.publicAdministration.publicAdmins) items.push('الإدارات العمومية');
      if (scope.publicAdministration.territorialCollectivities) items.push('الجماعات الترابية');
      if (scope.publicAdministration.externalServices) items.push('المصالح الخارجية');
      if (scope.publicAdministration.landConservation) items.push('المحافظة العقارية');
      if (scope.publicAdministration.taxAdmin) items.push('إدارة الضرائب');
      if (scope.publicAdministration.registrationAdmin) items.push('إدارة التسجيل');
      if (scope.publicAdministration.customsAdmin) items.push('إدارة الجمارك');
      if (items.length) scopeText += `\n\nب. التمثيل أمام الإدارات العمومية:\n  - ${items.join('\n  - ')}`;
    }

    if (scope.privateBodies) {
      const items = [];
      if (scope.privateBodies.banks) items.push('الأبناك');
      if (scope.privateBodies.insurance) items.push('شركات التأمين');
      if (scope.privateBodies.privateInstitutions) items.push('المؤسسات الخاصة');
      if (scope.privateBodies.companies) items.push('الشركات');
      if (items.length) scopeText += `\n\nج. الإدارات والهيئات الخاصة:\n  - ${items.join('\n  - ')}`;
    }

    if (scope.legalActions) {
      let actionType = 'وكالة عامة';
      if (scope.legalActions.type === 'special') actionType = 'وكالة خاصة';
      if (scope.legalActions.type === 'marriage') actionType = 'وكالة خاصة بالزواج';

      scopeText += `\n\nد. التصرفات القانونية: ${actionType}`;
      
      if (scope.legalActions.type === 'special' && scope.legalActions.specialDetails) {
        const d = scope.legalActions.specialDetails;
        scopeText += `\n  تفاصيل العقار: ${d.propertyType || ''} - ${d.propertyDefinition || ''}`;
        scopeText += `\n  الوضعية: ${d.propertyStatus === 'registered' ? 'محفظ' : 'غير محفظ'}`;
        if (d.propertyStatus === 'registered') {
           scopeText += `\n  الرسم العقاري: ${d.titleNumber || ''} / ${d.landRegistry || ''}`;
        } else {
           scopeText += `\n  سند التملك: ${d.ownershipDeed || ''} بتاريخ ${d.deedDate || ''}`;
        }
        
        const powers = [];
        if (d.salePowers?.setPrice) powers.push('تحديد الثمن');
        if (d.salePowers?.receivePrice) powers.push('قبض الثمن');
        if (d.salePowers?.discharge) powers.push('الإبراء');
        if (d.salePowers?.sign) powers.push('التوقيع');
        if (powers.length) scopeText += `\n  صلاحيات البيع: ${powers.join('، ')}`;
      }

      if (scope.legalActions.type === 'marriage' && scope.legalActions.marriageDetails) {
        const m = scope.legalActions.marriageDetails;
        const partnerLabel = m.partnerType === 'fiancee' ? 'المخطوبة' : 'الخاطب';
        scopeText += `\n  توكيل خاص بإبرام عقد الزواج مع ${partnerLabel}:`;
        scopeText += `\n  الاسم الكامل: ${m.partnerName || '---'}`;
        scopeText += `\n  الجنسية: ${m.partnerNationality || '---'}`;
        scopeText += `\n  اسم الأب: ${m.partnerFatherName || '---'}`;
        scopeText += `\n  اسم الأم: ${m.partnerMotherName || '---'}`;
        scopeText += `\n  تاريخ الازدياد: ${m.partnerDOB || '---'}`;
        scopeText += `\n  رقم البطاقة الوطنية: ${m.partnerIdNumber || '---'}`;
        scopeText += `\n  العنوان: ${m.partnerAddress || '---'}`;
        scopeText += `\n  المهنة: ${m.partnerProfession || '---'}`;
        scopeText += `\n  مقدار الصداق: ${m.dowryAmount || '---'} درهم (${m.dowryAmountArabic || '---'})`;
        if (m.passportNumber) {
          scopeText += `\n  جواز السفر: ${m.passportNumber} (صالح لغاية: ${m.passportValidUntil || '---'})`;
        }

        // Conditions
        if (m.hasConditionOnPartner) {
           scopeText += `\n  شرط على الطرف الآخر: ${m.conditionOnPartnerText || '---'}`;
        }
        if (m.acceptsConditionFromPartner) {
           scopeText += `\n  شرط مقبول من الطرف الآخر: ${m.conditionFromPartnerText || '---'}`;
        }

        // Capacity
        if (m.isFullyCompetent === false) {
           const reason = m.incompetenceReason === 'minor' ? 'قاصر' : 'ناقص الأهلية';
           scopeText += `\n  حالة الأهلية: ${reason} (يخضع للإجراءات القانونية اللازمة)`;
        } else {
           scopeText += `\n  حالة الأهلية: كامل الأهلية`;
        }

        // Absence
        if (m.absenceJustification) {
           scopeText += `\n  مبررات الغياب: ${m.absenceJustification}`;
        }

        scopeText += `\n\n  "لينوب ${m.partnerType === 'fiancee' ? 'عنها' : 'عنه'} ويقوم ${m.partnerType === 'fiancee' ? 'مقامها' : 'مقامه'} في عقد ${m.partnerType === 'fiancee' ? 'زواجها' : 'زواجه'} من ${m.partnerType === 'fiancee' ? 'السيد/الشاب' : 'السيدة/الآنسة'} المذكور(ة) أعلاه"`;
      }
    }

    if (scope.signing) {
      const items = [];
      if (scope.signing.signOnBehalf) items.push('التوقيع نيابة عنه');
      if (scope.signing.depositFiles) items.push('إيداع الملفات');
      if (scope.signing.withdrawDocs) items.push('سحب الوثائق');
      if (scope.signing.receiveCerts) items.push('استلام الشهادات');
      if (items.length) scopeText += `\n\nهـ. التوقيع واستلام الوثائق:\n  - ${items.join('\n  - ')}`;
    }

    if (scope.generalReserve) {
      scopeText += `\n\nو. بند عام احتياطي:\n  "والقيام بجميع ما تقتضيه هذه الوكالة عرفًا وقانونًا في حدود ما ذُكر أعلاه"`;
    }

    return `
==============================
نوع الوثيقة: ${documentType}
رقم الملف: ${meta.fileNumber || '---'}
التاريخ الميلادي: ${meta.dateGregorian || '---'}
التاريخ الهجري: ${meta.dateHijri || '---'}
العدول: ${meta.notaryPrimary || '---'} / ${meta.notarySecondary || '---'}
==============================

الموكلون:
${principalsBlock}

الوكلاء:
${agentsBlock}

كيفية ممارسة الوكالة: ${state.agencyMode === 'individual' ? 'منفرداً' : state.agencyMode === 'joint' ? 'مجتمعاً' : 'منفرداً ومجتمعاً'}

نطاق التوكيل:
${scopeText}
`;
  }

  const sellersBlock = sellers.length
    ? sellers
        .map(
          (seller, index) => `
البائع رقم ${index + 1}:
  الاسم الكامل: ${seller.name || '---'}
  اسم الأب: ${seller.fatherName || '---'}
  اسم الأم: ${seller.motherName || '---'}
  عنوان السكنى: ${seller.address || '---'}
  رقم البطاقة الوطنية: ${seller.idNumber || '---'}
  تاريخ إصدار البطاقة: ${seller.idIssueDate || '---'}
  ${seller.share ? `الحصة المبيعة: ${seller.share}` : ''}
`,
        )
        .join('\n')
    : 'لا يوجد بائعون محددون';

  const buyersBlock = buyers.length
    ? buyers
        .map(
          (buyer, index) => {
            const sharePercent = parseFloat(buyer.share?.replace('%', '') || '0') || (100 / Math.max(1, buyers.length));
            const shareValue = (((finance.price || 0) * sharePercent) / 100).toFixed(2);
            const shareText = buyer.share || `${sharePercent.toFixed(2)}%`;
            
            return `
المشتري رقم ${index + 1}:
  الاسم الكامل: ${buyer.name || '---'}
  اسم الأب: ${buyer.fatherName || '---'}
  اسم الأم: ${buyer.motherName || '---'}
  عنوان السكنى: ${buyer.address || '---'}
  رقم البطاقة الوطنية: ${buyer.idNumber || '---'}
  تاريخ إصدار البطاقة: ${buyer.idIssueDate || '---'}
  نصيب هذا المشتري: ${shareValue} درهم (${shareText})
`;
          }
        )
        .join('\n')
    : 'لا يوجد مشترون محددون';

  const propertiesBlock = properties && properties.length
    ? properties
        .map(
          (property, index) => `
العقار رقم ${index + 1}:
  نوع الملك: ${property.type || '---'}
  المساحة: ${property.area_m2 ?? '---'} متر مربع
  الطول: ${property.length_m ?? '---'} متر
  العرض: ${property.width_m ?? '---'} متر
  الإحداثيات الجغرافية: ${
    property.coordinates && property.coordinates.length > 0
      ? property.coordinates.map((c) => `(${c.lat}, ${c.lng})`).join(' - ')
      : '---'
  }
  الحدود:
    الشمال: ${property.boundaries?.north || '---'}
    الجنوب: ${property.boundaries?.south || '---'}
    الشرق: ${property.boundaries?.east || '---'}
    الغرب: ${property.boundaries?.west || '---'}
  المراجع:
    ${(property.titleDocuments || []).map((doc, i) => `
    سند رقم ${i + 1}:
      نوع الرسم: ${doc.feeType || '---'}
      ضمن بدفتر/ سجل البيانات: ${doc.bookReference || '---'}
      رقم: ${doc.number || '---'}
      حرف: ${doc.letter || '---'}
      صحيفة: ${doc.page || '---'}
      عدد: ${doc.count || '---'}
      بتاريخ: ${doc.date || '---'}
      موافق: ${doc.correspondingDate || '---'}
      ${doc.hasRegistrationReferences === 'نعم' ? `
      مراجع التسجيل:
        المسجل بمالية: ${doc.registeredAt || '---'}
        رقم الايداع: ${doc.depositNumber || '---'}
        بتاريخ: ${doc.depositDate || '---'}
      ` : ''}
      ${doc.hasNotes === 'نعم' ? `
      شروط وملاحظات:
        ${doc.notes || '---'}
      ` : ''}
    `).join('\n')}
`,
        )
        .join('\n')
    : 'لا توجد عقارات محددة';

  return `
==============================
نوع الوثيقة: ${documentType || '---'}
رقم الملف: ${meta.fileNumber || '---'}
التاريخ الميلادي: ${meta.dateGregorian || '---'}
التاريخ الهجري: ${meta.dateHijri || '---'}
العدول: ${meta.notaryPrimary || '---'} / ${meta.notarySecondary || '---'}
==============================

البائعون:
${sellersBlock}

المشترون:
${buyersBlock}

${documentType === 'حيازة' ? 'تفاصيل الحيازة' : 'تفاصيل الملكية'}:
${propertiesBlock}

تفاصيل الثمن:
  الثمن الإجمالي: ${finance.price || '---'} درهم
  الثمن بالحروف: ${finance.priceInWords || '---'}
  طريقة الأداء: ${finance.paymentMethod || '---'}
  تفاصيل التحويل: ${finance.transferDetails || '---'}
  حالة التسجيل الضريبي: ${finance.registeredWithTax || '---'}
  
  ${state.postRegistration?.registeredAtFinance ? `
  [ مراجع التسجيل والتمبر ]
  - المسجل بمالية: ${state.postRegistration?.registeredAtFinance || '---'}
  - رقم الايداع: ${state.postRegistration?.depositNumber || '---'}
  - بتاريخ: ${state.postRegistration?.registrationDate || '---'}
  ` : ''}

  توزيع الحصص:
  ${buyers.map(buyer => {
      const sharePercent = parseFloat(buyer.share?.replace('%', '') || '0') || (100 / Math.max(1, buyers.length));
      const shareValue = (((finance.price || 0) * sharePercent) / 100).toFixed(2);
      const shareText = buyer.share || `${sharePercent.toFixed(2)}%`;
      return `- ${buyer.name}: ${shareValue} درهم (${shareText})`;
  }).join('\n  ')}

التوقيعات:
  البائع ____________________
  العدل الأول ____________________
  العدل الثاني ____________________
`;
}
