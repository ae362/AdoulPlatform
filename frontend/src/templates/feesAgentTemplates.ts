import {
  MARRIAGE_DOCUMENT_TYPES,
  SALE_DOCUMENT_TYPES,
} from '../constants/feesAgentLocales';
import type {
  FeesAgentState,
  DocumentMeta,
  SalePersonPropertyDetails,
  SaleFinanceDetails,
} from '../types/feesAgentTypes';
import {
  convertGregorianToHijri,
  getArabicWeekdayName,
  convertGregorianDateToWords,
  convertHijriDateToWords,
  convertNumberToArabicWords,
  convertTimeToWords,
  formatCourtName,
} from '../utils/feesAgentUtils';
export { formatCourtName } from '../utils/feesAgentUtils';

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

export function generateRevocableReconciliationRasmHtml(state: FeesAgentState): string {
  const { sellers, buyers, meta, marriageClassification, marriageDetails } = state;
  const husband = sellers?.[0] || ({} as any);
  const wife = buyers?.[0] || ({} as any);
  const recon = marriageClassification?.reconciliationDetails || {};
  const md = marriageDetails || {};

  const courtName = formatCourtName(recon.divorceCourt || md.courtName || meta?.court) || 'المحكمة الابتدائية بشفشاون';
  const appellateCourt = formatCourtName((meta as any)?.appellateCourt) || 'تطوان';
  const notary1 = meta?.notaryPrimary || 'ذ. عبد الرحيم الإدريسي';
  const notary2 = meta?.notarySecondary || 'ذ. محمد الخياط';

  const dateGreg = meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const dateHijri = meta?.dateHijri || convertGregorianToHijri(dateGreg);
  const sessionDay = getArabicWeekdayName(dateGreg) || 'اليوم';

  const divorceRef = recon.divorceDeedNumber || '1234 / حرف ب / صفحة 56 / عدد 3';
  const divorceDate = recon.divorceDate || '12/04/2026';
  const divorceCourt = recon.divorceCourt || courtName;

  const husbandName = husband.name || 'محمد العلمي بن إبراهيم';
  const husbandCin = husband.idNumber || 'L459821';
  const husbandAddress = husband.address || 'حي العيون، زقاق الأندلس، رقم 14، شفشاون';

  const wifeName = wife.name || 'فاطمة الزهراء بنجلون بنت أحمد';
  const wifeCin = wife.idNumber || 'LF892341';
  const wifeAddress = wife.address || husbandAddress;

  const formulaText =
    md.specialConditionsText ||
    `تراجع المتفارقان، الزوج المذكور (${husbandName}) والزوجة المذكورة (${wifeName})، عن الطلاق الرجعي المضمن بموجب رسم الطلاق المسجل تحت مراجع (${divorceRef})، الصادر عن ${divorceCourt} بتاريخ ${divorceDate}، وذلك أثناء سريان العدة الشرعية والقانونية، رجعة تامة بما جاز له ذلك شرعاً وقانوناً وفقاً للمادتين 123 و124 من مدونة الأسرة.`;

  return `
    <div style="font-family: 'Traditional Arabic', 'Amiri', 'Segoe UI', Tahoma, serif; direction: rtl; text-align: justify; line-height: 2.2; font-size: 17px; color: #1a202c; padding: 25px; background: #ffffff; border: 1px solid #0d9488; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0d9488; padding-bottom: 15px;">
        <div style="font-size: 22px; font-weight: bold; color: #0f766e; margin-bottom: 4px;">المملكة المغربية — وزارة العدل</div>
        <div style="font-size: 17px; font-weight: bold; color: #1e293b;">دائرة محكمة الاستئناف بـ ${appellateCourt} - المحكمة الابتدائية بـ ${courtName} (قسم قضاء الأسرة)</div>
        <div style="margin-top: 10px; font-size: 14px; color: #0f766e; background: #ccfbf1; padding: 6px 14px; border-radius: 8px; display: inline-block; border: 1px solid #99f6e4; font-weight: bold;">
          🔄 رسم الرجعة (إرجاع بعد طلاق رجعي) — المادتان 123 و124 من مدونة الأسرة
        </div>
      </div>

      <!-- Ayah -->
      <div style="text-align: center; margin: 18px 0; padding: 12px 20px; background: #f0fdfa; border: 1px solid #5eead4; border-radius: 8px;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0f766e;">
          ﴿وَإِذَا طَلَّقْتُمُ النِّسَاءَ فَبَلَغْنَ أَجَلَهُنَّ فَأَمْسِكُوهُنَّ بِمَعْرُوفٍ أَوْ سَرِّحُوهُنَّ بِمَعْرُوفٍ﴾
        </p>
        <span style="font-size: 13px; color: #115e59;">[سورة البقرة: 231]</span>
      </div>

      <!-- Body -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #0f766e; font-size: 18px;">الحمدلة ومجلس الإشهاد:</strong>
          <span style="background: #dcfce7; color: #166534; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 12px; border: 1px solid #86efac;">🟢 واقعة الرجعة مثبتة بحضور الطرفين</span>
        </div>
        <p>
          الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وعلى آله وصحبه.
          في يوم ${sessionDay}، الموافق لـ <strong>${dateHijri}</strong> هجرية و <strong>${dateGreg}</strong> ميلادية،
          أمامنا نحن العدلين المنتصبين للإشهاد بدائرة ${courtName}،
          حضر الزوجان المذكوران أدناه بكامل أهليتهما الشرعية والقانونية للإشهاد على واقعة الرجعة.
        </p>
      </div>

      <div style="margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #0f766e; font-size: 18px;">هوية المتفارقين (المراجعين):</strong>
          <span style="background: #ccfbf1; color: #115e59; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 12px; border: 1px solid #99f6e4;">🟢 بيانات مسترجعة من رسم الطلاق</span>
        </div>
        <p>
          <strong>الطرف الأول (الزوج):</strong> السيد <strong>${husbandName}</strong>، الحامل لبطاقة التعريف الوطنية رقم <strong>${husbandCin}</strong>، الساكن بـ ${husbandAddress}.<br/>
          <strong>الطرف الثاني (الزوجة):</strong> السيدة <strong>${wifeName}</strong>، الحاملة لبطاقة التعريف الوطنية رقم <strong>${wifeCin}</strong>، الساكنة بـ ${wifeAddress}.
        </p>
      </div>

      <div style="margin-bottom: 20px; background: #f0fdfa; padding: 15px; border-radius: 10px; border: 1px solid #99f6e4;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #0f766e; font-size: 18px;">واقعة الرجعة («تراجع المتفارقان»):</strong>
          <span style="background: #dcfce7; color: #166534; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 12px; border: 1px solid #86efac;">🟢 بيانات متحقق منها</span>
        </div>
        <p style="font-weight: 500; color: #134e4a;">
          ${formulaText}
        </p>
      </div>

      <div style="margin-bottom: 20px;">
        <strong style="color: #0f766e; font-size: 18px;">الإحالة على السجلات وإشعار المحكمة:</strong>
        <p>
          وقد ثبت سريان العدة الشرعية وقت الإشهاد على الرجعة، وتطابقت كافة الشروط القانونية المنصوص عليها في مدونة الأسرة.
          ويحال هذا الرسم إلى كتابة الضبط بالمحكمة الابتدائية المختصة لتضمين بيانه بهامش رسم الطلاق الرجعي الأصلي طبقاً للمادة 124 من مدونة الأسرة.
        </p>
      </div>

      <!-- Signatures -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; text-align: center;">
        <div>
          <strong>توقيع الزوج المراجع</strong><br/><br/>
          <span>....................................</span>
        </div>
        <div>
          <strong>توقيع الزوجة المرجوعة</strong><br/><br/>
          <span>....................................</span>
        </div>
        <div>
          <strong>العدلان الشاهدان</strong><br/>
          <span>${notary1} &nbsp;&nbsp;&nbsp;&nbsp; ${notary2}</span>
        </div>
      </div>
    </div>
  `;
}

export function generateRenewMarriageAfterDivorceRasmHtml(state: FeesAgentState): string {
  const { sellers, buyers, meta, marriageClassification, marriageDetails } = state;
  const husband = sellers?.[0] || ({} as any);
  const wife = buyers?.[0] || ({} as any);
  const md = marriageDetails || ({} as any);
  const prevContract = marriageClassification?.previousContract || ({} as any);

  const courtName = formatCourtName(md.courtName || meta?.court || prevContract.courtName) || 'تطوان';
  const courtSection = md.courtSection || 'قسم التوثيق وقضاء الأسرة';
  const appellateCourt = formatCourtName((meta as any)?.appellateCourt) || 'تطوان';

  const notary1 = (meta as any)?.notary1Name || meta?.notaryPrimary || 'الأستاذ العدل الأول';
  const notary2 = (meta as any)?.notary2Name || meta?.notarySecondary || 'الأستاذ العدل الثاني';
  const _todayFormatted = new Date().toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' });

  const dowryAmount = md.dowryAmount || 50000;
  const dowryWords = md.dowryAmountInWords || convertNumberToArabicWords(dowryAmount);
  const dowryAdvance = md.dowryAdvance || 20000;
  const dowryAdvanceWords = md.dowryAdvanceInWords || convertNumberToArabicWords(dowryAdvance);
  const dowryDeferred = md.dowryDeferred || 30000;
  const dowryDeferredWords = md.dowryDeferredInWords || convertNumberToArabicWords(dowryDeferred);
  const dowryReceipt = md.isDowryReceived || 'كاملا';

  return `
    <div style="font-family: 'Amiri', 'Traditional Arabic', serif; direction: rtl; text-align: right; line-height: 1.9; color: #0f172a; padding: 24px; max-width: 820px; margin: auto;">
      <!-- Judicial Official Header -->
      <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 20px;">
        <div style="font-size: 17px; font-weight: bold; color: #1e3a8a;">المملكة المغربية</div>
        <div style="font-size: 15px; font-weight: bold; color: #334155;">وزارة العدل</div>
        <div style="font-size: 14px; color: #475569;">محكمة الاستئناف بـ ${appellateCourt} • المحكمة الابتدائية بـ ${courtName}</div>
        <div style="font-size: 13px; color: #64748b;">${courtSection}</div>
        <div style="font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 10px; background-color: #f1f5f9; padding: 6px 16px; border-radius: 8px; display: inline-block; border: 1px solid #cbd5e1;">
          عقد زواج جديد بين مطلقين بعد زوال الزوجية السابقة (تجديد عقد الزواج)
        </div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">
          إبرام عقد زواج جديد تام الأركان والشروط بمقتضى المادة 126 من القانون رقم 70.03 بمثابة مدونة الأسرة
        </div>
      </div>

      <!-- Basmalah -->
      <div style="text-align: center; margin: 16px 0; font-size: 17px; font-weight: bold; color: #1e3a8a;">
        بِسمِ اللَّهِ الرَّحمٰنِ الرَّحِيمِ والصَّلاةُ والسَّلامُ على رَسُولِ اللَّهِ وآلِهِ وَصَحبِهِ
      </div>

      <!-- Opening Clause -->
      <div style="background-color: #f8fafc; border-right: 4px solid #1e3a8a; padding: 12px 16px; margin-bottom: 18px; border-radius: 4px; font-size: 14px; border: 1px solid #e2e8f0; border-right: 4px solid #1e3a8a;">
        <strong>الحمد لله وحده:</strong> حضر بمجلس الإشهاد المعقود لدى العدلين المنتصبين للإشهاد بدائرة محكمة قضاء الأسرة بـ <strong>${courtName}</strong>، والموقعين أسفله، الطرفان المسميان بعده، وهما في كامل أهليتهما المعتبرة شرعاً وقانوناً، وتعاقدا على النكاح الشرعي الصحيح الجديد بينهما بعد انحلال العلاقة الزوجية السابقة بينهما بمقتضى رسم الطلاق المشار إلى مراجعه أدناه، وزوال الزوجية السابقة حالاً عملاً بالمادتين 125 و126 من مدونة الأسرة دون أن يكون مكملاً للثلاث.
      </div>

      <!-- Historical Deed Reference -->
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 16px; margin-bottom: 18px; border-radius: 8px; font-size: 13.5px;">
        <strong style="color: #1e3a8a;">مراجع رسم الطلاق السابق والسجل التاريخي:</strong><br/>
        رسم الطلاق المضمن بسجل الطلاق تحت: <strong>${prevContract.inclusionRef || 'عدد 3، صحيفة 56، حرف ب'}</strong>،
        بتاريخ: <strong>${prevContract.deedDate || '15/10/2025'}</strong>، الصادر عن: <strong>${prevContract.courtName || courtName}</strong>،
        وانقضت به العدة الشرعية وزالت الزوجية السابقة حالاً دون أي مانع شرعي من تجديد العقد بعقد وصداق جديدين طبقاً للمادة 126.
      </div>

      <!-- Husband Details -->
      <div style="margin-bottom: 16px; font-size: 14px;">
        <strong style="color: #1e3a8a; font-size: 15px;">الزوج في العقد الجديد:</strong>
        السيد <strong>${husband.name || 'محمد بن التهامي العلمي'}</strong>،
        مغربي الجنسية، المزداد بتاريخ <strong>${husband.birthDate || '12/04/1988'}</strong> بـ <strong>${husband.birthPlace || 'شفشاون'}</strong>،
        والده <strong>${husband.fatherName || 'التهامي'}</strong>، ووالدته <strong>${husband.motherName || 'فاطمة الزهراء'}</strong>،
        مهنته: <strong>${husband.profession || 'أستاذ التعليم الثانوي'}</strong>،
        الساكن بـ <strong>${husband.address || 'حي العيون، شفشاون'}</strong>،
        الحامل لبطاقة التعريف الوطنية رقم: <strong>${husband.idNumber || 'L458921'}</strong>،
        وحالته السابقة: مطلق من نفس الزوجة المذكورة بعده بموجب رسم الطلاق المسجل أعلاه وهو في حل من أي قيد نكاح يمنع هذا العقد.
      </div>

      <!-- Wife Details -->
      <div style="margin-bottom: 16px; font-size: 14px;">
        <strong style="color: #1e3a8a; font-size: 15px;">الزوجة في العقد الجديد:</strong>
        السيدة <strong>${wife.name || 'أمينة بنت عبد السلام العمراني'}</strong>،
        مغربية الجنسية، المزادة بتاريخ <strong>${wife.birthDate || '24/09/1992'}</strong> بـ <strong>${wife.birthPlace || 'تطوان'}</strong>،
        والدها <strong>${wife.fatherName || 'عبد السلام'}</strong>، ووالدتها <strong>${wife.motherName || 'زبيدة'}</strong>،
        مهنتها: <strong>${wife.profession || 'مهندسة معمارية'}</strong>،
        الساكنة بـ <strong>${wife.address || 'شارع الحسن الثاني، تطوان'}</strong>،
        الحاملة لبطاقة التعريف الوطنية رقم: <strong>${wife.idNumber || 'LC192837'}</strong>،
        وحالتها السابقة: مطلقة من نفس الزوج المذكور أعلاه بموجب رسم الطلاق أعلاه، وانقضت عدتها منه وزالت به الزوجية السابقة، وقد باشرت عقد زواجها بنفسها ومارست ولايتها على نفسها استناداً لأحكام المادتين 24 و 25 من مدونة الأسرة بصفتها راشدة كاملة الأهلية.
      </div>

      <!-- Dowry Details -->
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; margin-bottom: 18px; border-radius: 8px; font-size: 13.5px;">
        <strong style="color: #92400e; font-size: 14px;">الصداق والمقتضى المالي (المواد 13 و 27 و 67):</strong><br/>
        اتفق الطرفان على تسمية صداق شرعي قدره: <strong>${dowryAmount.toLocaleString('ar-MA')} درهم</strong> (<strong>${dowryWords}</strong>)،
        منه معجل قدره: <strong>${dowryAdvance.toLocaleString('ar-MA')} درهم</strong> (${dowryAdvanceWords})
        ${dowryReceipt === 'كاملا' ? 'قُبض عياناً بمجلس العقد واكتملت حيازته،' : dowryReceipt === 'اعترافا' ? 'اعترفت الزوجة بقبضه وحيازته التامة،' : 'بقي بذمة الزوج،'}
        وباقيه مؤجل قدره: <strong>${dowryDeferred.toLocaleString('ar-MA')} درهم</strong> (${dowryDeferredWords}) يستحق عند حلول أجله أو أقرب الأجلين (الوفاة أو الفراق).
      </div>

      <!-- Conditions and Article 49 -->
      <div style="margin-bottom: 16px; font-size: 13.5px;">
        <strong style="color: #1e3a8a;">الشروط الاتفاقية ونظام الأموال (المادتان 47 و 49):</strong><br/>
        ${md.specialConditionsText ? `اشترط الطرفان شروطاً اتفاقية ملزمة عملاً بالمادة 47 من مدونة الأسرة، وهي: <strong>${md.specialConditionsText}</strong>.` : 'لم يشترط أي من الطرفين على الآخر شرطاً خاصاً سوى ما يقتضيه عقد الزواج شرعاً وقانوناً.'}<br/>
        وقد أشعر العدلان الشاهدان الطرفين المتعاقدين بمقتضيات المادة 49 من مدونة الأسرة المتعلقة باستقلال الذمة المالية وجواز الاتفاق على تدبير واستثمار الأموال المكتسبة أثناء الزوجية في محرّر مستقل.
      </div>

      <!-- Offer and Acceptance -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; margin-bottom: 18px; border-radius: 8px; font-size: 13.5px;">
        <strong style="color: #1e3a8a;">الإيجاب والقبول (المادتان 10 و 11):</strong><br/>
        صدر الإيجاب من الزوج والقبول من الزوجة بصريح اللفظ في مجلس واحد، متطابقين، باتين غير معلقين على أجل أو شرط واقف أو فاسخ، وتراضيا على المعاشرة بالمعروف وإحصان كل منهما للآخر طبقاً لأحكام الشريعة الإسلامية ومدونة الأسرة.
      </div>

      <!-- Legal Conclusion & Date -->
      <div style="font-size: 13px; color: #334155; margin-bottom: 24px;">
        وقد تم إيداع ملف مستندات الزواج كاملاً بكتابة ضبط قسم قضاء الأسرة طبقاً للمادة 65، وبما ذُكر كُتب هذا الرسم وتُلي على الطرفين فصادقا عليه وأُشهد عليهما به في التاريخ المبين أدناه.
      </div>

      <!-- Signature Section -->
      <div style="display: flex; justify-content: space-between; text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #cbd5e1; font-size: 13px;">
        <div>
          <strong>توقيع الزوج</strong><br/><br/>
          <span>....................................</span>
        </div>
        <div>
          <strong>توقيع الزوجة</strong><br/><br/>
          <span>....................................</span>
        </div>
        <div>
          <strong>العدلان الشاهدان</strong><br/>
          <span>${notary1} &nbsp;&nbsp;&nbsp;&nbsp; ${notary2}</span>
        </div>
      </div>
    </div>
  `;
}

export function generateMarriageRasmHtml(state: FeesAgentState): string {
  if (state.marriageClassification?.primaryType === 'revocable_reconciliation') {
    return generateRevocableReconciliationRasmHtml(state);
  }
  if (state.marriageClassification?.primaryType === 'contract_renewal') {
    return generateRenewMarriageAfterDivorceRasmHtml(state);
  }

  const { sellers, buyers, witnesses, meta, marriageDetails, finance, dowry } = state;
  const husband = sellers?.[0] || ({} as any);
  const wife = buyers?.[0] || ({} as any);
  const md = marriageDetails || ({} as any);
  const d = dowry || ({} as any);

  const courtName = formatCourtName(md.courtName || meta?.court || state.preReceptionVerification?.primaryCourt) || 'تطوان';
  const courtSection = md.courtSection || 'قسم التوثيق وقضاء الأسرة';
  const appellateCourt = formatCourtName((meta as any)?.appellateCourt || (state.preReceptionVerification as any)?.appellateCourt) || 'تطوان';
  const notary1 = meta?.notaryPrimary || state.preReceptionVerification?.notary1Name || 'الحسن النوادرى';
  const notary2 = meta?.notarySecondary || state.preReceptionVerification?.notary2Name || 'محمد الخياط';

  const regBook = md.registryBookType || 'كناش الأنكحة';
  const regNum = md.registryNumber || meta?.registryNumber || state.preReceptionVerification?.registryRecord?.number || '---';
  const regPage = md.registryPage || meta?.registryPage || state.preReceptionVerification?.registryRecord?.page || '---';
  const regCount = md.registryCount || meta?.registryCount || state.preReceptionVerification?.registryRecord?.count || '---';
  const regDate = md.registryDate || meta?.receptionDate || state.preReceptionVerification?.registryRecord?.receptionDate || meta?.dateGregorian || '---';

  const memoNum = md.memorandumNumber || md.registryNumber || meta?.registryNumber || state.preReceptionVerification?.registryRecord?.number || '---';
  const memoCount = md.memorandumRecordNumber || md.registryCount || meta?.registryCount || state.preReceptionVerification?.registryRecord?.count || '---';
  const memoPage = md.memorandumPage || md.registryPage || meta?.registryPage || state.preReceptionVerification?.registryRecord?.page || '---';

  const authNum = md.authorizationNumber || (state.preReceptionVerification as any)?.marriageAuthorizationNumber || (meta as any)?.marriageAuthorizationNumber || '---';
  const authDate = md.authorizationDate || (state.preReceptionVerification as any)?.marriageAuthorizationDate || meta?.dateGregorian || '---';
  const authCourt = formatCourtName(md.authorizationCourt || md.courtName || meta?.court || state.preReceptionVerification?.primaryCourt) || courtName;

  const dowryAmt = md.dowryAmount || d?.totalAmount || finance?.price || 0;
  const dowryWords = md.dowryAmountInWords || d?.totalAmountArabic || finance?.priceInWords || (dowryAmt ? convertNumberToArabicWords(dowryAmt) : '---');

  const dowryPayMethod = md.dowryPaymentMethod || d?.paymentMethod;
  const dowryPayMethodText = dowryPayMethod === 'عيانا'
    ? 'عيانا بمحضر الشاهدين العدلين'
    : dowryPayMethod === 'معاينة'
    ? 'معاينة'
    : 'اعترافا وتصديقا منها';

  let dowryRecStatus = '';
  if (md.isDowryReceived === 'كاملا' || d?.isReceived === 'كاملا') {
    dowryRecStatus = `قبضت الزوجة جميعه قبضا تاما فأبرأته منه براءة تامة (${dowryPayMethodText})`;
  } else if (md.isDowryReceived === 'جزئي' || d?.isReceived === 'جزئي') {
    const adv = md.dowryAdvance || d?.advance || 0;
    const advWords = md.dowryAdvanceInWords || d?.advanceArabic || (adv ? convertNumberToArabicWords(adv) : '---');
    const def = md.dowryDeferred || d?.deferred || 0;
    const defWords = md.dowryDeferredInWords || d?.deferredArabic || (def ? convertNumberToArabicWords(def) : '---');
    dowryRecStatus = `قبضت منه معجلا قدره <strong>${adv.toLocaleString()} درهم</strong> (<strong>${advWords}</strong>) (${dowryPayMethodText}) والباقي مؤخر كالئ في ذمته قدره <strong>${def.toLocaleString()} درهم</strong> (<strong>${defWords}</strong>) يحل بأقرب الأجلين (الوفاة أو الطلاق)`;
  } else {
    dowryRecStatus = 'صداقا مؤخرا كالئا في ذمة الزوج يحل بأقرب الأجلين (الوفاة أو الطلاق)';
  }

  const otherDowryClause = md.hasOtherDowryItems === 'نعم' && Array.isArray(md.otherDowryItems) && md.otherDowryItems.length > 0
    ? `، بالإضافة إلى الصداق العيني المتفق عليه المتمثل في: <strong>${md.otherDowryItems.join('، ')}</strong>`
    : '';

  const dateGreg = meta?.dateGregorian || state.preReceptionVerification?.receptionDate || new Date().toISOString().split('T')[0];
  const dateHijri = meta?.dateHijri || md.hijriDate || convertGregorianToHijri(dateGreg);
  const sessionDay = getArabicWeekdayName(dateGreg) || 'اليوم';
  const sessionDateGregWords = md.sessionDateWords || meta?.dateGregorianInWords || convertGregorianDateToWords(dateGreg);
  const sessionDateHijriWords = meta?.dateHijriInWords || convertHijriDateToWords(dateGreg);

  let sessionTime = md.sessionTimeWords || meta?.hourInWords;
  if (!sessionTime) {
    if (meta?.time && meta.time.includes(':')) {
      const [h, m] = meta.time.split(':').map(Number);
      if (!isNaN(h)) {
        const dObj = new Date();
        dObj.setHours(h, m || 0, 0, 0);
        sessionTime = convertTimeToWords(dObj);
      }
    }
  }
  if (!sessionTime) {
    sessionTime = 'على الساعة الحادية عشرة صباحا';
  }

  // Husband
  const husbandBirthCert = husband.birthCertificateNumber
    ? `عقد ولادته رقم <strong>${husband.birthCertificateNumber}</strong> لسنة <strong>${husband.birthCertificateYear || '---'}</strong> جماعة/دائرة <strong>${husband.birthCertificateCommune || husband.birthCertificateCity || '---'}</strong>${husband.birthCertificateDate ? ` المؤرخ في <strong>${husband.birthCertificateDate}</strong>` : ''}${husband.birthCertificateIssuedBy ? ` المسلم من <strong>${husband.birthCertificateIssuedBy}</strong>` : ''}${husband.birthCertificateCountry ? ` بدولة <strong>${husband.birthCertificateCountry}</strong>` : ''}`
    : '';
  const husbandIdClause = husband.idNumber
    ? `الحامل للبطاقة الوطنية للتعريف رقم <strong>${husband.idNumber}</strong>${(husband.idIssueDate || husband.idExpiryDate) ? ` صالحة إلى غاية <strong>${husband.idIssueDate || husband.idExpiryDate}</strong>` : ''}`
    : husband.passportNumber
    ? `الحامل لجواز سفر رقم <strong>${husband.passportNumber}</strong>${husband.passportIssuedBy ? ` الصادر عن <strong>${husband.passportIssuedBy}</strong>` : ''}${husband.passportValidUntil ? ` صالح إلى <strong>${husband.passportValidUntil}</strong>` : ''}`
    : '';
  const husbandNatClause = husband.nationality ? `جنسيته <strong>${husband.nationality}</strong>` : '';
  const husbandDivorceDetails = husband.maritalStatus === 'مطلق'
    ? (husband.divorceSource === 'حكم' || husband.divorceCourt
        ? ` بموجب حكم طلاق صادر عن <strong>${husband.divorceCourt || 'المحكمة'}</strong> بتاريخ <strong>${husband.divorceJudgmentDate || husband.divorceDeedDate || '---'}</strong>${husband.divorceExecutiveFormula ? ` مذيل بالصيغة التنفيذية بتاريخ <strong>${husband.divorceExecutiveDate || '---'}</strong>` : ''}${husband.divorceCountry ? ` بدولة <strong>${husband.divorceCountry}</strong>` : ''}`
        : (husband.divorceDeedNumber ? ` بموجب رسم طلاق عدد <strong>${husband.divorceDeedNumber}</strong>${husband.divorceDeedBook ? ` كناش <strong>${husband.divorceDeedBook}</strong>` : ''}${husband.divorceDeedPage ? ` صحيفة <strong>${husband.divorceDeedPage}</strong>` : ''} بتاريخ <strong>${husband.divorceDeedDate || '---'}</strong>${husband.divorceDeedNotary ? ` توثيق <strong>${husband.divorceDeedNotary}</strong>` : ''}` : ''))
    : '';
  const husbandMaritalStatusClause = husband.maritalStatus
    ? `حالته العائلية <strong>${husband.maritalStatus === 'اعزب' ? 'أعزب' : husband.maritalStatus === 'مطلق' ? 'مطلق' : husband.maritalStatus === 'ارمل' ? 'أرمل' : husband.maritalStatus}</strong>${husbandDivorceDetails}`
    : '';
  const husbandAdminCert = husband.engagementCertificateNumber
    ? `وحسب الشهادة الإدارية للزواج رقم <strong>${husband.engagementCertificateNumber}</strong>${husband.engagementCertificateDate ? ` بتاريخ <strong>${husband.engagementCertificateDate}</strong>` : ''}${husband.engagementCertificateCommune || husband.engagementCertificateCity ? ` الصادرة عن جماعة <strong>${husband.engagementCertificateCommune || husband.engagementCertificateCity}</strong>` : ''}`
    : '';
  const husbandMedCert = husband.medicalCertificateNumber
    ? `الشهادة الطبية لما قبل الزواج رقم <strong>${husband.medicalCertificateNumber}</strong>${husband.medicalCertificateDate ? ` بتاريخ <strong>${husband.medicalCertificateDate}</strong>` : ''}${husband.medicalCertificateIssuedBy ? ` المسلمة من <strong>${husband.medicalCertificateIssuedBy}</strong>` : ''}${husband.medicalCertificateCity ? ` بـ <strong>${husband.medicalCertificateCity}</strong>` : ''}`
    : '';
  const husbandMinorClause = husband.underagePermissionNumber
    ? `المأذون بزواجه دون سن الرشد بمقتضى مقرر قاضي الأسرة رقم <strong>${husband.underagePermissionNumber}</strong> بتاريخ <strong>${husband.underagePermissionDate || '---'}</strong> بالمحكمة الابتدائية بـ <strong>${husband.underagePermissionCourt || courtName}</strong>`
    : '';
  const husbandProxyClause = husband.hasSpecialProxy === 'نعم' && husband.proxyName
    ? `وناب عنه بوكالة خاصة السيد <strong>${husband.proxyName}</strong>${husband.proxyFatherName ? ` بن <strong>${husband.proxyFatherName}</strong>` : ''}${husband.proxyDOB ? ` المزداد بتاريخ <strong>${husband.proxyDOB}</strong>` : ''}${husband.proxyAddress ? ` الساكن بـ <strong>${husband.proxyAddress}</strong>` : ''} الحامل لـ ب.ت.و رقم <strong>${husband.proxyNationalID || '---'}</strong> بموجب رسم توكيل عدد <strong>${husband.proxyDeedNumber || '---'}</strong>${husband.proxyDeedBook ? ` كناش <strong>${husband.proxyDeedBook}</strong>` : ''}${husband.proxyDeedPage ? ` صحيفة <strong>${husband.proxyDeedPage}</strong>` : ''} وتاريخ <strong>${husband.proxyDeedDate || '---'}</strong>${husband.proxyDeedNotary ? ` توثيق <strong>${husband.proxyDeedNotary}</strong>` : ''}`
    : '';
  const husbandForeignExtra = [
    husband.residenceCountry ? `المقيم بـ <strong>${husband.residenceCountry}</strong>` : '',
    husband.nationalityCertificateIssuedBy ? `شهادة الجنسية المسلمة من <strong>${husband.nationalityCertificateIssuedBy}</strong>` : '',
    husband.capacityCertificateIssuedBy ? `شهادة الأهلية للزواج الصادرة عن <strong>${husband.capacityCertificateIssuedBy}</strong> بتاريخ <strong>${husband.capacityCertificateDate || '---'}</strong>` : '',
    husband.criminalRecordBirthplaceNumber ? `السجل العدلي لبلد المنشأ رقم <strong>${husband.criminalRecordBirthplaceNumber}</strong> بتاريخ <strong>${husband.criminalRecordBirthplaceDate || '---'}</strong>` : '',
    husband.centralCriminalRecordNumber ? `السجل العدلي المركزي رقم <strong>${husband.centralCriminalRecordNumber}</strong> بتاريخ <strong>${husband.centralCriminalRecordDate || '---'}</strong>` : '',
  ].filter(Boolean).join('، ');

  // Wife
  const wifeBirthCert = wife.birthCertificateNumber
    ? `عقد ولادتها رقم <strong>${wife.birthCertificateNumber}</strong> لسنة <strong>${wife.birthCertificateYear || '---'}</strong> جماعة/دائرة <strong>${wife.birthCertificateCommune || wife.birthCertificateCity || '---'}</strong>${wife.birthCertificateDate ? ` المؤرخ في <strong>${wife.birthCertificateDate}</strong>` : ''}${wife.birthCertificateIssuedBy ? ` المسلم من <strong>${wife.birthCertificateIssuedBy}</strong>` : ''}${wife.birthCertificateCountry ? ` بدولة <strong>${wife.birthCertificateCountry}</strong>` : ''}`
    : '';
  const wifeIdClause = wife.idNumber
    ? `الحاملة للبطاقة الوطنية للتعريف رقم <strong>${wife.idNumber}</strong>${(wife.idIssueDate || wife.idExpiryDate) ? ` صالحة إلى غاية <strong>${wife.idIssueDate || wife.idExpiryDate}</strong>` : ''}`
    : wife.passportNumber
    ? `الحاملة لجواز سفر رقم <strong>${wife.passportNumber}</strong>${wife.passportIssuedBy ? ` الصادر عن <strong>${wife.passportIssuedBy}</strong>` : ''}${wife.passportValidUntil ? ` صالح إلى <strong>${wife.passportValidUntil}</strong>` : ''}`
    : '';
  const wifeNatClause = wife.nationality ? `جنسيتها <strong>${wife.nationality}</strong>` : '';
  const wifeDivorceDetails = wife.maritalStatus === 'مطلق'
    ? (wife.divorceSource === 'حكم' || wife.divorceCourt
        ? ` بموجب حكم طلاق صادر عن <strong>${wife.divorceCourt || 'المحكمة'}</strong> بتاريخ <strong>${wife.divorceJudgmentDate || wife.divorceDeedDate || '---'}</strong>${wife.divorceExecutiveFormula ? ` مذيل بالصيغة التنفيذية بتاريخ <strong>${wife.divorceExecutiveDate || '---'}</strong>` : ''}${wife.divorceCountry ? ` بدولة <strong>${wife.divorceCountry}</strong>` : ''}`
        : (wife.divorceDeedNumber ? ` بموجب رسم طلاق عدد <strong>${wife.divorceDeedNumber}</strong>${wife.divorceDeedBook ? ` كناش <strong>${wife.divorceDeedBook}</strong>` : ''}${wife.divorceDeedPage ? ` صحيفة <strong>${wife.divorceDeedPage}</strong>` : ''} بتاريخ <strong>${wife.divorceDeedDate || '---'}</strong>${wife.divorceDeedNotary ? ` توثيق <strong>${wife.divorceDeedNotary}</strong>` : ''}` : ''))
    : '';
  const wifeMaritalStatusClause = wife.maritalStatus
    ? `حالتها العائلية <strong>${wife.maritalStatus === 'اعزب' ? 'بكر' : wife.maritalStatus === 'مطلق' ? 'مطلقة' : wife.maritalStatus === 'ارمل' ? 'أرملة' : wife.maritalStatus}</strong>${wifeDivorceDetails}`
    : '';
  const wifeAdminCert = wife.engagementCertificateNumber
    ? `وحسب الشهادة الإدارية للزواج رقم <strong>${wife.engagementCertificateNumber}</strong>${wife.engagementCertificateDate ? ` بتاريخ <strong>${wife.engagementCertificateDate}</strong>` : ''}${wife.engagementCertificateCommune || wife.engagementCertificateCity ? ` الصادرة عن جماعة <strong>${wife.engagementCertificateCommune || wife.engagementCertificateCity}</strong>` : ''}`
    : '';
  const wifeMedCert = wife.medicalCertificateNumber
    ? `الشهادة الطبية لما قبل الزواج رقم <strong>${wife.medicalCertificateNumber}</strong>${wife.medicalCertificateDate ? ` بتاريخ <strong>${wife.medicalCertificateDate}</strong>` : ''}${wife.medicalCertificateIssuedBy ? ` المسلمة من <strong>${wife.medicalCertificateIssuedBy}</strong>` : ''}${wife.medicalCertificateCity ? ` بـ <strong>${wife.medicalCertificateCity}</strong>` : ''}`
    : '';
  const wifeMinorClause = wife.underagePermissionNumber
    ? `المأذون بزواجها دون سن الرشد بمقتضى مقرر قاضي الأسرة رقم <strong>${wife.underagePermissionNumber}</strong> بتاريخ <strong>${wife.underagePermissionDate || '---'}</strong> بالمحكمة الابتدائية بـ <strong>${wife.underagePermissionCourt || courtName}</strong>`
    : '';
  const wifeProxyClause = wife.hasSpecialProxy === 'نعم' && wife.proxyName
    ? `ونابت عنها بوكالة خاصة السيدة/السيد <strong>${wife.proxyName}</strong>${wife.proxyFatherName ? ` بن(ت) <strong>${wife.proxyFatherName}</strong>` : ''}${wife.proxyDOB ? ` المزداد(ة) بتاريخ <strong>${wife.proxyDOB}</strong>` : ''}${wife.proxyAddress ? ` الساكن(ة) بـ <strong>${wife.proxyAddress}</strong>` : ''} الحامل(ة) لـ ب.ت.و رقم <strong>${wife.proxyNationalID || '---'}</strong> بموجب رسم توكيل عدد <strong>${wife.proxyDeedNumber || '---'}</strong>${wife.proxyDeedBook ? ` كناش <strong>${wife.proxyDeedBook}</strong>` : ''}${wife.proxyDeedPage ? ` صحيفة <strong>${wife.proxyDeedPage}</strong>` : ''} وتاريخ <strong>${wife.proxyDeedDate || '---'}</strong>${wife.proxyDeedNotary ? ` توثيق <strong>${wife.proxyDeedNotary}</strong>` : ''}`
    : '';
  const wifeForeignExtra = [
    wife.residenceCountry ? `المقيمة بـ <strong>${wife.residenceCountry}</strong>` : '',
    wife.nationalityCertificateIssuedBy ? `شهادة الجنسية المسلمة من <strong>${wife.nationalityCertificateIssuedBy}</strong>` : '',
    wife.capacityCertificateIssuedBy ? `شهادة الأهلية للزواج الصادرة عن <strong>${wife.capacityCertificateIssuedBy}</strong> بتاريخ <strong>${wife.capacityCertificateDate || '---'}</strong>` : '',
    wife.criminalRecordBirthplaceNumber ? `السجل العدلي لبلد المنشأ رقم <strong>${wife.criminalRecordBirthplaceNumber}</strong> بتاريخ <strong>${wife.criminalRecordBirthplaceDate || '---'}</strong>` : '',
    wife.centralCriminalRecordNumber ? `السجل العدلي المركزي رقم <strong>${wife.centralCriminalRecordNumber}</strong> بتاريخ <strong>${wife.centralCriminalRecordDate || '---'}</strong>` : '',
  ].filter(Boolean).join('، ');

  const guardianClause = (wife.contractsWithoutGuardian === 'لا' || (!wife.contractsWithoutGuardian && wife.guardianName)) && wife.guardianName
    ? `وعقد زواجها وليها ${wife.guardianRelationship || 'وليها'}${wife.guardianRelationshipCustom ? ` (${wife.guardianRelationshipCustom})` : ''} السيد <strong>${wife.guardianName}</strong>${wife.guardianDOB ? ` المزداد بتاريخ <strong>${wife.guardianDOB}</strong>` : ''}${wife.guardianFatherName ? ` ابن <strong>${wife.guardianFatherName}</strong>` : ''} مهنته <strong>${wife.guardianProfession || '---'}</strong> الساكن بـ <strong>${wife.guardianAddress || 'معها'}</strong> الحامل لبطاقة التعريف الوطنية رقم <strong>${wife.guardianNationalID || '---'}</strong>`
    : 'وتولت الزوجة الرشيدة عقد زواجها بنفسها طبقا لمقتضيات المادة 25 من مدونة الأسرة';

  const conversionCertClause = md.mixedMarriageForeignParty === 'husband' && md.husbandConvertedToIslam === 'yes' && md.conversionCertificate?.number
    ? ` وثبت إسلام الزوج بمقتضى وثيقة اعتناق الإسلام المضمنة بكناش <strong>${md.conversionCertificate.book || '---'}</strong> صحيفة <strong>${md.conversionCertificate.page || '---'}</strong> عدد <strong>${md.conversionCertificate.count || '---'}</strong> رقم <strong>${md.conversionCertificate.number || '---'}</strong> بتاريخ <strong>${md.conversionCertificate.date || '---'}</strong> توثيق <strong>${md.conversionCertificate.notary || '---'}</strong>،`
    : '';

  const condClause = md.hasSpecialConditions === 'نعم' && md.specialConditionsText
    ? `واشترط${md.specialConditionsOwner ? ` (${md.specialConditionsOwner})` : ''} في العقد ما نصه: « <strong>${md.specialConditionsText}</strong> » طبقا للمادتين 47 و 48 من مدونة الأسرة`
    : 'ولم يشترط الزوجان أي شرط خاص في هذا العقد طبقا لأحكام المادتين 47 و 48 من مدونة الأسرة';

  const art49Clause = md.hasAssetManagementAgreement === 'نعم'
    ? 'واتفق الزوجان على تدبير الأموال المكتسبة أثناء قيام الزوجية بموجب وثيقة مستقلة طبقا للمادة 49 من مدونة الأسرة'
    : 'وأشعرا بمقتضيات المادة 49 من مدونة الأسرة الخاصة بتدبير الأموال المكتسبة واكتفيا بأحكام القواعد العامة';

  const witnessesList = witnesses && witnesses.length > 0
    ? witnesses.map((w: any) => `السيد <strong>${w.name}</strong> بطاقته الوطنية رقم <strong>${w.idNumber || '---'}</strong>`).join(' و ')
    : 'شاهدين عدلين';

  const husbandFatherInfo = husband.fatherProfession ? `${husband.fatherName || '---'} (مهنته ${husband.fatherProfession})` : (husband.fatherName || '---');
  const husbandMotherInfo = husband.motherProfession ? `${husband.motherName || '---'} (مهنتها ${husband.motherProfession})` : (husband.motherName || '---');

  const husbandParts = [
    `السيد <strong>${husband.name || '---'}</strong>${husband.nameLatin ? ` (${husband.nameLatin})` : ''}`,
    `المزداد بـ <strong>${husband.placeOfBirth || '---'}</strong> بتاريخ <strong>${husband.dateOfBirth || '---'}</strong>`,
    `من والديه السيد <strong>${husbandFatherInfo}</strong> والسيدة <strong>${husbandMotherInfo}</strong>`,
    husbandBirthCert,
    `مهنته <strong>${husband.profession || '---'}</strong>`,
    `والساكن بـ <strong>${husband.address || '---'}</strong>`,
    husbandIdClause,
    husbandNatClause,
    husbandMaritalStatusClause,
    husbandAdminCert,
    husbandMedCert,
    husbandMinorClause,
    husbandProxyClause,
    husbandForeignExtra,
  ].filter(Boolean).join(' ');

  const wifeFatherInfo = wife.fatherProfession ? `${wife.fatherName || '---'} (مهنته ${wife.fatherProfession})` : (wife.fatherName || '---');
  const wifeMotherInfo = wife.motherProfession ? `${wife.motherName || '---'} (مهنتها ${wife.motherProfession})` : (wife.motherName || '---');

  const wifeParts = [
    `البنت المصونة السيدة <strong>${wife.name || '---'}</strong>${wife.nameLatin ? ` (${wife.nameLatin})` : ''}`,
    `المولودة بـ <strong>${wife.placeOfBirth || '---'}</strong> بتاريخ <strong>${wife.dateOfBirth || '---'}</strong>`,
    `من والديها السيد <strong>${wifeFatherInfo}</strong> والسيدة <strong>${wifeMotherInfo}</strong>`,
    wifeBirthCert,
    `مهنتها <strong>${wife.profession || 'بدون مهنة'}</strong>`,
    `والساكنة بـ <strong>${wife.address || '---'}</strong>`,
    wifeIdClause,
    wifeNatClause,
    wifeMaritalStatusClause,
    wifeAdminCert,
    wifeMedCert,
    wifeMinorClause,
    wifeProxyClause,
    wifeForeignExtra,
  ].filter(Boolean).join(' ');

  const marriageNarrative = `
    الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وآله وصحبه.
    على الساعة <strong>${sessionTime}</strong> من يوم <strong>${sessionDay}</strong> <strong>${sessionDateHijriWords}</strong> هجرية، موافق <strong>${sessionDateGregWords}</strong> ميلادية (<strong>${dateHijri}</strong> / <strong>${dateGreg}</strong>)،
    تلقى العدلان أمنهما الله <strong>${notary1}</strong> و <strong>${notary2}</strong> المنتصبان للإشهاد بدائرة محكمة الاستئناف بـ <strong>${appellateCourt}</strong>، قسم التوثيق وقضاء الأسرة بالمحكمة الابتدائية بـ <strong>${courtName}</strong>،
    الشهادة المدرجة بسجل البيانات للعدل الأول رقم <strong>${memoNum}</strong> صحيفة <strong>${memoPage}</strong> عدد <strong>${memoCount}</strong>، والمضمنة بـ <strong>${regBook}</strong> رقم <strong>${regNum}</strong> صحيفة <strong>${regPage}</strong> عدد <strong>${regCount}</strong> بتاريخ <strong>${regDate}</strong>، نصها:
    الحمد لله، بعد الإذن الصادر عن السيد قاضي الأسرة المكلف بالزواج بالمحكمة الابتدائية بـ <strong>${authCourt}</strong> تحت رقم <strong>${authNum}</strong> بتاريخ <strong>${authDate}</strong>،
    تزوج على بركة الله وحسن توفيقه الجميل:
    الزوج: ${husbandParts}،
    ${conversionCertClause}
    وزوجته: ${wifeParts}،
    ${guardianClause}،
    على صداق مبارك قدره ونهايته <strong>${dowryWords}</strong> (<strong>${dowryAmt.toLocaleString()} درهم</strong>)، ${dowryRecStatus}${otherDowryClause}.
    تزوجها على كتاب الله وسنة رسوله المصطفى ﷺ، وباليمن والبركة، سمع منهما العدلان ${witnesses && witnesses.length > 0 ? `بحضور الشاهدين: ${witnessesList}` : 'والشاهدان العدلان'} الإيجاب والقبول الصريحين التامين الرضائيين،
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
        <div style="font-size: 17px; font-weight: bold; color: #1e293b;">دائرة محكمة الاستئناف بـ ${appellateCourt} - المحكمة الابتدائية بـ ${courtName} (${courtSection})</div>
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

  // Data Register (سجل البيانات للعدل الأول)
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

  const closingClause = `وتلي على الجميع بالأصالة والنيابة فأكدوه بتوقيعاتهم عليه عقبه بسجل البيانات أعلاه ${taxClause} عرفوا قدره شهد به عليهم وهم بأتمه وحرر في <strong>${draftDate}</strong> وسجل إلكترونياً بتاريخ <strong>${regDate}</strong> أمر بالاستخلاص رقم <strong>${collectionOrder}</strong> عبد ربه وعبد ربه.`;

  // Assemble continuous justified paragraph
  const continuousParagraph = `
    الحمد لله وحده نحن <strong>${notary1}</strong> و <strong>${notary2}</strong> العدلان المنتصبان للإشهاد بدائرة محكمة الاستئناف بـ <strong>${appellateCourt}</strong> قسم التوثيق بالمحكمة الابتدائية بـ <strong>${courtName}</strong> تلقينا على الساعة <strong>${sessionTime}</strong> يوم <strong>${sessionDay}</strong> <strong>${dateHijriWords}</strong> للهجرة موافق <strong>${dateGregorianWords}</strong> (<strong>${dateHijri}</strong> / <strong>${dateGregorian}</strong>) الشهادة المدرجة بسجل البيانات للعدل الأول رقم <strong>${memoNumber}</strong> صحيفة <strong>${memoPage}</strong> عدد <strong>${memoCount}</strong> نصها: 
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
          رسم بيع عقار عدلي | سجل البيانات للعدل الأول رقم: <strong style="color: #0f172a;">${memoNumber}</strong> | صحيفة: <strong style="color: #0f172a;">${memoPage}</strong> | عدد: <strong style="color: #0f172a;">${memoCount}</strong> | بتاريخ: <strong style="color: #0f172a;">${dateGregorian}</strong>
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

export function generateMalakiyaRasmHtml(state: FeesAgentState): string {
  const { sellers = [], buyers = [], applicants = [], properties = [], meta } = state;
  const prop = properties[0] || ({} as any);

  const courtName = formatCourtName(meta?.court || state.preReceptionVerification?.primaryCourt) || 'شفشاون';
  const appellateCourt = formatCourtName((meta as any)?.appellateCourt || (state.preReceptionVerification as any)?.appellateCourt) || 'تطوان';
  const courtSection = (meta as any)?.courtSection || 'قسم التوثيق';
  const notary1 = meta?.notaryPrimary || state.preReceptionVerification?.notary1Name || 'الحسن النوادري';
  const notary2 = meta?.notarySecondary || state.preReceptionVerification?.notary2Name || 'محمد الخياط';

  // Dates
  const dateGregorian = meta?.dateGregorian || state.preReceptionVerification?.receptionDate || new Date().toISOString().split('T')[0];
  const dateHijri = meta?.dateHijri || convertGregorianToHijri(dateGregorian);
  const sessionDay = getArabicWeekdayName(dateGregorian) || 'الأربعاء';
  const sessionTime = meta?.hourInWords || (meta?.time ? `على الساعة ${meta.time}` : 'على الساعة الثانية عشرة والنصف بعد زوال');
  const dateGregorianWords = meta?.dateGregorianInWords || convertGregorianDateToWords(dateGregorian) || 'خامس وعشرين دجنبر سنة أربعة وعشرين وألفين';
  const dateHijriWords = meta?.dateHijriInWords || convertHijriDateToWords(dateGregorian) || 'ثالث وعشرين جمادى الثانية عام ستة وأربعين وأربعمائة وألف';

  // Registry & Memo references (سجل البيانات للعدل الأول ودفتر الأملاك)
  const memoNumber = (meta as any)?.memoNumber || (meta as any)?.memorandumNumber || state.preReceptionVerification?.registryRecord?.number || '43';
  const memoPage = (meta as any)?.memoPage || (meta as any)?.memorandumPage || state.preReceptionVerification?.registryRecord?.page || '---';
  const memoCount = (meta as any)?.memoCount || (meta as any)?.memorandumRecordNumber || state.preReceptionVerification?.registryRecord?.count || '---';
  const receiptNumber = (meta as any)?.receiptNumber || (meta as any)?.taxReceiptNumber || '---';

  const regBook = (meta as any)?.registryBookType || 'دفتر الأملاك';
  const regNum = meta?.registryNumber || '---';
  const regLetter = (meta as any)?.registryLetter || 'أ';
  const regCount = meta?.registryCount || '---';
  const regDateGreg = meta?.receptionDate || dateGregorian;
  const regDateHijri = meta?.dateHijri || dateHijri;

  // Owners / Applicants identification
  const rawOwners = (buyers && buyers.length > 0) ? buyers : (applicants && applicants.length > 0 ? applicants : sellers);
  const owners = rawOwners.length > 0 ? rawOwners : [{ name: 'طالب الإشهاد' } as any];

  const isSingle = owners.length === 1;
  const firstOwner = owners[0];
  const isFemale = isSingle && (
    firstOwner.name?.includes('السيدة') ||
    firstOwner.name?.includes('عائشة') ||
    firstOwner.name?.includes('فاطمة') ||
    firstOwner.name?.includes('خديجة') ||
    firstOwner.name?.includes('مريم') ||
    (firstOwner as any).gender === 'female'
  );

  const _pronPrefix = isSingle ? (isFemale ? 'السيدة' : 'السيد') : 'السادة';
  const pronPoss = isSingle ? (isFemale ? 'لها' : 'له') : 'لهم';
  const pronHand = isSingle ? (isFemale ? 'بيدها' : 'بيده') : 'بيدهم';
  const pronHuz = isSingle ? (isFemale ? 'في حوزها واعتمارها وتصرفها وتحت ملكها' : 'في حوزه واعتماره وتصرفه وتحت ملكه') : 'في حوزهم واعتمارهم وتصرفهم وتحت ملكهم';
  const pronProp = isSingle ? (isFemale ? 'مالا من مالها وملكا صحيحا خالصا لها من جملة أملاكها' : 'مالا من ماله وملكا صحيحا خالصا له من جملة أملاكه') : 'مالا من مالهم وملكا صحيحا خالصا لهم من جملة أملاكهم';
  const pronDispose = isSingle 
    ? (isFemale ? 'تحوزها وتتصرف فيها تصرف المالك في ملكه بجميع أنواع التصرفات كلها وتنسب ذلك لنفسها والناس إليها كذلك' : 'يحوزها ويتصرف فيها تصرف المالك في ملكه بجميع أنواع التصرفات كلها وينسب ذلك لنفسه والناس إليه كذلك')
    : 'يحوزونها ويتصرفون فيها تصرف المالك في ملكه بجميع أنواع التصرفات كلها وينسبون ذلك لأنفسهم والناس إليهم كذلك';
  const pronAlienate = isSingle
    ? (isFemale ? 'بحيث لا يعلمونها باعت ذلك ولا وهبته ولا صدقته ولا فوتته ولا خرج عن ملكها وتصرفها بناقل شرعي أو بسبب من أسبابه كلها إلى الآن وحتى الآن' : 'بحيث لا يعلمونه باع ذلك ولا وهبه ولا صدقه ولا فوته ولا خرج عن ملكه وتصرفه بناقل شرعي أو بسبب من أسبابه كلها إلى الآن وحتى الآن')
    : 'بحيث لا يعلمونهم باعوا ذلك ولا وهبوه ولا صدقوه ولا فوتوه ولا خرج عن ملكهم وتصرفهم بناقل شرعي أو بسبب من أسبابه كلها إلى الآن وحتى الآن';
  const pronApplicant = isSingle ? (isFemale ? 'طالبة الإشهاد' : 'طالب الإشهاد') : 'طالبي الإشهاد';
  const pronHerHim = isSingle ? (isFemale ? 'بها ومعها' : 'به ومعه') : 'بهم ومعهم';

  const ownersFormattedList = owners.map((o) => {
    const p = o.name?.startsWith('السيد') || o.name?.startsWith('السيدة') ? '' : (isFemale ? 'السيدة' : 'السيد');
    const dob = o.dateOfBirth ? (o.dateOfBirth.includes('-') || o.dateOfBirth.includes('/') ? `المزداد${isFemale ? 'ة' : ''} بتاريخ <strong>${o.dateOfBirth}</strong>` : `المزداد${isFemale ? 'ة' : ''} سنة <strong>${o.dateOfBirth}</strong>`) : '';
    const parentPart = (o.fatherName || o.motherName) ? `من والديه${isFemale ? 'ا' : ''} ${o.fatherName ? `السيد <strong>${o.fatherName}</strong>` : ''} ${o.motherName ? `والسيدة <strong>${o.motherName}</strong>` : ''}` : '';
    const cin = o.idNumber ? `بطاقت${isFemale ? 'ها' : 'ه'} الوطنية رقم <strong>${o.idNumber}</strong>` : '';
    const addr = o.address ? `الساكن${isFemale ? 'ة' : ''} بـ <strong>${o.address}</strong>` : '';
    const proxyPart = (o.capacity === 'بتوكيل' || o.hasSpecialProxy === 'نعم') && o.proxyDetails
      ? `وناب عن${isFemale ? 'ها' : 'ه'} بوكالة خاصة السيد(ة) <strong>${o.proxyDetails.name || (o as any).proxyName || '---'}</strong> بموجب توكيل عدد <strong>${o.proxyDetails.number || '---'}</strong> كناش <strong>${o.proxyDetails.book || '---'}</strong> صحيفة <strong>${o.proxyDetails.page || '---'}</strong> وتاريخ <strong>${o.proxyDetails.date || '---'}</strong> توثيق <strong>${o.proxyDetails.notary || '---'}</strong>`
      : '';
    const sharePart = o.share ? `بحصة <strong>${o.share}</strong>` : '';
    return `${p} <strong>${o.name || '---'}</strong> ${[dob, parentPart, cin, addr, proxyPart, sharePart].filter(Boolean).join(' ')}`.trim();
  }).join(' و ');

  // Property Details
  const propType = prop.propertyName || prop.type || 'الدويرية';
  const propBuild = prop.buildingStatus || (prop.description?.includes('قائمة البناء') ? '' : 'القائمة البناء');
  const propDesc = prop.description ? `${prop.description}` : 'المتكونة من مرافق وسكنى بسطحها وهوائها ودخلتها';
  const propLoc = prop.location || prop.address || 'بالمكان المذكور أعلاه';

  // Administrative Certificate
  const adminCerts = (state as any).certificates || prop.ownershipCertificates || prop.administrativeCertificates || [];
  const cert = adminCerts[0] || (state.administrativeCertificates?.[0]) || ({} as any);
  const certClause = (cert.number || cert.issuedBy || cert.authority)
    ? `حسب الشهادة الإدارية الصادرة عن <strong>${cert.issuedBy || cert.authority || 'الجماعة المختصة'}</strong> تحت رقم <strong>${cert.number || '---'}</strong> بتاريخ <strong>${cert.date || '---'}</strong>`
    : '';

  // Boundaries
  const eastBound = prop.boundaries?.east || '---';
  const westBound = prop.boundaries?.west || '---';
  const northBound = prop.boundaries?.north || '---';
  const southBound = prop.boundaries?.south || '---';
  const boundariesClause = `وتحد شرقا: <strong>${eastBound}</strong>، غربا: <strong>${westBound}</strong>، شمالا: <strong>${northBound}</strong>، جنوبا: <strong>${southBound}</strong>`;

  // Area & Value
  const areaClause = prop.area_m2 ? `مساحتها حوالي <strong>${convertNumberToArabicWords(prop.area_m2)} مترا (${prop.area_m2}م2)</strong>` : '';
  const priceAmt = state.finance?.price || 0;
  const priceWords = state.finance?.priceInWords || (priceAmt ? convertNumberToArabicWords(priceAmt) : '');
  const priceClause = priceAmt ? `قيمتها بذكر ${pronApplicant} <strong>${priceWords} درهم (${priceAmt.toLocaleString()} درهم)</strong>` : '';

  // Possession Duration
  const durationYears = prop.ownershipDurationYears || 15;
  const durationClause = `مدة تزيد على ${durationYears >= 15 ? 'خمس عشرة سنة' : durationYears >= 10 ? 'عشر سنوات' : `${durationYears} سنوات`} سلفت عن تاريخه من غير علم منازع ${pronPoss} في ذلك ولا معارض طول المدة المذكورة`;

  // Witnesses (شهود اللفيف الشرعي)
  const witnesses = state.witnesses || [];
  let witnessesListHtml = '';
  if (witnesses.length > 0) {
    witnessesListHtml = witnesses.map((w: any) => {
      const wDob = w.dateOfBirth ? `المزداد بتاريخ <strong>${w.dateOfBirth}</strong>` : (w.yearOfBirth ? `المزداد سنة <strong>${w.yearOfBirth}</strong>` : '');
      const wCin = w.idNumber ? `بطاقته الوطنية رقم <strong>${w.idNumber}</strong>` : '';
      const wAddr = w.address ? `الساكن بـ <strong>${w.address}</strong>` : '';
      return `<div style="margin-bottom: 6px;">- السيد <strong>${w.name}</strong> ${[wDob, wCin, wAddr].filter(Boolean).join(' ')}</div>`;
    }).join('');
  } else {
    witnessesListHtml = '<div>شهود اللفيف الشرعي باثني عشر شاهدا بتعاريفهم ومواطن سكناهم المقيدة بسجل البيانات.</div>';
  }

  const ownershipNarrative = `
    الحمد لله وحده، وعلى الساعة <strong>${sessionTime}</strong> من يوم <strong>${sessionDay}</strong> <strong>${dateHijriWords}</strong> هجرية وفاق <strong>${dateGregorianWords}</strong> (<strong>${dateHijri} هـ ق ${dateGregorian} م</strong>)،
    تلقى العدلان أمنهما الله <strong>${notary1}</strong> و <strong>${notary2}</strong> المنتصبان للإشهاد بدائرة استئنافية <strong>${appellateCourt}</strong>، <strong>${courtSection}</strong> بالمحكمة الابتدائية بـ <strong>${courtName}</strong>،
    شهادة ملكية سجل ملخصها بسجل البيانات للعدل الأول رقم <strong>${memoNumber}</strong> تحت عدد <strong>${memoCount}</strong> صحيفة <strong>${memoPage}</strong> وصل رقم <strong>${receiptNumber}</strong>، نصها:
    شهوده الموضوعة أسماؤهم عقب تاريخه يعرفون ${ownersFormattedList} المعرفة التامة الكافية شرعا ${pronHerHim}،
    ومعها يشهدون بأن ${pronPoss} و${pronHand} و${pronHuz} ${pronProp}،
    وذلك جميع <strong>${propType}</strong> ${propBuild ? `<strong>${propBuild}</strong>` : ''} <strong>${propDesc}</strong> الكائنة بـ <strong>${propLoc}</strong>،
    ${certClause ? `${certClause}،` : ''}
    ${boundariesClause}،
    ${areaClause ? `${areaClause}،` : ''}
    ${priceClause ? `${priceClause}،` : ''}
    وأن${isSingle ? (isFemale ? 'ها' : 'ه') : 'هم'} ${pronDispose} ${durationClause}،
    ${pronAlienate}،
    هذا الذي في علمهم وصحة يقينهم، وسند علمهم في ذلك المخالطة والمعاينة لما ذكر أعلاه وشدة الاطلاع على جل الأحوال،
    وبمضمنه قيدت شهادتهم لسائل${isSingle ? (isFemale ? 'ها' : 'ه') : 'هم'} ${pronApplicant} أعلاه.
  `
    .replace(/[،,]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return `
    <div style="font-family: 'Traditional Arabic', 'Amiri', 'Segoe UI', Tahoma, serif; direction: rtl; text-align: justify; line-height: 2.2; font-size: 17px; color: #1a202c; padding: 25px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      
      <!-- Top Official Moroccan Judicial Header -->
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px;">
        <div style="font-size: 22px; font-weight: bold; color: #1e3a8a; margin-bottom: 4px;">المملكة المغربية</div>
        <div style="font-size: 18px; font-weight: bold; color: #334155; margin-bottom: 4px;">وزارة العدل</div>
        <div style="font-size: 17px; font-weight: bold; color: #1e293b;">محكمة الاستئناف بـ ${appellateCourt} - المحكمة الابتدائية بـ ${courtName} (${courtSection})</div>
        
        <!-- Registry Box (دفتر الأملاك) -->
        <div style="margin-top: 12px; font-size: 14px; color: #1e3a8a; background: #eff6ff; padding: 8px 16px; border-radius: 6px; display: inline-block; border: 1px solid #bfdbfe; font-weight: bold;">
          ضمن بـ ${regBook} رقم: <strong style="color: #1d4ed8;">${regNum}</strong> | حرف: <strong style="color: #1d4ed8;">${regLetter}</strong> | عدد: <strong style="color: #1d4ed8;">${regCount}</strong> | بتاريخ: <strong style="color: #1d4ed8;">${regDateHijri} هـ</strong> وفاق <strong style="color: #1d4ed8;">${regDateGreg} م</strong>
        </div>
        
        <div style="margin-top: 14px; font-size: 24px; font-weight: 900; color: #1e3a8a; letter-spacing: 1px;">
          رسم ملكية (رسم الاستمرار)
        </div>
      </div>

      <!-- Unified Continuous Legal Paragraph (Moroccan Rasm Format) -->
      <div style="margin: 20px 0; padding: 22px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;">
        <p style="margin: 0; padding: 0; text-align: justify; text-justify: inter-word; line-height: 2.3; font-size: 18px; color: #0f172a; text-indent: 32px;">
          ${ownershipNarrative}
        </p>
      </div>

      <!-- Witnesses Section (شهود اللفيف الاثنا عشر) -->
      <div style="margin: 20px 0; padding: 16px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        <div style="font-weight: bold; color: #1e3a8a; font-size: 16px; margin-bottom: 10px;">شهد بذلك السادة (شهود اللفيف الشرعي):</div>
        <div style="font-size: 15px; color: #334155; line-height: 2;">
          ${witnessesListHtml}
        </div>
        <div style="margin-top: 12px; font-size: 15px; color: #1e293b; font-weight: 600; text-align: justify;">
          وتلي على الجميع نص الشهادة فأكدوه ووافقوا عليه بتوقيعهم عليه عقبه بسجل البيانات المشار إليه أعلاه عنهم بإذنهم وهم عارفون قدره وبأتمه.
        </div>
      </div>

      <!-- Signatures Box -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 25px; padding-top: 15px; border-top: 2px dashed #94a3b8; text-align: center;">
        <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 25px; font-size: 15px;">توقيع طالب(ة) الإشهاد</div>
          <div style="font-size: 13px; color: #64748b;">${owners.map(o => o.name).join(' - ') || 'طالب الإشهاد'}</div>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 25px; font-size: 15px;">شهود اللفيف</div>
          <div style="font-size: 13px; color: #64748b;">توقيعات شهود اللفيف بسجل البيانات</div>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 25px; font-size: 15px;">توقيع العدلين المنتصبين</div>
          <div style="font-size: 13px; color: #64748b;">${notary1} - ${notary2}</div>
        </div>
      </div>

      <!-- Judge Attestation Section -->
      <div style="margin-top: 20px; padding: 14px 18px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; text-align: center;">
        <div style="font-weight: bold; color: #1e3a8a; font-size: 16px; margin-bottom: 6px;">خطاب القاضي المكلف بالتوثيق</div>
        <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.8;">
          الحمد لله أشهد الفقيه الأجل القاضي المكلف بالتوثيق بالمحكمة الابتدائية بـ <strong>${courtName}</strong> ودائرتها وهو أعزه الله تعالى بعز طاعته وحرس ولايته بثبوت الرسم أعلاه لديه الثبوت التام بواجبه وهو حفظه الله بحيث يجب له ذلك من حيث ذكر، وحرر الرسم في نفس تاريخ تلقيه أعلاه، وسجل إلكترونيا في <strong>${(meta as any)?.electronicRegistryDate || '.....'}</strong> أمر بالاستخلاص <strong>${(meta as any)?.recoveryOrderNumber || '.....'}</strong> سجل المداخيل <strong>${(meta as any)?.revenueRegisterNumber || '.....'}</strong>، عبد ربه تعالى وعبد ربه.
        </p>
        <div style="margin-top: 14px; display: flex; justify-content: space-around; font-size: 13px; color: #71717a;">
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

  // Agent dismissal deed (رسم عزل وكيل)
  if (documentType === 'عزل_وكيل') {
    const draftText = state.draft || generateAgentDismissalDraft(state);
    return `<div style="font-family: 'Amiri', 'Traditional Arabic', serif; direction: rtl; text-align: justify; line-height: 2.2; padding: 25px; font-size: 17px; color: #0f172a;">${draftText.replace(/\n/g, '<br/>')}</div>`;
  }

  // Ownership deeds (ملكية / رسم استمرار / حيازة)
  if (documentType === 'ملكية' || documentType === 'حيازة' || documentType.includes('ملكية') || documentType.includes('حيازة')) {
    return generateMalakiyaRasmHtml(state);
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

export function generateAgentDismissalDraft(state: FeesAgentState): string {
  const d = state.agentDismissal;
  if (!d) return 'الحمد لله وحده، رسم عزل وكيل وفقاً لمقتضيات خطة العدالة وظهير الالتزامات والعقود.';

  const principalsText = (d.principals && d.principals.length > 0)
    ? d.principals.map(p => {
        if (p.partyType === 'legal') {
          return `شركة (${p.companyName || '...'}) في شخص ممثلها القانوني السيد (${p.legalRepresentativeName || '...'}) بصفته (${p.representativeCapacity || 'مسير'})`;
        }
        return `السيد (${p.fullName || 'طالب العزل'}) الحامل لبطاقة التعريف الوطنية رقم (${p.idCardNumber || '...'}) الساكن بـ (${p.address || '...'})`;
      }).join('، و')
    : 'طالب العزل';

  const agentsText = (d.agents && d.agents.length > 0)
    ? d.agents
        .filter(a => d.dismissalTarget === 'all' || (d.selectedAgentIds || []).includes(a.id))
        .map(a => {
          if (a.partyType === 'legal') {
            return `شركة (${a.companyName || '...'}) في شخص ممثلها`;
          }
          return `السيد (${a.fullName || 'الوكيل المعزول'}) الحامل لبطاقة التعريف الوطنية رقم (${a.idCardNumber || '...'}) الساكن بـ (${a.address || '...'})`;
        }).join('، و')
    : 'الوكيل المعزول';

  const isPartial = d.dismissalScopeType === 'partial';
  const scopeDesc = isPartial
    ? `عزلاً جزئياً يقتصر حصراً على الصلاحيات التالية: (${(d.revokedPowers || []).join('، ')}${d.otherRevokedPowerCustom ? '، ' + d.otherRevokedPowerCustom : ''})، مع بقاء ما عدا ذلك من الصلاحيات الواردة بأصل الوكالة المذكورة سارياً ومنتجاً لآثاره القانونية.`
    : `عزلاً كلياً وتاماً يشمل سائر وأوفى الصلاحيات والتفويضات المخولة له بمقتضى الوكالة المحددة أدناه.`;

  const poa = d.originalPoa || ({} as any);
  let poaRef = poa.summaryText;
  if (!poaRef) {
    if (poa.sourceType === 'adoul') {
      poaRef = `دفتر (${poa.book || '...'}) حرف (${poa.letter || '...'}) صحيفة (${poa.page || '...'}) عدد (${poa.number || '...'}) بتاريخ (${poa.date || '...'}) توثيق محكمة (${poa.court || '...'})`;
    } else if (poa.sourceType === 'official_other') {
      poaRef = `محرر رسمي صادر عن (${poa.issuerAuthority || '...'}) رقم (${poa.documentNumber || '...'}) بتاريخ (${poa.date || '...'}) بـ (${poa.place || '...'})`;
    } else if (poa.sourceType === 'fixed_date') {
      poaRef = `محرر ثابت التاريخ لدى (${poa.fixedDateAuthority || '...'}) بتاريخ (${poa.fixedDate || '...'}) تحت مرجع (${poa.referenceNumber || '...'})`;
    } else if (poa.sourceType === 'foreign') {
      poaRef = `وكالة أجنبية صادرة بـ (${poa.city || '...'} - ${poa.country || '...'}) عن (${poa.foreignIssuer || '...'}) رقم (${poa.foreignNumber || '...'}) بتاريخ (${poa.foreignDate || '...'})`;
    } else {
      poaRef = 'الوكالة المعتمدة بالمنصة';
    }
  }

  const registryText = d.registryInfo?.isRegistered === 'yes'
    ? `، والمقيدة بالسجل المحلي للوكالات المتعلقة بالحقوق العينية الممسوك لدى كتابة الضبط بالمحكمة الابتدائية بـ (${d.registryInfo.primaryCourt || '...'}) بتاريخ (${d.registryInfo.registrationDate || '...'}) تحت رقم التقييد المركب (${d.registryInfo.registrationNumber || '...'})`
    : '';

  const propertyText = (d.subjectCategory === 'real_estate' && d.propertyTitleNumber)
    ? `، والمتعلقة بالعقار ذي الرسم العقاري أو المطلب عدد (${d.propertyTitleNumber})${d.propertyLocation ? ' الكائن بـ ' + d.propertyLocation : ''}`
    : '';

  const subAgentText = (d.subAgent && d.subAgent.hasSubAgent)
    ? ` وإعمالاً للقواعد القانونية المقررة بالفصل 937 من ق.ل.ع، فإن عزل الوكيل الأصلي يسري حكماً على نائبه السيد (${d.subAgent.subAgentName || (d.subAgent as any).fullName || 'النائب'})، وتسقط تتبعاً كافة صلاحياته المستمدة من الوكالة موضوع العزل.`
    : '';

  return `الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وآله وصحبه.

حضر لدى عدلي التوثيق الموقعين أسفله، المنتصبين للإشهاد بدائرة المحكمة الابتدائية المعنية، ${principalsText}، وبعد تعريفهما لهما قدره التام والهوية الكاملة، صرح بأنه يعزل وكيله ${agentsText}، ${scopeDesc} من أصل الوكالة الصادرة عنه بموجب ${poaRef}${propertyText}${registryText}.${subAgentText}

وقد قرر الموكل تجريد وكيله المعزول من ممارسة أي تصرف من التصرفات المذكورة، مع إلزامه بإرجاع نظير الوكالة وكافة الوثائق والمستندات المسلمة إليه. وقد تم إشعار الوكيل بمقتضى هذا العزل عبر (${d.notificationMethod === 'present_in_majlis' ? 'حضوره بمجلس الإشهاد العدلي' : d.notificationMethod === 'written_notice' ? 'إشعار كتابي رسمي مؤرخ في ' + (d.notificationDate || 'تاريخه') : 'المساطر المنصوص عليها بالفصل 932 من ق.ل.ع'}). 

وبما ذكر صرح الموكل والتزم، وشهد عليه به في صحة وعقل وجواز أمر في تاريخه المبارك.`;
}

// ============================================================================
// PROMISE TO SELL DRAFT GENERATOR (رسم وعد بالبيع العقاري)
// وفق المادة 4 من القانون 39.08 المعدلة بالقانون 41.24 وفصول ق.ل.ع 574-586
// ============================================================================

export function generatePromiseToSellDraft(state: FeesAgentState): string {
  if (!state) return '';
  const meta: DocumentMeta = state.meta || { fileNumber: '', dateGregorian: '', dateHijri: '', notaryPrimary: '', notarySecondary: '', additionalDocuments: [], court: '', hourInWords: '', dateGregorianInWords: '', dateHijriInWords: '' };
  const promise = state.promiseToSell || {};
  const propDetails = promise.propertyDetails || {};
  const finance = promise.financeDetails || {};
  const deadline = promise.finalSaleDeadline || {};
  const suspensive = promise.suspensiveConditions || [];
  const encumbrances = promise.encumbrances || {};
  const legacyProperty = promise.property || {};
  const legacyTerms = promise.promiseTerms || {};

  // Court and Notary Metadata
  const appellateCourt = formatCourtName((meta as any)?.appellateCourt || (state.preReceptionVerification as any)?.appellateCourt) || 'طنجة';
  const courtName = formatCourtName(meta.court || state.preReceptionVerification?.primaryCourt) || 'طنجة';
  const courtSection = meta.courtSection || 'قسم قضاء الأسرة والتوثيق';
  const regBook = (meta as any).registryBookType || 'كناش المعاملات العقارية';
  const regNum = meta.registryNumber || state.preReceptionVerification?.registryRecord?.number || '---';
  const regPage = meta.registryPage || state.preReceptionVerification?.registryRecord?.page || '---';
  const regCount = meta.registryCount || state.preReceptionVerification?.registryRecord?.count || '---';
  const regDate = meta.dateGregorian || state.preReceptionVerification?.receptionDate || new Date().toISOString().split('T')[0];
  const dateHijri = meta.dateHijri || convertGregorianToHijri(regDate);
  const notary1 = meta.notaryPrimary || state.preReceptionVerification?.notary1Name || 'العدل الأول';
  const notary2 = meta.notarySecondary || state.preReceptionVerification?.notary2Name || 'العدل الثاني';

  // Promisors (الواعدون بالبيع)
  let promisorsList = promise.promisors && promise.promisors.length > 0 ? promise.promisors : [];
  if (promisorsList.length === 0 && promise.seller?.fullName) {
    promisorsList = [{
      fullName: promise.seller.fullName,
      idNumber: promise.seller.idNumber,
      dateOfBirth: promise.seller.dateOfBirth,
      placeOfBirth: promise.seller.placeOfBirth,
      nationality: promise.seller.nationality,
      address: promise.seller.address,
      relationToProperty: promise.seller.relationToProperty,
      isCapable: promise.seller.isCapable
    }];
  }
  if (promisorsList.length === 0 && state.sellers && state.sellers.length > 0) {
    promisorsList = state.sellers.map(s => ({
      fullName: s.name,
      idNumber: s.idNumber,
      address: s.address,
      profession: s.profession,
      fatherName: s.fatherName,
      motherName: s.motherName
    }));
  }

  // Promisees (الموعود لهم بالشراء)
  let promiseesList = promise.promisees && promise.promisees.length > 0 ? promise.promisees : [];
  if (promiseesList.length === 0 && promise.buyer?.fullName) {
    promiseesList = [{
      fullName: promise.buyer.fullName,
      idNumber: promise.buyer.idNumber,
      dateOfBirth: promise.buyer.dateOfBirth,
      placeOfBirth: promise.buyer.placeOfBirth,
      nationality: promise.buyer.nationality,
      address: promise.buyer.address,
      relationToProperty: promise.buyer.relationToProperty,
      isCapable: promise.buyer.isCapable
    }];
  }
  if (promiseesList.length === 0 && state.buyers && state.buyers.length > 0) {
    promiseesList = state.buyers.map(b => ({
      fullName: b.name,
      idNumber: b.idNumber,
      address: b.address,
      profession: b.profession,
      fatherName: b.fatherName,
      motherName: b.motherName
    }));
  }

  // Format Promisors Text
  const promisorsText = promisorsList.length > 0 ? promisorsList.map((p, idx) => {
    if (p.isLegalEntity) {
      return `الطرف الواعد بالبيع رقم (${idx + 1}): شركة/هيئة «${p.companyName || p.fullName || '---'}»، ذات الشكل القانوني ${p.companyForm || '---'}، المقيدة بالسجل التجاري بـ ${p.rcNumber || '---'}، والمعرف الموحد للمقاولة (ICE): ${p.ice || '---'}، ومقرها الاجتماعي بـ ${p.headquarters || p.address || '---'}، ويمثلها قانوناً السيد(ة): ${p.legalRepresentativeName || '---'} بصفته ${p.legalRepresentativeCapacity || 'الممثل القانوني'} بموجب ${p.legalRepresentativeDocRef || 'السند القانوني المعتمد'}.`;
    }
    const details = [
      p.fullName ? `السيد(ة) ${p.fullName}` : '',
      p.fatherName ? `بن ${p.fatherName}` : '',
      p.motherName ? `وأمه ${p.motherName}` : '',
      p.dateOfBirth ? `المزداد(ة) بتاريخ ${p.dateOfBirth}` : '',
      p.placeOfBirth ? `بـ ${p.placeOfBirth}` : '',
      p.nationality ? `جنسيته(ا) ${p.nationality}` : 'المغربي(ة) الجنسية',
      p.profession ? `مهنته(ا) ${p.profession}` : '',
      p.maritalStatus ? `حالته(ا) العائلية: ${p.maritalStatus}` : '',
      p.idNumber ? `الحامل(ة) للبطاقة الوطنية للتعريف رقم ${p.idNumber}` : '',
      p.address ? `الساكن(ة) بـ ${p.address}` : '',
      p.shareFraction ? `بصفته مالكاً لحصة قدرها ${p.shareFraction}` : '',
      p.ownershipDeedRef ? `بمقتضى رسم الملكية: ${p.ownershipDeedRef}` : ''
    ].filter(Boolean).join(' ');
    return `الطرف الواعد بالبيع رقم (${idx + 1}): ${details}، بعد ثبوت أهليته(ا) الكاملة للتصرف.`;
  }).join('\n') : 'الطرف الواعد بالبيع: لم يحدد بعد.';

  // Format Promisees Text
  const promiseesText = promiseesList.length > 0 ? promiseesList.map((p, idx) => {
    if (p.isLegalEntity) {
      return `الطرف الموعود له بالشراء رقم (${idx + 1}): شركة/هيئة «${p.companyName || p.fullName || '---'}»، ذات الشكل القانوني ${p.companyForm || '---'}، المقيدة بالسجل التجاري رقم ${p.rcNumber || '---'}، والمعرف الموحد (ICE): ${p.ice || '---'}، ومقرها الاجتماعي بـ ${p.headquarters || p.address || '---'}، ويمثلها قانوناً السيد(ة): ${p.legalRepresentativeName || '---'} بصفته ${p.legalRepresentativeCapacity || 'الممثل القانوني'}.`;
    }
    const details = [
      p.fullName ? `السيد(ة) ${p.fullName}` : '',
      p.fatherName ? `بن ${p.fatherName}` : '',
      p.motherName ? `وأمه ${p.motherName}` : '',
      p.dateOfBirth ? `المزداد(ة) بتاريخ ${p.dateOfBirth}` : '',
      p.placeOfBirth ? `بـ ${p.placeOfBirth}` : '',
      p.nationality ? `جنسيته(ا) ${p.nationality}` : 'المغربي(ة) الجنسية',
      p.profession ? `مهنته(ا) ${p.profession}` : '',
      p.idNumber ? `الحامل(ة) للبطاقة الوطنية للتعريف رقم ${p.idNumber}` : '',
      p.address ? `الساكن(ة) بـ ${p.address}` : '',
      p.shareFraction ? `بحصة موعود بشرائها قدرها ${p.shareFraction}` : ''
    ].filter(Boolean).join(' ');
    return `الطرف الموعود له بالشراء رقم (${idx + 1}): ${details}، بعد ثبوت أهليته(ا) للتعاقد والالتزام.`;
  }).join('\n') : 'الطرف الموعود له بالشراء: لم يحدد بعد.';

  // Property Qualification Text
  const status = propDetails.propertyStatus || (legacyProperty.registryOrDeed?.includes('رسم') ? 'محفظ' : 'غير_محفظ');
  let propertySectionText = '';
  if (status === 'محفظ') {
    propertySectionText = `[ العقار محل الوعد - عقار محفظ ]
الرسم العقاري: عدد ${propDetails.titleNumber || legacyProperty.registryOrDeed || '---'} ${propDetails.titleSuffix ? `(${propDetails.titleSuffix})` : ''}
المحافظة العقارية المختصة: ${propDetails.landRegistryOffice || '---'}
اسم الملك: ${propDetails.propertyName || '---'}
الموقع: جماعة ${propDetails.commune || '---'}، إقليم ${propDetails.province || '---'}، ${propDetails.exactAddress || legacyProperty.address || '---'}
المساحة الإجمالية: ${propDetails.areaTotal || legacyProperty.area || '---'} ${propDetails.areaUnit || 'متر مربع'} ${propDetails.areaInWords ? `(${propDetails.areaInWords})` : ''}
الحصة موضوع الوعد: ${propDetails.isFullProperty ? 'كامل الملك ومجموعه دون استثناء' : (propDetails.subjectShareFraction || 'حصة شائعة')}
الحدود: شمالاً: ${propDetails.boundaryNorth || '---'} | جنوباً: ${propDetails.boundarySouth || '---'} | شرقاً: ${propDetails.boundaryEast || '---'} | غرباً: ${propDetails.boundaryWest || '---'}
شهادة الملكية العقارية: مستخرجة من المحافظة العقارية تحت عدد ${propDetails.landCertificateNumber || '---'} بتاريخ ${propDetails.landCertificateDate || propDetails.landCertificateIssuedDate || '---'}.
التحملات والرهون: ${encumbrances.hasEncumbrances === 'نعم' ? (encumbrances.items?.map(it => `${it.type} لفائدة ${it.beneficiary} بمبلغ ${it.amount || 0} درهم (مرجع: ${it.reference}) - وضعيته: ${it.liftingStatus}`).join('، ') || 'مسجلة بالرسم العقاري') : 'صرح الواعد بسلامة العقار من أي رهن أو حجز أو تحمل عيني يمنع نفاذ هذا الوعد'}.`;
  } else if (status === 'طور_التحفيظ' || status === 'مطلب_تحفيظ') {
    propertySectionText = `[ العقار محل الوعد - في طور التحفيظ ]
مطلب التحفيظ عدد: ${propDetails.requisitionNumber || '---'} المودع بالمحافظة العقارية بـ ${propDetails.landRegistryOffice || '---'} بتاريخ ${propDetails.requisitionDate || '---'}
اسم طالب التحفيظ: ${propDetails.requisitionApplicantName || '---'}
حالة مسطرة التحفيظ: ${propDetails.requisitionStatus || 'جارية'}
الموقع والمساحة: جماعة ${propDetails.commune || '---'}، إقليم ${propDetails.province || '---'}، المساحة: ${propDetails.areaTotal || '---'} ${propDetails.areaUnit || 'متر مربع'}
الحدود: شمالاً: ${propDetails.boundaryNorth || '---'} | جنوباً: ${propDetails.boundarySouth || '---'} | شرقاً: ${propDetails.boundaryEast || '---'} | غرباً: ${propDetails.boundaryWest || '---'}
التعرضات: ${propDetails.hasRequisitionOppositions ? `توجد تعرضات جاري تسويتها (${propDetails.requisitionOppositionsDetails || '---'})` : 'لا توجد أي تعرضات مسجلة بمطلب التحفيظ حسب الشهادة المستخرجة'}.`;
  } else {
    propertySectionText = `[ العقار محل الوعد - عقار غير محفظ ]
أصل الملك ومستند التملك: تملك الواعد للملك بموجب ${propDetails.originDeedType || 'سند تملك شرعي'} عدد ${propDetails.originDeedNumber || '---'} كناش ${propDetails.originDeedBook || '---'} صحيفة ${propDetails.originDeedPage || '---'} بتاريخ ${propDetails.originDeedDate || '---'} توثيق ${propDetails.originCourtNotary || '---'} عن سلفه ${propDetails.originalOwnerName || '---'}
الموقع: جماعة ${propDetails.commune || '---'}، إقليم ${propDetails.province || '---'}، ${propDetails.exactAddress || legacyProperty.address || '---'}
المساحة والحدود: المساحة التقديرية ${propDetails.areaTotal || legacyProperty.area || '---'} ${propDetails.areaUnit || 'متر مربع'}.
الحدود الأربعة: شمالاً: ${propDetails.boundaryNorth || '---'} | جنوباً: ${propDetails.boundarySouth || '---'} | شرقاً: ${propDetails.boundaryEast || '---'} | غرباً: ${propDetails.boundaryWest || '---'}
الحصة الموعود ببيعها: ${propDetails.isFullProperty ? 'كامل الملك ومجموعه' : (propDetails.subjectShareFraction || 'حصة محددة')}.`;
  }

  // Price & Finance Details
  const totalPrice = finance.totalPrice || legacyTerms.totalPrice || 0;
  const totalPriceWords = finance.totalPriceInWords || (totalPrice ? convertNumberToArabicWords(totalPrice) : '---');
  const earnest = finance.earnestAmount || legacyTerms.earnestMoney || 0;
  const earnestWords = finance.earnestAmountInWords || (earnest ? convertNumberToArabicWords(earnest) : '---');
  const remaining = finance.remainingAmount !== undefined ? finance.remainingAmount : Math.max(0, totalPrice - earnest);
  const remainingWords = finance.remainingAmountInWords || (remaining ? convertNumberToArabicWords(remaining) : '---');
  const earnestMethod = finance.earnestPaymentMethod || legacyTerms.paymentMethod || 'نقد';

  // Deadline Text
  let deadlineText = 'في أجل يحدده الطرفان باتفاق لاحق';
  if (deadline.type === 'تاريخ_محدد' && deadline.specificDate) {
    deadlineText = `في أجل أقصاه يوم ${deadline.specificDate}`;
  } else if (deadline.type === 'أجل_بالأيام_أو_الأشهر' && deadline.periodNumber) {
    deadlineText = `داخل أجل ${deadline.periodNumber} ${deadline.periodUnit || 'يوماً'} يبتدئ من تاريخ تحرير هذا الرسم وينتهي بحلول ${deadline.endDate || 'انصرام المدة'}`;
  } else if (deadline.type === 'مرتبط_بشرط' || deadline.conditionText) {
    deadlineText = `معلق على تحقق الشرط الآتي: «${deadline.conditionText || 'تحقق الشرط المتفق عليه'}»`;
  } else if (legacyTerms.finalDeadline) {
    deadlineText = `بحلول تاريخ: ${legacyTerms.finalDeadline}`;
  }

  // Suspensive conditions list
  const suspensiveConditionsText = suspensive.length > 0 ? suspensive.map((s, idx) => {
    return `الشرط (${idx + 1}) [${s.type}]: «${s.conditionText}» - الأجل المحدد لتحققه: ${s.fulfillmentDeadline || 'عند إبرام البيع النهائي'} - الأثر في حال عدم التحقق: ${s.consequenceOfBreach || 'انفساخ الوعد واسترداد المبالغ المؤداة دون تعويض'}.`;
  }).join('\n') : 'لم يشترط الطرفان أي شرط واقف إضافي سوى التزامات الوفاء والتسليم.';

  // Earnest rule clause (DOC 584-586)
  const earnestRuleClause = finance.earnestRule === 'خصم_عند_البيع_أو_فقده_عند_النكول'
    ? 'اتفق الطرفان طبقاً للفصلين 584 و586 من قانون الالتزامات والعقود على أن مبلغ العربون المؤدى يخصم من ثمن المبيع الإجمالي إذا نفذ البيع، وإذا نكل الموعود له بالشراء وعدل عن إتمام الصفقة فإنه يفقد مبلغ العربون كاملاً لفائدة الواعد كتعويض جزائي نهائي، وإذا نكل الواعد بالبيع وامتنع عن إتمام البيع النهائي فإنه يلتزم برد مبلغ العربون كاملاً.'
    : finance.earnestRule === 'مزدوج_المادة_586_ق_ل_ع'
    ? 'اتفق الطرفان على تطبيق أحكام الفصل 586 من قانون الالتزامات والعقود بحيث إذا نكل المشتري فقد العربون، وإذا نكل البائع أرجع العربون ومثله (ضعفه) للمشتري كتعويض اتفاقي غير قابل للمنازعة.'
    : 'يخصم مبلغ العربون/التسبيق من الثمن الإجمالي عند إبرام عقد البيع النهائي واستيفاء كامل الشروط.';

  return `================================================================================
                         المملكة المغربية - وزارة العدل
دائرة محكمة الاستئناف بـ ${appellateCourt} - المحكمة الابتدائية بـ ${courtName} (${courtSection})
سجل البيانات: كناش ${regBook} | رقم: ${regNum} | صحيفة: ${regPage} | عدد: ${regCount}
بتاريخ: ${regDate} موافق ${dateHijri} هـ
العدلان المنتصبان للإشهاد: ${notary1} و ${notary2}
================================================================================

                           رسم وعد بالبيع عقاري
         (محرر رسمي وفق المادة 4 من القانون رقم 39.08 المتعلق بمدونة الحقوق العينية
             كما تم تعديلها وتتميمها بالقانون رقم 41.24، وأحكام قانون الالتزامات والعقود)

الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وآله وصحبه.
على الساعة ${meta.hourInWords || 'المباركة القانونية'} من يوم ${getArabicWeekdayName(regDate) || 'اليوم'} ${meta.dateGregorianInWords ? `الموافق لـ ${meta.dateGregorianInWords}` : regDate} ميلادية،
تلقى العدلان الموقعان أسفله بدائرة المحكمة الابتدائية بـ ${courtName} الإشهاد بالوعد بالبيع العقاري الآتي نصه:

أولاً: أطراف الوعد بالبيع:
---------------------------
[ الطرف الواعد بالبيع (الملتزم بالتفويت) ]:
${promisorsText}

[ الطرف الموعود له بالشراء (المستفيد من الوعد) ]:
${promiseesText}
(مع إثبات عدم انتقال الملكية العقارية حالياً بموجب هذا الوعد، وأن صفة المشتري هي "موعود له بالشراء" حتى إبرام البيع النهائي وفق القانون).

ثانياً: تكييف التصرف وطبيعته:
---------------------------
صرح الطرفان بكامل أهليتهما الشرعية والقانونية بأنهما أبرما هذا «الوعد بالبيع العقاري» التبادلي التام الرضائي الملزم للجانبين وفق أحكام المادة 4 من مدونة الحقوق العينية وتعديلها بموجب القانون 41.24 ومقتضيات الفصلين 574 وما يليه و584 وما يليه من ظهير الالتزامات والعقود.

ثالثاً: تعيين العقار محل الوعد بالبيع:
-----------------------------------
وعد الطرف الواعد بأن يبيع ويتخلى ويفوت للموعود له بالشراء العقار الآتي مشخصاته ومشتملاته:
${propertySectionText}

رابعاً: الثمن المتفق عليه وكيفية الأداء والوفاء:
--------------------------------------------
1. الثمن الإجمالي للبيع النهائي: حدد الثمن الإجمالي الجزافي للبيع النهائي في مبلغ قدره:
   ${totalPrice.toLocaleString()} درهم (فقط ${totalPriceWords} درهماً لا غير).
2. العربون والتسبيق المؤدى معجلاً: أدى الطرف الموعود له بالشراء للواعد بمجلس هذا الرسم مبلغا قدره:
   ${earnest.toLocaleString()} درهم (فقط ${earnestWords} درهماً لا غير) بواسطة ${earnestMethod} ${finance.earnestReference ? `(مرجع: ${finance.earnestReference} لدى بنك ${finance.earnestBankName || '---'})` : ''}، اعترف الواعد بقبضه إبراء تاما مقيدا بشروط هذا الوعد.
3. باقي الثمن: يتبقى في ذمة الموعود له بالشراء مبلغ قدره:
   ${remaining.toLocaleString()} درهم (فقط ${remainingWords} درهماً لا غير) يلتزم بأدائه عند إبرام عقد البيع النهائي وحسب الاتفاق المسطور.
${finance.hasInstallments && finance.installments && finance.installments.length > 0 ? `
جدول أداء الدفعات المتفق عليها:
${finance.installments.map(ins => `- الدفعة رقم (${ins.installmentNumber}): بمبلغ ${ins.amount.toLocaleString()} درهم بتاريخ استحقاق ${ins.dueDate} بواسطة ${ins.paymentMethod} (الحالة: ${ins.status})`).join('\n')}
` : ''}

خامساً: أجل إتمام البيع النهائي والشروط الواقفة:
---------------------------------------------
1. أجل البيع النهائي: التزم الطرفان التزاماً قاطعاً بالمثول أمام العدلين لإبرام رسم البيع النهائي ${deadlineText}.
2. الشروط الواقفة والالتزامات المتبادلة:
${suspensiveConditionsText}
3. قاعدة العربون والشرط الجزائي:
${earnestRuleClause}
${finance.penaltyClauseText ? `الشرط الجزائي الإضافي: ${finance.penaltyClauseText}` : ''}

سادساً: التحملات والتسجيل والضمانات:
---------------------------------
- يلتزم الواعد بالبيع بضمان الاستحقاق والعيوب الخفية وعدم التعرض طبقاً للقانون، وبالمحافظة على العقار وتسليمه بحالته الراهنة فور إبرام البيع النهائي واستيفاء كامل الثمن.
- تم إشعار الطرفين بوجوب تسجيل هذا الوعد لدى إدارة التسجيل والضرائب واستيفاء رسم التمبر القانوني وفق المقتضيات الجبائية الجاري بها العمل.

وعلى هذا التراضي التام والمشارطة والالتزام حضر الطرفان، وتليت عليهما فصول هذا الرسم وفهما مدلوله وارتضياه بحضور الشاهدين العدلين المنتصبين للإشهاد، وحفظ للعدل الأول وحرر في تاريخه المذكور أعلاه.

توقيع الواعد(ين) بالبيع: ________________________
توقيع الموعود له(م) بالشراء: ____________________
توقيع العدل الأول: ____________________________
توقيع العدل الثاني: ____________________________
`.trim();
}

// ============================================================================
// SALE PERSON DRAFT GENERATOR (رسم البيع والشراء – الشخص الطبيعي/العادي)
// وفق المادة 4 من القانون 39.08 وظهير الالتزامات والعقود
// ============================================================================

export function generateSalePersonDraft(state: FeesAgentState): string {
  if (!state) return '';
  const meta: DocumentMeta = state.meta || { fileNumber: '', dateGregorian: '', dateHijri: '', notaryPrimary: '', notarySecondary: '', additionalDocuments: [], court: '', hourInWords: '', dateGregorianInWords: '', dateHijriInWords: '' };
  const sale = state.salePersonDeed;
  
  // Court and Notary Metadata
  const appellateCourt = formatCourtName((meta as any)?.appellateCourt || (state.preReceptionVerification as any)?.appellateCourt) || 'طنجة';
  const courtName = formatCourtName(sale?.court || meta.court || state.preReceptionVerification?.primaryCourt) || 'طنجة';
  const courtSection = sale?.section || meta.courtSection || 'قسم قضاء الأسرة والتوثيق';
  const regBook = (meta as any).registryBookType || 'كناش المعاملات العقارية';
  const regNum = meta.registryNumber || state.preReceptionVerification?.registryRecord?.number || '---';
  const regPage = meta.registryPage || state.preReceptionVerification?.registryRecord?.page || '---';
  const regCount = meta.registryCount || state.preReceptionVerification?.registryRecord?.count || '---';
  const regDate = sale?.intakeDate || meta.dateGregorian || state.preReceptionVerification?.receptionDate || new Date().toISOString().split('T')[0];
  const dateHijri = meta.dateHijri || convertGregorianToHijri(regDate);
  const notary1 = sale?.notaryPrimary || meta.notaryPrimary || state.preReceptionVerification?.notary1Name || 'العدل الأول';
  const notary2 = sale?.notarySecondary || meta.notarySecondary || state.preReceptionVerification?.notary2Name || 'العدل الثاني';

  // Sellers (البائعون)
  let sellersList = (sale?.sellers && sale.sellers.length > 0)
    ? sale.sellers
    : (state.sellers && state.sellers.length > 0)
    ? state.sellers.map(s => ({
        id: s.id || '',
        fullName: s.name || '',
        idNumber: s.idNumber || '',
        dateOfBirth: s.dateOfBirth || '',
        placeOfBirth: s.placeOfBirth || '',
        nationality: (s.nationality as any) || 'مغربي',
        profession: s.profession || '',
        address: s.address || '',
        share: s.share || '',
        representationMode: (s.hasSpecialProxy === 'نعم' || s.proxyName ? 'وكيل' : 'شخصي') as any,
        poaInfo: s.proxyName ? {
          court: s.proxyDeedNotary || '',
          registryBook: s.proxyDeedBook || '',
          page: s.proxyDeedPage || '',
          count: s.proxyDeedNumber || '',
          date: s.proxyDeedDate || '',
          agentFullName: s.proxyName || '',
          agentCin: s.proxyNationalID || '',
          agentAddress: s.proxyAddress || '',
          isRealEstatePoa: false,
        } : undefined,
      }))
    : [];

  const sellersText = sellersList.length > 0 ? sellersList.map((s, idx) => {
    let repClause = '';
    if (s.representationMode === 'وكيل' && s.poaInfo) {
      const p = s.poaInfo;
      const localRegClause = p.isRealEstatePoa && p.localRegistryInfo?.localRegistryNumber
        ? `، والمقيدة بالسجل المحلي للوكالات المتعلقة بالحقوق العينية بالمحكمة الابتدائية بـ (${p.localRegistryInfo.court || courtName}) تحت رقم (${p.localRegistryInfo.localRegistryNumber}) وتاريخ (${p.localRegistryInfo.registrationDate || '---'}) طبقاً للمرسوم 2.23.101`
        : '';
      repClause = `، وينوب عنه بوكالة ${p.poaNature || 'خاصة'} السيد(ة) ${p.agentFullName || 'الوكيل'} (ب.ت.و: ${p.agentCin || '---'}) بموجب الرسم المضمن بكناش (${p.registryBook || '---'}) عدد (${p.count || '---'}) صحيفة (${p.page || '---'}) وتاريخ (${p.date || '---'}) توثيق محكمة (${p.court || courtName})${localRegClause}`;
    } else if (s.representationMode === 'ممثل_قانوني') {
      repClause = `، بحضور نائبه القانوني طبقاً لمقتضيات المادتين 209 و210 من مدونة الأسرة`;
    } else {
      repClause = `، والمتصرف أصالة عن نفسه وبكامل أهليته المعتبرة قانوناً`;
    }

    const shareText = s.share ? `، وبحصة قدرها [${s.share}] في العقار المبيع` : '';
    return `${idx + 1}. السيد(ة) ${s.fullName || '---'}${s.fatherName ? ` بن ${s.fatherName}` : ''}${s.motherName ? ` وأمه ${s.motherName}` : ''}، المزداد(ة) في ${s.dateOfBirth || '---'} بـ ${s.placeOfBirth || '---'}، جنسيته(ا) ${s.nationality || 'مغربية'}، مهنته(ا) ${s.profession || '---'}، الساكن(ة) بـ ${s.address || '---'}، الحامل(ة) للبطاقة الوطنية للتعريف رقم ${s.idNumber || '---'}${shareText}${repClause}.`;
  }).join('\n') : 'الطرف البائع: [لم يتم إدخال بيانات البائعين]';

  // Buyers (المشترون)
  let buyersList = (sale?.buyers && sale.buyers.length > 0)
    ? sale.buyers
    : (state.buyers && state.buyers.length > 0)
    ? state.buyers.map(b => ({
        id: b.id || '',
        fullName: b.name || '',
        idNumber: b.idNumber || '',
        dateOfBirth: b.dateOfBirth || '',
        placeOfBirth: b.placeOfBirth || '',
        nationality: (b.nationality as any) || 'مغربي',
        profession: b.profession || '',
        address: b.address || '',
        share: b.share || '',
        representationMode: (b.hasSpecialProxy === 'نعم' || b.proxyName ? 'وكيل' : 'شخصي') as any,
        poaInfo: b.proxyName ? {
          court: b.proxyDeedNotary || '',
          registryBook: b.proxyDeedBook || '',
          page: b.proxyDeedPage || '',
          count: b.proxyDeedNumber || '',
          date: b.proxyDeedDate || '',
          agentFullName: b.proxyName || '',
          agentCin: b.proxyNationalID || '',
          agentAddress: b.proxyAddress || '',
          isRealEstatePoa: false,
        } : undefined,
      }))
    : [];

  const buyersText = buyersList.length > 0 ? buyersList.map((b, idx) => {
    let repClause = '';
    if (b.representationMode === 'وكيل' && b.poaInfo) {
      const p = b.poaInfo;
      const localRegClause = p.isRealEstatePoa && p.localRegistryInfo?.localRegistryNumber
        ? `، والمقيدة بالسجل المحلي للوكالات المتعلقة بالحقوق العينية بالمحكمة الابتدائية بـ (${p.localRegistryInfo.court || courtName}) تحت رقم (${p.localRegistryInfo.localRegistryNumber}) وتاريخ (${p.localRegistryInfo.registrationDate || '---'}) طبقاً للمرسوم 2.23.101`
        : '';
      repClause = `، وينوب عنه بوكالة ${p.poaNature || 'خاصة'} السيد(ة) ${p.agentFullName || 'الوكيل'} (ب.ت.و: ${p.agentCin || '---'}) بموجب الرسم المضمن بكناش (${p.registryBook || '---'}) عدد (${p.count || '---'}) صحيفة (${p.page || '---'}) وتاريخ (${p.date || '---'}) توثيق محكمة (${p.court || courtName})${localRegClause}`;
    } else {
      repClause = `، المشتري لنفسه وبماله الخاص بكامل الأهلية الشرعية والقانونية`;
    }

    const shareText = b.share ? `، ويقتني حصة قدرها [${b.share}]` : (buyersList.length > 1 ? `، على الشياع بالسوية بينهم` : `، لجميع كامل الملك المبيع`);
    return `${idx + 1}. السيد(ة) ${b.fullName || '---'}${b.fatherName ? ` بن ${b.fatherName}` : ''}${b.motherName ? ` وأمه ${b.motherName}` : ''}، المزداد(ة) في ${b.dateOfBirth || '---'} بـ ${b.placeOfBirth || '---'}، جنسيته(ا) ${b.nationality || 'مغربية'}، مهنته(ا) ${b.profession || '---'}، الساكن(ة) بـ ${b.address || '---'}، الحامل(ة) للبطاقة الوطنية للتعريف رقم ${b.idNumber || '---'}${shareText}${repClause}.`;
  }).join('\n') : 'الطرف المشتري: [لم يتم إدخال بيانات المشترين]';

  // Property Details (العقار)
  const prop: Partial<SalePersonPropertyDetails> = sale?.property || {};
  const legacyProp = state.properties?.[0];
  const status = prop.propertyStatus || (legacyProp?.type === 'محفظ' ? 'محفظ' : legacyProp?.type === 'غير_محفظ' ? 'غير_محفظ' : 'محفظ');
  
  let propertySectionText = '';
  if (status === 'محفظ') {
    const titleNum = prop.titleNumber || legacyProp?.titleNumber || '---';
    const office = prop.landRegistryOffice || 'المحافظة العقارية المختصة';
    const owners = prop.registeredOwners ? `في اسم المالكين المقيدين: ${prop.registeredOwners} (الحصص: ${prop.registeredShares || 'الكل'})` : '';
    const certRef = prop.ownershipCertRef ? `، استناداً إلى شهادة الملكية عدد ${prop.ownershipCertRef} الصادرة بتاريخ ${prop.lastOwnershipCertDate || '---'}` : '';
    const coOwnerText = prop.isCoOwnership ? `\n- الملكية المشتركة: العقار خاضع لنظام الملكية المشتركة (القانون 18.00 المعدل بالقانون 106.12)، الوحدة المبيعة رقم (${prop.coOwnershipUnitNumber || '---'}) بالطابق (${prop.coOwnershipFloor || '---'}) شقة رقم (${prop.coOwnershipApartmentNumber || '---'}) مساحتها المفرزة (${prop.coOwnershipUnitArea || '---'} م²) وبحصة مشاعة في الأجزاء المشتركة قدرها (${prop.coOwnershipCommonPartsShare || '---'}).` : '';

    propertySectionText = `[ العقار المبيع محفظ ]:
- الرسم العقاري عدد: [ ${titleNum} ] الممسوك لدى المحافظة العقارية بـ [ ${office} ].
- ${owners}${certRef}
- النوع والمكونات: ${prop.propertyType || legacyProp?.propertyName || 'عقار مبني'}، المشتمل على ${prop.components || 'كافة المرافق والمنافع'}.
- الموقع: ${prop.exactAddress || legacyProp?.location || 'العنوان المذكور أعلاه'}، جماعة ${prop.commune || '---'}.
- المساحة: ${prop.areaNumber || legacyProp?.area_m2 || '---'} ${prop.areaUnit || 'متر مربع'}${prop.areaInWords ? ` (${prop.areaInWords})` : ''}.
- الحدود: شمالاً: ${prop.boundaries?.north || legacyProp?.boundaries?.north || '---'} | جنوباً: ${prop.boundaries?.south || legacyProp?.boundaries?.south || '---'} | شرقاً: ${prop.boundaries?.east || legacyProp?.boundaries?.east || '---'} | غرباً: ${prop.boundaries?.west || legacyProp?.boundaries?.west || '---'}.${coOwnerText}`;
  } else if (status === 'في_طور_التحفيظ') {
    const reqNum = prop.requisitionNumber || '---';
    const reqDate = prop.requisitionDate || '---';
    const reqApplicant = prop.requisitionApplicant || 'البائع';
    const oppText = prop.hasOppositions === 'نعم' ? `توجد تعرضات مقيدة بمطلب التحفيظ: (${prop.oppositionsDetails || 'جارية معالجتها'})` : 'خالٍ من أي تعرض مقيد بمطلب التحفيظ حسب آخر بيان صادر عن المحافظة العقارية';

    propertySectionText = `[ العقار المبيع في طور التحفيظ - لا يحمل رسماً عقارياً نهائياً ]:
- موضوع مطلب التحفيظ عدد: [ ${reqNum} ] المودع بالمحافظة العقارية بـ [ ${prop.landRegistryOffice || 'المحافظة المختصة'} ] بتاريخ [ ${reqDate} ].
- طالب التحفيظ: ${reqApplicant}.
- وضعية التعرضات: ${oppText}.
- النوع والموقع: ${prop.propertyType || 'عقار'} الواقع بـ ${prop.exactAddress || '---'}، جماعة ${prop.commune || '---'}.
- المساحة والحدود: بمساحة تقدر بـ ${prop.areaNumber || '---'} ${prop.areaUnit || 'متر مربع'}، حدوده: شمالاً: ${prop.boundaries?.north || '---'} | جنوباً: ${prop.boundaries?.south || '---'} | شرقاً: ${prop.boundaries?.east || '---'} | غرباً: ${prop.boundaries?.west || '---'}.`;
  } else {
    // Unregistered (غير محفظ / ملك عادي)
    const chainText = (sale?.titleChain && sale.titleChain.length > 0)
      ? `\n- سلسلة أصل الملكية وتداول الحق: ${sale.titleChain.map((c, i) => `(سند ${i+1}: ${c.deedType} الصادر عن ${c.court || '---'} بتاريخ ${c.deedDate || '---'} من سلفه ${c.previousOwner || '---'})`).join(' -> ')}`
      : '';

    propertySectionText = `[ العقار المبيع غير محفظ (ملك تام) ]:
- أصل التملك وسنده: تملك البائع(ون) للمبيع بموجب رسم ${prop.originDeedType || 'شراء'} مضمن بكناش ${prop.originDeedBook || '---'} صحيفة ${prop.originDeedPage || '---'} عدد ${prop.originDeedCount || '---'} بتاريخ ${prop.originDeedDate || '---'} توثيق ${prop.originDeedCourt || courtName}، ${prop.acquisitionMethod || 'بالشراء الصحيح والمخالصة التامة'}.${chainText}
- الموقع والتعيين: ${prop.propertyType || 'عقار'} الكائن بـ ${prop.exactAddress || prop.douar || '---'}، جماعة ${prop.commune || '---'}.
- المساحة التقديرية: ${prop.areaNumber || '---'} ${prop.areaUnit || 'متر مربع'}${prop.areaInWords ? ` (${prop.areaInWords})` : ''}.
- الحدود الأربعة المعتبرة:
  * شمالاً: ${prop.boundaries?.north || '---'}
  * جنوباً: ${prop.boundaries?.south || '---'}
  * شرقاً: ${prop.boundaries?.east || '---'}
  * غرباً: ${prop.boundaries?.west || '---'}
- ما يشتمل عليه العقار: ${prop.components || 'كافة البنايات والمرافق والمنافع والارتفاقات الداخلة والخارجة التابعة له دون استثناء'}${prop.treesAndPlantations ? `، وما به من أشجار ومغروسات: ${prop.treesAndPlantations}` : ''}${prop.waterAndPassageRights ? `، وحقوق الماء والمرور: ${prop.waterAndPassageRights}` : ''}.`;
  }

  // Encumbrances (التحملات)
  let encumbrancesText = 'صرح الطرف البائع وأكد أن العقار المبيع طاهر وخالٍ من أي رهن رسمي أو حيازي أو حجز عقاري أو تقييد احتياطي أو ارتفاق غير ظاهر أو أي تحمل عيني يعرقل نقل الملكية والتصرف التام للمشتري.';
  if (sale?.hasEncumbrances === 'نعم' && sale.encumbrances && sale.encumbrances.length > 0) {
    encumbrancesText = `صرح الطرفان بوجود التحملات الآتية على العقار وطريقة معالجتها والاتفاق حولها:
${sale.encumbrances.map((e, idx) => `- تحمل (${idx + 1}) [${e.encumbranceType}]: لفائدة ${e.beneficiary} (مرجع: ${e.reference || '---'} وتاريخ: ${e.date || '---'}) - طريقة المعالجة المقررة: ${e.resolutionChoice === 'رفع_قبل_البيع' ? 'التزم البائع برفع هذا التحمل وتشطيبه قبل إتمام التسجيل النهائي' : e.resolutionChoice === 'رفع_بالتزامن' ? 'يتم التشطيب بالتزامن عبر خصم مبالغ الدين من ثمن البيع وإيداعها مباشرة' : e.resolutionChoice === 'بقاء_التحمل' ? 'قبل المشتري بالتحمل مع تحمله لكافة آثاره القانونية' : 'توجد موافقة كتابية صريحة من صاحب الحق'}.`).join('\n')}`;
  }

  // Price & Payment (الثمن والأداء)
  const fin: Partial<SaleFinanceDetails> = sale?.finance || {};
  const legacyFin = state.finance || { price: 0, priceInWords: '', paymentMethod: '' };
  const priceVal = fin.totalPrice || legacyFin.price || 0;
  const priceWords = fin.totalPriceInWords || legacyFin.priceInWords || (priceVal ? convertNumberToArabicWords(priceVal) : '---');
  
  let paymentText = '';
  if (fin.hasEarnest && fin.earnestAmount) {
    paymentText = `وقع هذا البيع بثمن إجمالي قدره [ ${priceVal.toLocaleString()} درهم ] (${priceWords})، أدى منه المشتري تسبيقاً معجلاً بمجلس العقد مبلغا قدره [ ${fin.earnestAmount.toLocaleString()} درهم ] (${fin.earnestAmountInWords || convertNumberToArabicWords(fin.earnestAmount)}) بواسطة (${fin.earnestPaymentMethod || 'نقد'}) ${fin.earnestReference ? `(مرجع: ${fin.earnestReference} لدى بنك ${fin.earnestBank || '---'})` : ''}، اعترف البائع بقبضه وبرئ المشتري منه براءة قبض، والباقي وقدره [ ${(fin.remainingAmount || (priceVal - fin.earnestAmount)).toLocaleString()} درهم ] (${fin.remainingAmountInWords || convertNumberToArabicWords(fin.remainingAmount || (priceVal - fin.earnestAmount))}) يلتزم المشتري بوفائه ${fin.remainingDueDate ? `في أجل أقصاه ${fin.remainingDueDate}` : 'طبقاً للجدول والشروط المسطورة أدناه'}.`;
  } else if (fin.hasInstallments && fin.installments && fin.installments.length > 0) {
    paymentText = `وقع هذا البيع بثمن إجمالي قدره [ ${priceVal.toLocaleString()} درهم ] (${priceWords})، يؤدى على دفعات مجدولة كالآتي:
${fin.installments.map(ins => `- الدفعة (${ins.number}): مبلغ ${ins.amount.toLocaleString()} درهم تستحق في ${ins.dueDate} بواسطة ${ins.paymentMethod}`).join('\n')}`;
  } else if (fin.hasInKindExchange) {
    paymentText = `وقع هذا البيع بمعاوضة وعوض عيني يتمثل في: (${fin.inKindNature || 'عقار/منقول'}) المقوم باتفاق الطرفين بمبلغ قدره [ ${(fin.inKindValue || priceVal).toLocaleString()} درهم ] (${priceWords}) بموجب سند التملك (${fin.inKindTitleOrigin || '---'}).`;
  } else {
    const pMethods = (fin.paymentMethods && fin.paymentMethods.length > 0) ? fin.paymentMethods.join(' و ') : (legacyFin.paymentMethod || 'نقداً بمجلس العقد');
    paymentText = `وقع هذا البيع وانعقد بثمن إجمالي اتفاقي قطعي لا رجوع فيه قدره ونهايته: [ ${priceVal.toLocaleString()} درهم ] (فقط ${priceWords} درهماً لا غير)، أداه المشتري كاملاً وموفوراً للبائع بواسطة (${pMethods})، اعترف البائع بقبضه وحيازته بمجلس الإشهاد الإبراء التام، ولم يبق له في ذمة المشتري أي حق أو درهم.`;
  }

  // Delivery & Possession
  const deliveryText = `تخلى البائع تخلياً تاماً عن حيازته للمبيع وملكيته ورقابته لفائدة المشتري المذكور، وسلمه إياه بالمعاينة والمشاهدة التامة، وصار المشتري مالكاً للمبيع يتصرف فيه تصرف المالك في ملكه وخاص ماله، مع التزام البائع التام بضمان درك الاستحقاق والعيوب الخفية طبقاً لمقتضيات قانون الالتزامات والعقود.`;

  return `================================================================================
                         المملكة المغربية - وزارة العدل
دائرة محكمة الاستئناف بـ ${appellateCourt} - المحكمة الابتدائية بـ ${courtName} (${courtSection})
سجل البيانات: كناش ${regBook} | رقم: ${regNum} | صحيفة: ${regPage} | عدد: ${regCount}
بتاريخ: ${regDate} موافق ${dateHijri} هـ
العدلان المنتصبان للإشهاد: ${notary1} و ${notary2}
================================================================================

                          رسم بيع وشراء عقاري
           (محرر رسمي تام الركن صادر عن التوثيق العدلي وفق المادة 4 من القانون 39.08
                 المتعلق بمدونة الحقوق العينية وظهير الالتزامات والعقود)

الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وآله وصحبه.
على الساعة ${meta.hourInWords || 'المباركة القانونية'} من يوم ${getArabicWeekdayName(regDate) || 'اليوم'} ${meta.dateGregorianInWords ? `الموافق لـ ${meta.dateGregorianInWords}` : regDate} ميلادية،
حضر لدى عدلي التوثيق الموقعين أسفله، المنتصبين للإشهاد بدائرة المحكمة الابتدائية بـ ${courtName}:

أولاً: أطراف العقد:
------------------
[ الطرف البائع ]:
${sellersText}

[ الطرف المشتري ]:
${buyersText}

وبعد تعريف العدلين للأطراف المذكورين الهوية التامة والقدر المعتبر شرعاً وقانوناً، شهدوا وتصادقوا بكامل الأهلية والرضا على ما يلي:

ثانياً: البيع وتعيين العقار المبيع:
----------------------------------
باع البائعون وأسقطوا وتخلوا بجميع الضمانات القانونية والفعلية للمشترين المذكورين القابلين لذلك منهم العقار الآتي مشخصاته ومشتملاته:
${propertySectionText}

ثالثاً: سلامة العقار من التحملات:
---------------------------------
${encumbrancesText}

رابعاً: الثمن المتفق عليه وكيفية الأداء والوفاء:
--------------------------------------------
${paymentText}

خامساً: التسليم والحيازة والضمان:
---------------------------------
${deliveryText}
${sale?.terms?.specialConditions && sale.terms.specialConditions.length > 0 ? `
الشروط والاتفاقات الخاصة:
${sale.terms.specialConditions.map((c, i) => `- شرط (${i+1}) [${c.type}]: «${c.description}» (${c.isBindingLegal ? 'شرط ملزم قانوناً' : 'شرط اتفاقي'}).`).join('\n')}
` : ''}

سادساً: التكاليف والالتزامات الجبائية:
------------------------------------
تم إشعار الطرفين بالمقتضيات الجبائية المعمول بها وبوجوب تسجيل هذا الرسم لدى مصلحة التسجيل والتمبر المختصة واستيفاء واجبات التمبر والتسجيل وفق المدونة العامة للضرائب.

وبما ذكر صرح الطرفان والتزما، وبمقتضاه تراضيا، وتليت عليهما فصول هذا الرسم وفهما مضمونه وارتضياه بحضور الشاهدين العدلين المنتصبين للإشهاد، وحفظ للعدل الأول وحرر في تاريخه المبارك أعلاه.

توقيع البائع(ين): ________________________
توقيع المشتري(ين): ______________________
توقيع العدل الأول: ______________________
توقيع العدل الثاني: ______________________
`.trim();
}

export function generateSaleEntityDraft(state: FeesAgentState): string {
  if (!state) return '';
  const meta: DocumentMeta = state.meta || { fileNumber: '', dateGregorian: '', dateHijri: '', notaryPrimary: '', notarySecondary: '', additionalDocuments: [], court: '', hourInWords: '', dateGregorianInWords: '', dateHijriInWords: '' };
  const sale = state.saleEntityDeed;
  
  // Court and Notary Metadata
  const appellateCourt = formatCourtName((meta as any)?.appellateCourt || (state.preReceptionVerification as any)?.appellateCourt) || 'طنجة';
  const courtName = formatCourtName(sale?.court || meta.court || state.preReceptionVerification?.primaryCourt) || 'طنجة';
  const courtSection = sale?.section || meta.courtSection || 'قسم قضاء الأسرة والتوثيق';
  const regBook = (meta as any).registryBookType || 'كناش المعاملات العقارية';
  const regNum = meta.registryNumber || state.preReceptionVerification?.registryRecord?.number || '---';
  const regPage = meta.registryPage || state.preReceptionVerification?.registryRecord?.page || '---';
  const regCount = meta.registryCount || state.preReceptionVerification?.registryRecord?.count || '---';
  const regDate = sale?.intakeDate || meta.dateGregorian || state.preReceptionVerification?.receptionDate || new Date().toISOString().split('T')[0];
  const dateHijri = meta.dateHijri || convertGregorianToHijri(regDate);
  const notary1 = sale?.notaryPrimary || meta.notaryPrimary || state.preReceptionVerification?.notary1Name || 'العدل الأول';
  const notary2 = sale?.notarySecondary || meta.notarySecondary || state.preReceptionVerification?.notary2Name || 'العدل الثاني';

  // Sellers (البائعون)
  let sellersList = (sale?.sellers && sale.sellers.length > 0)
    ? sale.sellers
    : (state.sellers && state.sellers.length > 0)
    ? state.sellers.map(s => ({
        id: s.id || '',
        fullName: s.name || '',
        idNumber: s.idNumber || '',
        dateOfBirth: s.dateOfBirth || '',
        placeOfBirth: s.placeOfBirth || '',
        nationality: (s.nationality as any) || 'مغربي',
        profession: s.profession || '',
        address: s.address || '',
        share: s.share || '',
        representationMode: (s.hasSpecialProxy === 'نعم' || s.proxyName ? 'وكيل' : 'شخصي') as any,
        poaInfo: s.proxyName ? {
          court: s.proxyDeedNotary || '',
          registryBook: s.proxyDeedBook || '',
          page: s.proxyDeedPage || '',
          count: s.proxyDeedNumber || '',
          date: s.proxyDeedDate || '',
          agentFullName: s.proxyName || '',
          agentCin: s.proxyNationalID || '',
          agentAddress: s.proxyAddress || '',
          isRealEstatePoa: false,
        } : undefined,
      }))
    : [];

  const sellersText = sellersList.length > 0 ? sellersList.map((s, idx) => {
    let repClause = '';
    if (s.representationMode === 'وكيل' && s.poaInfo) {
      const p = s.poaInfo;
      const localRegClause = p.isRealEstatePoa && p.localRegistryInfo?.localRegistryNumber
        ? `، والمقيدة بالسجل المحلي للوكالات المتعلقة بالحقوق العينية بالمحكمة الابتدائية بـ (${p.localRegistryInfo.court || courtName}) تحت رقم (${p.localRegistryInfo.localRegistryNumber}) وتاريخ (${p.localRegistryInfo.registrationDate || '---'}) طبقاً للمرسوم 2.23.101`
        : '';
      repClause = `، وينوب عنه بوكالة ${p.poaNature || 'خاصة'} السيد(ة) ${p.agentFullName || 'الوكيل'} (ب.ت.و: ${p.agentCin || '---'}) بموجب الرسم المضمن بكناش (${p.registryBook || '---'}) عدد (${p.count || '---'}) صحيفة (${p.page || '---'}) وتاريخ (${p.date || '---'}) توثيق محكمة (${p.court || courtName})${localRegClause}`;
    } else if (s.representationMode === 'ممثل_قانوني') {
      repClause = `، بحضور نائبه القانوني طبقاً لمقتضيات المادتين 209 و210 من مدونة الأسرة`;
    } else {
      repClause = `، والمتصرف أصالة عن نفسه وبكامل أهليته المعتبرة قانوناً`;
    }

    const shareText = s.share ? `، وبحصة قدرها [${s.share}] في العقار المبيع` : '';
    return `${idx + 1}. السيد(ة) ${s.fullName || '---'}${s.fatherName ? ` بن ${s.fatherName}` : ''}${s.motherName ? ` وأمه ${s.motherName}` : ''}، المزداد(ة) في ${s.dateOfBirth || '---'} بـ ${s.placeOfBirth || '---'}، جنسيته(ا) ${s.nationality || 'مغربية'}، مهنته(ا) ${s.profession || '---'}، الساكن(ة) بـ ${s.address || '---'}، الحامل(ة) للبطاقة الوطنية للتعريف رقم ${s.idNumber || '---'}${shareText}${repClause}.`;
  }).join('\n') : 'الطرف البائع: [لم يتم إدخال بيانات البائعين]';

  // Buyer (الشخص المعنوي والممثل القانوني)
  const ent = sale?.buyerEntity;
  const rep = sale?.buyerRepresentative;

  const entityNatureMap: Record<string, string> = {
    'شركة_تجارية': `شركة تجارية${ent?.companySubtype ? ` (${ent.companySubtype})` : ''}`,
    'تعاونية': 'تعاونية خاضعة للقانون 112.12',
    'جمعية': 'جمعية خاضعة للظهير المنظم للجمعيات',
    'مؤسسة_أو_هيئة_عامة': 'مؤسسة / هيئة عامة',
    'شخص_معنوي_آخر': 'شخص معنوي',
    'شخص_معنوي_أجنبي': `شخص معنوي أجنبي تأسس بدولة (${ent?.foreignDetails?.countryOfOrigin || 'أجنبية'})`,
  };

  const natureLabel = ent?.entityNature ? (entityNatureMap[ent.entityNature] || ent.entityNature) : 'شخص معنوي';
  const entityName = ent?.legalName || '---';
  const entityRc = ent?.rcNumber ? `المقيدة بالسجل التجاري بالمحكمة الابتدائية بـ (${ent.rcCourt || courtName}) تحت رقم (${ent.rcNumber})` : 'المقيدة بالسجل التجاري: [قيد الإدخال]';
  const entityIce = ent?.ice ? `، ورقم التعريف الموحد للمقاولة (ICE): ${ent.ice}` : '';
  const entityIf = ent?.ifNumber ? `، والمعرف الضريبي (IF): ${ent.ifNumber}` : '';
  const entityHQ = ent?.headquarters ? `، ومقرها الاجتماعي الكائن بـ: ${ent.headquarters} (${ent.city || ''} ${ent.country || 'المغرب'})` : '';

  // Capacity and Representation
  const repName = rep?.fullName || '---';
  const repCin = rep?.cin || '---';
  const repCapacity = rep?.capacity || 'الممثل القانوني';
  const repSource = rep?.authoritySource ? `بمقتضى (${rep.authoritySource})` : '';
  const repDoc = (rep?.authorityDocNumber || rep?.authorityDocDate) ? ` المضمن تحت رقم (${rep?.authorityDocNumber || '---'}) بتاريخ (${rep?.authorityDocDate || '---'})` : '';
  
  // Joint Signing
  let jointRepText = '';
  if (rep?.representationMode === 'توقيع_مشترك' && rep.secondRepresentative?.fullName) {
    const r2 = rep.secondRepresentative;
    jointRepText = `، وبحضور ومشاركة الممثل القانوني الثاني السيد(ة): ${r2.fullName} (الحامل(ة) للبطاقة الوطنية رقم: ${r2.cin || '---'}) بصفته(ا) ${r2.capacity || 'ممثلاً ثانياً'} للشركة`;
  }

  // Sub-Agent POA (سلسلة التمثيل)
  let subAgentText = '';
  if (rep?.poaChain?.hasSubAgent && rep.poaChain.agentFullName) {
    const poa = rep.poaChain;
    const localReg = poa.isRealEstatePoa && poa.localRegistryNumber
      ? `، والمقيدة بالسجل المحلي للوكالات المتعلقة بالحقوق العينية بالمحكمة الابتدائية بـ (${poa.localRegistryCourt || courtName}) تحت رقم (${poa.localRegistryNumber}) وتاريخ (${poa.localRegistryDate || '---'}) طبقاً للمرسوم 2.23.101`
      : '';
    subAgentText = `، وينوب عن الممثل القانوني المذكور في هذا المجلس بالوكالة الخاصة المفوضة بالشراء السيد(ة): ${poa.agentFullName} (ب.ت.و: ${poa.agentCin || '---'}، والساكن بـ: ${poa.agentAddress || '---'}) بموجب الرسم المضمن بكناش (${poa.poaDeedBook || '---'}) عدد (${poa.poaDeedNumber || '---'}) صحيفة (${poa.poaDeedPage || '---'}) وتاريخ (${poa.poaDeedDate || '---'}) توثيق محكمة (${poa.poaCourt || courtName})${localReg}`;
  }

  // Liquidation or Judicial Receivership clause
  let specialStatusClause = '';
  if (ent?.legalStatus === 'في_طور_التصفية' && ent.liquidationDetails) {
    specialStatusClause = `\n(تنبيه: الشركة في طور التصفية، ويتصرف المصفي بمقتضى سند التعيين: ${ent.liquidationDetails.liquidatorAppointmentDoc || '---'} المؤرخ في: ${ent.liquidationDetails.appointmentDate || '---'} وبحدود الصلاحيات المخولة له قانوناً).`;
  } else if (ent?.legalStatus === 'تحت_مسطرة_قضائية' && ent.judicialProceedingsDetails) {
    specialStatusClause = `\n(تنبيه: الشركة خاضعة لمسطرة قضائية: ${ent.judicialProceedingsDetails.proceedingType || 'صعوبات المقاولة'} لدى محكمة ${ent.judicialProceedingsDetails.court || '---'} ملف رقم ${ent.judicialProceedingsDetails.caseNumber || '---'} ويتصرف السنديك/المسؤول القضائي ${ent.judicialProceedingsDetails.judicialReceiverName || '---'} بإذن من القضاء).`;
  }

  // Special approval / General Assembly
  let specialApprovalText = '';
  if (ent?.specialApproval?.requiresSpecialApproval === 'نعم') {
    const sa = ent.specialApproval;
    specialApprovalText = `\nوالمأذون له في إبرام صفقة شراء هذا العقار بمقتضى مداولة (${sa.authorityType || 'الجمع العام'}) المؤرخة في (${sa.meetingDate || '---'}) محضر عدد (${sa.minutesNumber || '---'}).`;
  }

  const buyerText = `اشترت شركة [ ${entityName} ]، وهي [ ${natureLabel} ]${entityHQ}، ${entityRc}${entityIce}${entityIf}،
في شخص ممثلها القانوني: السيد(ة) ${repName}، الحامل(ة) للبطاقة الوطنية للتعريف رقم [ ${repCin} ]، والساكن(ة) بـ [ ${rep?.address || '---'} ]، المتصرف(ة) بصفته(ا) [ ${repCapacity} ] للشركة المذكورة ${repSource}${repDoc}${jointRepText}${subAgentText}${specialApprovalText}${specialStatusClause}،
والحاضر بالمجلس والموقع أسفله بهذه الصفة التمثيلية المعتبرة قانوناً، والقابل للشراء لفائدة الشخص المعنوي المذكور أعلاه.`;

  // Property Section (محرك العقار المشترك)
  const prop = sale?.property;
  const legacyProp = (state.properties && state.properties.length > 0) ? state.properties[0] : null;
  const status = prop?.propertyStatus || legacyProp?.propertyType || 'محفظ';

  let propertySectionText = '';
  if (status === 'محفظ') {
    propertySectionText = `العقار المحفظ المسمى: [ ${prop?.titleName || legacyProp?.propertyName || '---'} ]، ذي الرسم العقاري عدد: [ ${prop?.titleNumber || legacyProp?.titleDeedNumber || '---'} ]، الكائن بمحافظة: [ ${prop?.conservationOffice || legacyProp?.realEstateOffice || courtName} ]، بموقعه الكائن بـ: [ ${prop?.location || legacyProp?.addressOrLocation || '---'} ]، وتبلغ مساحته الإجمالية: [ ${prop?.areaNumber ? `${prop.areaNumber} ${prop.areaUnit || 'متر مربع'}` : (legacyProp?.area || '---')} ]${prop?.areaInWords ? ` (${prop.areaInWords})` : ''}، ومشخص ومشتمل على: [ ${prop?.components || legacyProp?.boundaries || '---'} ].`;
  } else if (status === 'في_طور_التحفيظ') {
    propertySectionText = `العقار الكائن في طور التحفيظ المسمى: [ ${prop?.titleName || legacyProp?.propertyName || '---'} ]، المودع بمقتضى مطلب التحفيظ عدد: [ ${prop?.requisitionNumber || '---'} ] بتاريخ إيداع: [ ${prop?.requisitionDate || '---'} ] بمحافظة: [ ${prop?.conservationOffice || courtName} ]، الكائن بـ: [ ${prop?.location || legacyProp?.addressOrLocation || '---'} ]، بمساحة قدرها: [ ${prop?.areaNumber ? `${prop.areaNumber} ${prop.areaUnit || 'متر مربع'}` : (legacyProp?.area || '---')} ]، ومشخص ومشتمل على: [ ${prop?.components || '---'} ]. (مع التنبيه التام إلى أن العقار في طور التحفيظ وتخضع حقوق المشتري فيه لمآل مسطرة التحفيظ).`;
  } else {
    // غير محفظ (ملك عدلي)
    propertySectionText = `العقار غير المحفظ (الملك) الكائن بـ: [ ${prop?.location || legacyProp?.addressOrLocation || '---'} ]، مساحته الإجمالية: [ ${prop?.areaNumber ? `${prop.areaNumber} ${prop.areaUnit || 'متر مربع'}` : (legacyProp?.area || '---')} ]، ومشخص ومشتمل على: [ ${prop?.components || '---'} ]، والحدود الأربعة للعقار كالآتي:
- شمالاً: ${prop?.boundaries?.north || '---'}
- جنوباً: ${prop?.boundaries?.south || '---'}
- شرقاً: ${prop?.boundaries?.east || '---'}
- غرباً: ${prop?.boundaries?.west || '---'}
أصل التملك وسند الملكية: يرجع أصل تملك البائع إلى ${prop?.titleOriginDeed || 'الملكية الحيازية المستمرة شرعاً وقانوناً'}، ومستند التملك: (${prop?.titleOriginReferences || '---'}).`;
  }

  // Encumbrances
  let encumbrancesText = 'صرح البائع وشهد بأن العقار المبيع طاهر ومطهر من جميع التحملات والرهون والديون والتكاليف العينية والحجوزات والمنازعات، وأنه يتحمل كامل المسؤولية المدنية والجنائية حيال أي استحقاق يطرأ عليه.';
  if (sale?.hasEncumbrances === 'نعم' && sale.encumbrances && sale.encumbrances.length > 0) {
    encumbrancesText = `يتحمل المبيع بالتحملات والارتفاقات المصرح بها الآتية التي قبلها المشتري ممثلاً في ممثله القانوني:\n` +
      sale.encumbrances.map((e, idx) => `- تحمل (${idx + 1}): [${e.type}] - ${e.description} (${e.status})`).join('\n');
  }

  // Finance & Payment
  const fin = sale?.finance || ({} as any);
  const legacyFin = state.finance || ({} as any);
  const priceVal = fin.totalPrice || legacyFin.price || 0;
  const priceWords = fin.totalPriceInWords || legacyFin.priceInWords || (priceVal ? convertNumberToArabicWords(priceVal) : '---');
  const taxInclusion = fin.isPriceInclusiveOfTaxes ? ' (مع احتساب الرسوم والضرائب المستحقة)' : ' (دون احتساب الرسوم والضرائب التي تبقى على عاتق من يلزم قانوناً)';
  
  // Source of Funds
  const sourceFundsMap: Record<string, string> = {
    'أموال_الشركة': 'أموال الشخص المعنوي الذاتية',
    'تمويل_بنكي': 'تمويل بنكي مصرفي',
    'قرض': 'قرض مالي معتمد',
    'مساهمة_شركاء': 'مساهمة الشركاء في رأس المال/الحساب الجاري',
    'آخر': 'مصادر تمويلية خاصة',
  };
  const sourceFundsText = fin.sourceOfFunds ? `مصدر التمويل المعتمد: [ ${sourceFundsMap[fin.sourceOfFunds] || fin.sourceOfFunds} ]${fin.sourceOfFundsNotes ? ` (${fin.sourceOfFundsNotes})` : ''}.` : '';

  let paymentText = '';
  if (fin.hasEarnest && fin.earnestAmount) {
    paymentText = `وقع هذا الشراء بثمن إجمالي قدره [ ${priceVal.toLocaleString()} درهم ] (${priceWords})${taxInclusion}، أدى منه المشتري (في شخص ممثله القانوني خصماً من حساب الشخص المعنوي) تسبيقاً معجلاً بمجلس العقد مبلغا قدره [ ${fin.earnestAmount.toLocaleString()} درهم ] (${fin.earnestAmountInWords || convertNumberToArabicWords(fin.earnestAmount)}) بواسطة (${fin.earnestPaymentMethod || 'شيك بنكي مصادق عليه'}) ${fin.earnestReference ? `(مرجع: ${fin.earnestReference} مسحوب على بنك ${fin.earnestBank || '---'})` : ''}، اعترف البائع بقبضه وبرئ المشتري منه براءة قبض، والباقي وقدره [ ${(fin.remainingAmount || (priceVal - fin.earnestAmount)).toLocaleString()} درهم ] (${fin.remainingAmountInWords || convertNumberToArabicWords(fin.remainingAmount || (priceVal - fin.earnestAmount))}) يلتزم المشتري بأدائه ${fin.remainingDueDate ? `في أجل أقصاه ${fin.remainingDueDate}` : 'وفق الشروط المتفق عليها'}. ${sourceFundsText}`;
  } else if (fin.hasInstallments && fin.installments && fin.installments.length > 0) {
    paymentText = `وقع هذا الشراء بثمن إجمالي قدره [ ${priceVal.toLocaleString()} درهم ] (${priceWords})${taxInclusion}، يؤدى على أقساط مجدولة من الحساب البنكي للشخص المعنوي كالآتي:
${fin.installments.map((ins: any) => `- القسط (${ins.number}): مبلغ ${ins.amount.toLocaleString()} درهم يستحق في ${ins.dueDate} بواسطة ${ins.paymentMethod}`).join('\n')}
${sourceFundsText}`;
  } else {
    const pMethods = (fin.paymentMethods && fin.paymentMethods.length > 0) ? fin.paymentMethods.join(' و ') : (legacyFin.paymentMethod || 'شيك بنكي مصادق عليه / تحويل بنكي');
    paymentText = `وقع هذا الشراء وانعقد باتفاق نهائي بات لا رجوع فيه بثمن إجمالي قدره ونهايته: [ ${priceVal.toLocaleString()} درهم ] (فقط ${priceWords} درهماً لا غير)${taxInclusion}، أداه المشتري كاملاً وموفوراً للبائع بواسطة (${pMethods}) خصماً من أموال وحسابات الشخص المعنوي، اعترف البائع بحيازته وقبضه التام بمجلس الإشهاد وأبرأ ذمة الشخص المعنوي المشتري وممثله إبراءً كلياً وشاملاً. ${sourceFundsText}`;
  }

  // Delivery & Possession
  const deliveryText = `تخلى البائع تخلياً تاماً وباتاً عن حيازته للمبيع وملكيته ورقابته لفائدة الشركة المشترية في شخص ممثلها القانوني المذكور، وسلم العقار بالحيازة والمعاينة الفعلية التامة، وصار العقار ملكاً خالصاً للشخص المعنوي المشتري يتصرف فيه بكافة أوجه التصرفات المشروعة طبقاً لغرضه الاجتماعي وأنظمته القانونية، مع التزام البائع التام بضمان الاستحقاق والعيوب الخفية طبقاً للقانون.`;

  return `================================================================================
                         المملكة المغربية - وزارة العدل
دائرة محكمة الاستئناف بـ ${appellateCourt} - المحكمة الابتدائية بـ ${courtName} (${courtSection})
سجل البيانات: كناش ${regBook} | رقم: ${regNum} | صحيفة: ${regPage} | عدد: ${regCount}
بتاريخ: ${regDate} موافق ${dateHijri} هـ
العدلان المنتصبان للإشهاد: ${notary1} و ${notary2}
================================================================================

                 رسم شراء عقار لفائدة شخص معنوي
   (محرر رسمي تام الركن صادر عن التوثيق العدلي وفق المادة 4 من القانون 39.08
    المتعلق بمدونة الحقوق العينية وظهير الالتزامات والعقود، والقوانين المنظمة
             للأشخاص المعنوية 5.96 و 17.95 و 112.12 والأنظمة ذات الصلة)

الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وآله وصحبه.
على الساعة ${meta.hourInWords || 'المباركة القانونية'} من يوم ${getArabicWeekdayName(regDate) || 'اليوم'} ${meta.dateGregorianInWords ? `الموافق لـ ${meta.dateGregorianInWords}` : regDate} ميلادية،
حضر لدى عدلي التوثيق الموقعين أسفله، المنتصبين للإشهاد بدائرة المحكمة الابتدائية بـ ${courtName}:

أولاً: أطراف العقد:
------------------
[ الطرف الأول - البائع ]:
${sellersText}

[ الطرف الثاني - المشتري (شخص معنوي) ]:
${buyerText}

وبعد تعريف العدلين للطرفين الهوية التامة والقدر المعتبر شرعاً وقانوناً، والتحقق من صفة الممثل القانوني وأهليته وسريان صلاحياته في تمثيل الشخص المعنوي في إبرام هذا الشراء، شهدوا وتصادقوا بكامل الأهلية والرضا على ما يلي:

ثانياً: البيع وتعيين العقار المبيع:
----------------------------------
باع الطرف البائع وأسقط وتخلى بجميع الضمانات القانونية والفعلية للشركة المشترية المذكورة في شخص ممثلها القانوني المقبول منه ذلك العقار الآتي مشخصاته ومشتملاته:
${propertySectionText}

ثالثاً: سلامة العقار من التحملات:
---------------------------------
${encumbrancesText}

رابعاً: الثمن المتفق عليه وكيفية الأداء والتمويل:
----------------------------------------------
${paymentText}

خامساً: التسليم والحيازة والتصرف:
---------------------------------
${deliveryText}
${sale?.terms?.specialConditions && sale.terms.specialConditions.length > 0 ? `
الشروط والاتفاقات الخاصة:
${sale.terms.specialConditions.map((c, i) => `- شرط (${i+1}) [${c.type}]: «${c.description}» (${c.isBindingLegal ? 'شرط ملزم قانوناً' : 'شرط اتفاقي'}).`).join('\n')}
` : ''}

سادساً: التحقق المؤسساتي والغرض الاجتماعي:
-----------------------------------------
تم التحقق بمجلس العقد من مطابقة عملية الشراء للأحكام القانونية المؤطرة للشخص المعنوي ${ent?.corporatePurpose ? `(الغرض الاجتماعي: ${ent.corporatePurpose})` : ''} واستيفاء الموافقات والقرارات القانونية اللازمة وفق القانون والنظام الأساسي.

سابعاً: التكاليف والالتزامات الجبائية والتسجيل:
--------------------------------------------
تم إشعار الطرفين بالمقتضيات الجبائية المعمول بها وبوجوب تسجيل هذا الرسم لدى مصلحة التسجيل والتمبر المختصة واستيفاء واجبات التمبر والتسجيل وفق المدونة العامة للضرائب، والتقييد بالمحافظة العقارية بالنسبة للعقارات المحفظة أو في طور التحفيظ لنقل الملكية باسم الشخص المعنوي.

وبما ذكر صرح الطرفان والتزما، وبمقتضاه تراضيا، وتليت عليهما فصول هذا الرسم وفهما مضمونه وارتضياه بحضور الشاهدين العدلين المنتصبين للإشهاد، وحفظ للعدل الأول وحرر في تاريخه المبارك أعلاه.

توقيع البائع(ين): ________________________
توقيع الممثل القانوني عن الشخص المعنوي: ______________________
(السيد: ${repName} - بصفته ممثلاً قانونياً لـ ${entityName})
توقيع العدل الأول: ______________________
توقيع العدل الثاني: ______________________
`.trim();
}

export function generateDocumentDraft(state: FeesAgentState): string {
  if (!state) return '';
  const sellers = state.sellers || [];
  const buyers = state.buyers || [];
  const properties = state.properties || [];
  const finance = state.finance || { price: 0, priceInWords: '', paymentMethod: '', transferDetails: '', registeredWithTax: '' };
  const meta: DocumentMeta = state.meta || { fileNumber: '', dateGregorian: '', dateHijri: '', notaryPrimary: '', notarySecondary: '', additionalDocuments: [], court: '', hourInWords: '', dateGregorianInWords: '', dateHijriInWords: '' };
  const documentType = state.documentType || '';

  // Legal Entity Real Estate Purchase (رسم شراء عقار لفائدة شخص معنوي)
  if (documentType === 'بيع_وشراء_معنوي' || (state.saleEntityDeed && !state.salePersonDeed)) {
    if (state.draft && state.draft.trim().length > 20) {
      return state.draft;
    }
    return generateSaleEntityDraft(state);
  }

  // Agent dismissal deed (رسم عزل وكيل)
  if (documentType === 'عزل_وكيل') {
    if (state.draft && state.draft.trim().length > 20) {
      return state.draft;
    }
    return generateAgentDismissalDraft(state);
  }

  // Promise to Sell deed (رسم وعد بالبيع العقاري - المادة 4 من مدونة الحقوق العينية المعدلة بالقانون 41.24)
  if (documentType === 'وعد_بالبيع' || documentType.includes('وعد_بالبيع') || documentType.includes('وعد بالبيع')) {
    if (state.draft && state.draft.trim().length > 20) {
      return state.draft;
    }
    return generatePromiseToSellDraft(state);
  }

  // Real estate sale for natural person (رسم البيع والشراء – الشخص العادي / الذاتي)
  if (documentType === 'بيع_وشراء' || state.salePersonDeed) {
    if (state.draft && state.draft.trim().length > 20) {
      return state.draft;
    }
    return generateSalePersonDraft(state);
  }

  // Marriage and family deeds draft generator
  if ((MARRIAGE_DOCUMENT_TYPES as readonly string[]).includes(documentType)) {
    const husband = sellers[0] || ({} as any);
    const wife = buyers[0] || ({} as any);
    const md = state.marriageDetails || ({} as any);
    const d = state.dowry || ({} as any);

    const courtName = formatCourtName(md.courtName || meta.court || state.preReceptionVerification?.primaryCourt) || 'تطوان';
    const _courtSec = md.courtSection || 'قسم التوثيق وقضاء الأسرة';
    const appellateCourt = formatCourtName((meta as any)?.appellateCourt || (state.preReceptionVerification as any)?.appellateCourt) || 'تطوان';
    const notary1 = meta.notaryPrimary || state.preReceptionVerification?.notary1Name || 'العدل الأول';
    const notary2 = meta.notarySecondary || state.preReceptionVerification?.notary2Name || 'العدل الثاني';

    const regBook = md.registryBookType || 'كناش الأنكحة';
    const regNum = md.registryNumber || meta.registryNumber || state.preReceptionVerification?.registryRecord?.number || '---';
    const regPage = md.registryPage || meta.registryPage || state.preReceptionVerification?.registryRecord?.page || '---';
    const regCount = md.registryCount || meta.registryCount || state.preReceptionVerification?.registryRecord?.count || '---';
    const regDate = md.registryDate || meta.receptionDate || state.preReceptionVerification?.registryRecord?.receptionDate || meta.dateGregorian || '---';

    const memoNum = md.memorandumNumber || md.registryNumber || meta.registryNumber || state.preReceptionVerification?.registryRecord?.number || '---';
    const memoCount = md.memorandumRecordNumber || md.registryCount || meta.registryCount || state.preReceptionVerification?.registryRecord?.count || '---';
    const memoPage = md.memorandumPage || md.registryPage || meta.registryPage || state.preReceptionVerification?.registryRecord?.page || '---';

    const authNum = md.authorizationNumber || (state.preReceptionVerification as any)?.marriageAuthorizationNumber || (meta as any)?.marriageAuthorizationNumber || '---';
    const authDate = md.authorizationDate || (state.preReceptionVerification as any)?.marriageAuthorizationDate || meta.dateGregorian || '---';
    const authCourt = formatCourtName(md.authorizationCourt || md.courtName || meta.court || state.preReceptionVerification?.primaryCourt) || courtName;

    const dowryAmt = md.dowryAmount || d.totalAmount || finance.price || 0;
    const dowryWords = md.dowryAmountInWords || d.totalAmountArabic || finance.priceInWords || (dowryAmt ? convertNumberToArabicWords(dowryAmt) : '---');

    const dowryPayMethod = md.dowryPaymentMethod || d.paymentMethod;
    const dowryPayMethodText = dowryPayMethod === 'عيانا'
      ? 'عيانا بمحضر الشاهدين العدلين'
      : dowryPayMethod === 'معاينة'
      ? 'معاينة'
      : 'اعترافا وتصديقا منها';

    let dowryRecStatus = '';
    if (md.isDowryReceived === 'كاملا' || d.isReceived === 'كاملا') {
      dowryRecStatus = `قبضت الزوجة جميعه قبضا تاما فأبرأته منه براءة تامة (${dowryPayMethodText})`;
    } else if (md.isDowryReceived === 'جزئي' || d.isReceived === 'جزئي') {
      const adv = md.dowryAdvance || d.advance || 0;
      const advWords = md.dowryAdvanceInWords || d.advanceArabic || (adv ? convertNumberToArabicWords(adv) : '---');
      const def = md.dowryDeferred || d.deferred || 0;
      const defWords = md.dowryDeferredInWords || d.deferredArabic || (def ? convertNumberToArabicWords(def) : '---');
      dowryRecStatus = `قبضت منه معجلا قدره ${adv.toLocaleString()} درهم (${advWords}) (${dowryPayMethodText}) والباقي مؤخر كالئ في ذمته قدره ${def.toLocaleString()} درهم (${defWords}) يحل بأقرب الأجلين (الوفاة أو الطلاق)`;
    } else {
      dowryRecStatus = 'صداقا مؤخرا كالئا في ذمة الزوج يحل بأقرب الأجلين (الوفاة أو الطلاق)';
    }

    const otherDowryClause = md.hasOtherDowryItems === 'نعم' && Array.isArray(md.otherDowryItems) && md.otherDowryItems.length > 0
      ? ` بالإضافة إلى الصداق العيني المتفق عليه المتمثل في: ${md.otherDowryItems.join(' و ')}`
      : '';

    const dateGreg = meta.dateGregorian || state.preReceptionVerification?.receptionDate || new Date().toISOString().split('T')[0];
    const dateHijri = meta.dateHijri || md.hijriDate || convertGregorianToHijri(dateGreg);
    const sessionDay = getArabicWeekdayName(dateGreg) || 'اليوم';
    const sessionDateGregWords = md.sessionDateWords || meta.dateGregorianInWords || convertGregorianDateToWords(dateGreg);
    const sessionDateHijriWords = meta.dateHijriInWords || convertHijriDateToWords(dateGreg);

    let sessionTime = md.sessionTimeWords || meta.hourInWords;
    if (!sessionTime) {
      if (meta.time && meta.time.includes(':')) {
        const [h, m] = meta.time.split(':').map(Number);
        if (!isNaN(h)) {
          const dObj = new Date();
          dObj.setHours(h, m || 0, 0, 0);
          sessionTime = convertTimeToWords(dObj);
        }
      }
    }
    if (!sessionTime) {
      sessionTime = 'على الساعة الحادية عشرة صباحا';
    }

    // Husband
    const husbandBirthCert = husband.birthCertificateNumber
      ? `عقد ولادته رقم ${husband.birthCertificateNumber} لسنة ${husband.birthCertificateYear || '---'} جماعة/دائرة ${husband.birthCertificateCommune || husband.birthCertificateCity || '---'}${husband.birthCertificateDate ? ` المؤرخ في ${husband.birthCertificateDate}` : ''}${husband.birthCertificateIssuedBy ? ` المسلم من ${husband.birthCertificateIssuedBy}` : ''}${husband.birthCertificateCountry ? ` بدولة ${husband.birthCertificateCountry}` : ''}`
      : '';
    const husbandIdClause = husband.idNumber
      ? `الحامل للبطاقة الوطنية للتعريف رقم ${husband.idNumber}${(husband.idIssueDate || husband.idExpiryDate) ? ` صالحة إلى غاية ${husband.idIssueDate || husband.idExpiryDate}` : ''}`
      : husband.passportNumber
      ? `الحامل لجواز سفر رقم ${husband.passportNumber}${husband.passportIssuedBy ? ` الصادر عن ${husband.passportIssuedBy}` : ''}${husband.passportValidUntil ? ` صالح إلى ${husband.passportValidUntil}` : ''}`
      : '';
    const husbandNatClause = husband.nationality ? `جنسيته ${husband.nationality}` : '';
    const husbandDivorceDetails = husband.maritalStatus === 'مطلق'
      ? (husband.divorceSource === 'حكم' || husband.divorceCourt
          ? ` بموجب حكم طلاق صادر عن ${husband.divorceCourt || 'المحكمة'} بتاريخ ${husband.divorceJudgmentDate || husband.divorceDeedDate || '---'}${husband.divorceExecutiveFormula ? ` مذيل بالصيغة التنفيذية بتاريخ ${husband.divorceExecutiveDate || '---'}` : ''}${husband.divorceCountry ? ` بدولة ${husband.divorceCountry}` : ''}`
          : (husband.divorceDeedNumber ? ` بموجب رسم طلاق عدد ${husband.divorceDeedNumber}${husband.divorceDeedBook ? ` كناش ${husband.divorceDeedBook}` : ''}${husband.divorceDeedPage ? ` صحيفة ${husband.divorceDeedPage}` : ''} بتاريخ ${husband.divorceDeedDate || '---'}${husband.divorceDeedNotary ? ` توثيق ${husband.divorceDeedNotary}` : ''}` : ''))
      : '';
    const husbandMaritalStatusClause = husband.maritalStatus
      ? `حالته العائلية ${husband.maritalStatus === 'اعزب' ? 'أعزب' : husband.maritalStatus === 'مطلق' ? 'مطلق' : husband.maritalStatus === 'ارمل' ? 'أرمل' : husband.maritalStatus}${husbandDivorceDetails}`
      : '';
    const husbandAdminCert = husband.engagementCertificateNumber
      ? `وحسب الشهادة الإدارية للزواج رقم ${husband.engagementCertificateNumber}${husband.engagementCertificateDate ? ` بتاريخ ${husband.engagementCertificateDate}` : ''}${husband.engagementCertificateCommune || husband.engagementCertificateCity ? ` الصادرة عن جماعة ${husband.engagementCertificateCommune || husband.engagementCertificateCity}` : ''}`
      : '';
    const husbandMedCert = husband.medicalCertificateNumber
      ? `الشهادة الطبية لما قبل الزواج رقم ${husband.medicalCertificateNumber}${husband.medicalCertificateDate ? ` بتاريخ ${husband.medicalCertificateDate}` : ''}${husband.medicalCertificateIssuedBy ? ` المسلمة من ${husband.medicalCertificateIssuedBy}` : ''}${husband.medicalCertificateCity ? ` بـ ${husband.medicalCertificateCity}` : ''}`
      : '';
    const husbandMinorClause = husband.underagePermissionNumber
      ? `المأذون بزواجه دون سن الرشد بمقتضى مقرر قاضي الأسرة رقم ${husband.underagePermissionNumber} بتاريخ ${husband.underagePermissionDate || '---'} بالمحكمة الابتدائية بـ ${husband.underagePermissionCourt || courtName}`
      : '';
    const husbandProxyClause = husband.hasSpecialProxy === 'نعم' && husband.proxyName
      ? `وناب عنه بوكالة خاصة السيد ${husband.proxyName}${husband.proxyFatherName ? ` بن ${husband.proxyFatherName}` : ''}${husband.proxyDOB ? ` المزداد بتاريخ ${husband.proxyDOB}` : ''}${husband.proxyAddress ? ` الساكن بـ ${husband.proxyAddress}` : ''} الحامل لـ ب.ت.و رقم ${husband.proxyNationalID || '---'} بموجب رسم توكيل عدد ${husband.proxyDeedNumber || '---'}${husband.proxyDeedBook ? ` كناش ${husband.proxyDeedBook}` : ''}${husband.proxyDeedPage ? ` صحيفة ${husband.proxyDeedPage}` : ''} وتاريخ ${husband.proxyDeedDate || '---'}${husband.proxyDeedNotary ? ` توثيق ${husband.proxyDeedNotary}` : ''}`
      : '';
    const husbandForeignExtra = [
      husband.residenceCountry ? `المقيم بـ ${husband.residenceCountry}` : '',
      husband.nationalityCertificateIssuedBy ? `شهادة الجنسية المسلمة من ${husband.nationalityCertificateIssuedBy}` : '',
      husband.capacityCertificateIssuedBy ? `شهادة الأهلية للزواج الصادرة عن ${husband.capacityCertificateIssuedBy} بتاريخ ${husband.capacityCertificateDate || '---'}` : '',
      husband.criminalRecordBirthplaceNumber ? `السجل العدلي لبلد المنشأ رقم ${husband.criminalRecordBirthplaceNumber} بتاريخ ${husband.criminalRecordBirthplaceDate || '---'}` : '',
      husband.centralCriminalRecordNumber ? `السجل العدلي المركزي رقم ${husband.centralCriminalRecordNumber} بتاريخ ${husband.centralCriminalRecordDate || '---'}` : '',
    ].filter(Boolean).join('، ');

    // Wife
    const wifeBirthCert = wife.birthCertificateNumber
      ? `عقد ولادتها رقم ${wife.birthCertificateNumber} لسنة ${wife.birthCertificateYear || '---'} جماعة/دائرة ${wife.birthCertificateCommune || wife.birthCertificateCity || '---'}${wife.birthCertificateDate ? ` المؤرخ في ${wife.birthCertificateDate}` : ''}${wife.birthCertificateIssuedBy ? ` المسلم من ${wife.birthCertificateIssuedBy}` : ''}${wife.birthCertificateCountry ? ` بدولة ${wife.birthCertificateCountry}` : ''}`
      : '';
    const wifeIdClause = wife.idNumber
      ? `الحاملة للبطاقة الوطنية للتعريف رقم ${wife.idNumber}${(wife.idIssueDate || wife.idExpiryDate) ? ` صالحة إلى غاية ${wife.idIssueDate || wife.idExpiryDate}` : ''}`
      : wife.passportNumber
      ? `الحاملة لجواز سفر رقم ${wife.passportNumber}${wife.passportIssuedBy ? ` الصادر عن ${wife.passportIssuedBy}` : ''}${wife.passportValidUntil ? ` صالح إلى ${wife.passportValidUntil}` : ''}`
      : '';
    const wifeNatClause = wife.nationality ? `جنسيتها ${wife.nationality}` : '';
    const wifeDivorceDetails = wife.maritalStatus === 'مطلق'
      ? (wife.divorceSource === 'حكم' || wife.divorceCourt
          ? ` بموجب حكم طلاق صادر عن ${wife.divorceCourt || 'المحكمة'} بتاريخ ${wife.divorceJudgmentDate || wife.divorceDeedDate || '---'}${wife.divorceExecutiveFormula ? ` مذيل بالصيغة التنفيذية بتاريخ ${wife.divorceExecutiveDate || '---'}` : ''}${wife.divorceCountry ? ` بدولة ${wife.divorceCountry}` : ''}`
          : (wife.divorceDeedNumber ? ` بموجب رسم طلاق عدد ${wife.divorceDeedNumber}${wife.divorceDeedBook ? ` كناش ${wife.divorceDeedBook}` : ''}${wife.divorceDeedPage ? ` صحيفة ${wife.divorceDeedPage}` : ''} بتاريخ ${wife.divorceDeedDate || '---'}${wife.divorceDeedNotary ? ` توثيق ${wife.divorceDeedNotary}` : ''}` : ''))
      : '';
    const wifeMaritalStatusClause = wife.maritalStatus
      ? `حالتها العائلية ${wife.maritalStatus === 'اعزب' ? 'بكر' : wife.maritalStatus === 'مطلق' ? 'مطلقة' : wife.maritalStatus === 'ارمل' ? 'أرملة' : wife.maritalStatus}${wifeDivorceDetails}`
      : '';
    const wifeAdminCert = wife.engagementCertificateNumber
      ? `وحسب الشهادة الإدارية للزواج رقم ${wife.engagementCertificateNumber}${wife.engagementCertificateDate ? ` بتاريخ ${wife.engagementCertificateDate}` : ''}${wife.engagementCertificateCommune || wife.engagementCertificateCity ? ` الصادرة عن جماعة ${wife.engagementCertificateCommune || wife.engagementCertificateCity}` : ''}`
      : '';
    const wifeMedCert = wife.medicalCertificateNumber
      ? `الشهادة الطبية لما قبل الزواج رقم ${wife.medicalCertificateNumber}${wife.medicalCertificateDate ? ` بتاريخ ${wife.medicalCertificateDate}` : ''}${wife.medicalCertificateIssuedBy ? ` المسلمة من ${wife.medicalCertificateIssuedBy}` : ''}${wife.medicalCertificateCity ? ` بـ ${wife.medicalCertificateCity}` : ''}`
      : '';
    const wifeMinorClause = wife.underagePermissionNumber
      ? `المأذون بزواجها دون سن الرشد بمقتضى مقرر قاضي الأسرة رقم ${wife.underagePermissionNumber} بتاريخ ${wife.underagePermissionDate || '---'} بالمحكمة الابتدائية بـ ${wife.underagePermissionCourt || courtName}`
      : '';
    const wifeProxyClause = wife.hasSpecialProxy === 'نعم' && wife.proxyName
      ? `ونابت عنها بوكالة خاصة السيدة/السيد ${wife.proxyName}${wife.proxyFatherName ? ` بن(ت) ${wife.proxyFatherName}` : ''}${wife.proxyDOB ? ` المزداد(ة) بتاريخ ${wife.proxyDOB}` : ''}${wife.proxyAddress ? ` الساكن(ة) بـ ${wife.proxyAddress}` : ''} الحامل(ة) لـ ب.ت.و رقم ${wife.proxyNationalID || '---'} بموجب رسم توكيل عدد ${wife.proxyDeedNumber || '---'}${wife.proxyDeedBook ? ` كناش ${wife.proxyDeedBook}` : ''}${wife.proxyDeedPage ? ` صحيفة ${wife.proxyDeedPage}` : ''} وتاريخ ${wife.proxyDeedDate || '---'}${wife.proxyDeedNotary ? ` توثيق ${wife.proxyDeedNotary}` : ''}`
      : '';
    const wifeForeignExtra = [
      wife.residenceCountry ? `المقيمة بـ ${wife.residenceCountry}` : '',
      wife.nationalityCertificateIssuedBy ? `شهادة الجنسية المسلمة من ${wife.nationalityCertificateIssuedBy}` : '',
      wife.capacityCertificateIssuedBy ? `شهادة الأهلية للزواج الصادرة عن ${wife.capacityCertificateIssuedBy} بتاريخ ${wife.capacityCertificateDate || '---'}` : '',
      wife.criminalRecordBirthplaceNumber ? `السجل العدلي لبلد المنشأ رقم ${wife.criminalRecordBirthplaceNumber} بتاريخ ${wife.criminalRecordBirthplaceDate || '---'}` : '',
      wife.centralCriminalRecordNumber ? `السجل العدلي المركزي رقم ${wife.centralCriminalRecordNumber} بتاريخ ${wife.centralCriminalRecordDate || '---'}` : '',
    ].filter(Boolean).join('، ');

    const guardianInfo = (wife.contractsWithoutGuardian === 'لا' || (!wife.contractsWithoutGuardian && wife.guardianName)) && wife.guardianName
      ? `وعقد زواجها وليها ${wife.guardianRelationship || 'وليها'}${wife.guardianRelationshipCustom ? ` (${wife.guardianRelationshipCustom})` : ''} السيد ${wife.guardianName}${wife.guardianDOB ? ` المزداد بتاريخ ${wife.guardianDOB}` : ''}${wife.guardianFatherName ? ` ابن ${wife.guardianFatherName}` : ''} مهنته ${wife.guardianProfession || '---'} الساكن بـ ${wife.guardianAddress || 'معها'} بطاقته الوطنية ${wife.guardianNationalID || '---'}`
      : 'وتولت الزوجة الرشيدة عقد زواجها بنفسها طبقا لمقتضيات المادة 25 من مدونة الأسرة';

    const conversionCertClause = md.mixedMarriageForeignParty === 'husband' && md.husbandConvertedToIslam === 'yes' && md.conversionCertificate?.number
      ? ` وثبت إسلام الزوج الأجنبي بمقتضى وثيقة اعتناق الإسلام المضمنة بكناش ${md.conversionCertificate.book || '---'} صحيفة ${md.conversionCertificate.page || '---'} عدد ${md.conversionCertificate.count || '---'} رقم ${md.conversionCertificate.number || '---'} بتاريخ ${md.conversionCertificate.date || '---'} توثيق ${md.conversionCertificate.notary || '---'}`
      : '';

    const condInfo = md.hasSpecialConditions === 'نعم' && md.specialConditionsText
      ? `واشترط${md.specialConditionsOwner ? ` (${md.specialConditionsOwner})` : ''} في العقد ما نصه: « ${md.specialConditionsText} » طبقا للمادتين 47 و 48 من مدونة الأسرة`
      : 'ولم يشترط الزوجان أي شرط خاص طبقا للمادتين 47 و 48 من مدونة الأسرة';

    const art49Info = md.hasAssetManagementAgreement === 'نعم'
      ? 'واتفقا على تدبير الأموال المكتسبة أثناء قيام الزوجية بموجب وثيقة مستقلة طبقا للمادة 49 من مدونة الأسرة'
      : 'وأشعرا بمقتضيات المادة 49 من مدونة الأسرة واكتفيا بأحكام القواعد العامة';

    const witnessesInfo = state.witnesses && state.witnesses.length > 0
      ? `بحضور الشاهدين: ${state.witnesses.map((w: any) => `السيد ${w.name} بطاقته الوطنية رقم ${w.idNumber || '---'}`).join(' و ')}`
      : 'سمع منهما العدلان الشاهدان الإيجاب والقبول الصريحين التامين الرضائيين';

    const husbandFatherInfo = husband.fatherProfession ? `${husband.fatherName || '---'} (مهنته ${husband.fatherProfession})` : (husband.fatherName || '---');
    const husbandMotherInfo = husband.motherProfession ? `${husband.motherName || '---'} (مهنتها ${husband.motherProfession})` : (husband.motherName || '---');

    const husbandParts = [
      `الزوج السيد ${husband.name || '---'}${husband.nameLatin ? ` (${husband.nameLatin})` : ''}`,
      `المزداد بـ ${husband.placeOfBirth || '---'} بتاريخ ${husband.dateOfBirth || '---'}`,
      `من والديه السيد ${husbandFatherInfo} والسيدة ${husbandMotherInfo}`,
      husbandBirthCert,
      `مهنته ${husband.profession || '---'}`,
      `والساكن بـ ${husband.address || '---'}`,
      husbandIdClause,
      husbandNatClause,
      husbandMaritalStatusClause,
      husbandAdminCert,
      husbandMedCert,
      husbandMinorClause,
      husbandProxyClause,
      husbandForeignExtra,
    ].filter(Boolean).join(' ');

    const wifeFatherInfo = wife.fatherProfession ? `${wife.fatherName || '---'} (مهنته ${wife.fatherProfession})` : (wife.fatherName || '---');
    const wifeMotherInfo = wife.motherProfession ? `${wife.motherName || '---'} (مهنتها ${wife.motherProfession})` : (wife.motherName || '---');

    const wifeParts = [
      `وزوجته المباركة عليه البنت المصونة ${wife.name || '---'}${wife.nameLatin ? ` (${wife.nameLatin})` : ''}`,
      `المولودة بـ ${wife.placeOfBirth || '---'} بتاريخ ${wife.dateOfBirth || '---'}`,
      `من والديها السيد ${wifeFatherInfo} والسيدة ${wifeMotherInfo}`,
      wifeBirthCert,
      `مهنتها ${wife.profession || 'بدون مهنة'}`,
      `والساكنة بـ ${wife.address || '---'}`,
      wifeIdClause,
      wifeNatClause,
      wifeMaritalStatusClause,
      wifeAdminCert,
      wifeMedCert,
      wifeMinorClause,
      wifeProxyClause,
      wifeForeignExtra,
    ].filter(Boolean).join(' ');

    const narrative = `الحمد لله وحده وصلى الله وسلم على سيدنا محمد وآله وصحبه على الساعة ${sessionTime} من يوم ${sessionDay} ${sessionDateHijriWords} هجرية موافق ${sessionDateGregWords} ميلادية (${dateHijri} / ${dateGreg}) تلقى العدلان أمنهما الله ${notary1} و ${notary2} المنتصبان للإشهاد بدائرة محكمة الاستئناف بـ ${appellateCourt} قسم التوثيق وقضاء الأسرة بالمحكمة الابتدائية بـ ${courtName} الشهادة المدرجة بسجل البيانات للعدل الأول رقم ${memoNum} صحيفة ${memoPage} عدد ${memoCount} والمضمنة بـ ${regBook} رقم ${regNum} صحيفة ${regPage} عدد ${regCount} بتاريخ ${regDate} نصها الحمد لله بعد إذن السيد قاضي الأسرة المكلف بالزواج بالمحكمة الابتدائية بـ ${authCourt} ملف رقم ${authNum} بتاريخ ${authDate} تزوج على بركة الله وحسن عونه وتوفيقه الجميل ${husbandParts} ${conversionCertClause} ${wifeParts} ${guardianInfo} على صداق مبارك قدره ونهايته ${dowryWords} (${dowryAmt.toLocaleString()} درهم) ${dowryRecStatus}${otherDowryClause} تزوجها على كتاب الله وسنة رسوله المصطفى ﷺ وباليمن والبركة ${witnessesInfo} ${condInfo} ${art49Info} وقبل الزوجان هذا الزواج الشرعي وارتضياه وعقداه حسب المسطور وحفظ للعدل الأول وحرر الرسم بتاريخه المذكور عبد ربه تعالى وعبد ربه.`
      .replace(/[،,]/g, '')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return narrative;
  }

  // Ownership deeds (ملكية / رسم استمرار / حيازة)
  if (documentType === 'ملكية' || documentType === 'حيازة' || documentType.includes('ملكية') || documentType.includes('حيازة')) {
    const malakiyaHtml = generateMalakiyaRasmHtml(state);
    return stripHtmlToPlainText(malakiyaHtml);
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

    // Extended Real Rights Registry (الفصل 889-1 ق.ل.ع)
    if (scope.isSubjectToRealRightsRegistry) {
      const reg = scope.registryInfo;
      scopeText += `\n\nز. مقتضيات سجل الوكالات المتعلقة بالحقوق العينية (الفصل 889-1 من ق.ل.ع ومرسوم 2.23.101):`;
      scopeText += `\n  - خضوع الوكالة: مشمولة بنظام السجل المحلي للوكالات المتعلقة بالحقوق العينية`;
      if (reg?.isRegistered === 'yes') {
        scopeText += `\n  - وضعية التقييد بالسجل: مقيدة`;
        scopeText += `\n  - المحكمة الابتدائية المختصة: ${reg.primaryCourt || '---'}`;
        scopeText += `\n  - رقم تقييد الوكالة بالسجل المحلي: ${reg.registrationNumber || '---'}`;
        scopeText += `\n  - تاريخ التقييد: ${reg.registrationDate || '---'}`;
        if (reg.hasCertificate) {
          scopeText += `\n  - شهادة التقييد: متوفرة ومطابقة للأصل`;
        }
      } else if (reg?.isRegistered === 'no') {
        scopeText += `\n  - وضعية التقييد بالسجل: غير مقيدة بعد (يجب تقييدها بالسجل المحلي لإنتاج آثارها القانونية تجاه الكافة)`;
      } else {
        scopeText += `\n  - وضعية التقييد بالسجل: قيد الإيداع / التحقق`;
      }
    }

    // Original POA Source Reference (if referenced)
    if (scope.originalPoaSource?.book || scope.originalPoaSource?.number || scope.originalPoaSource?.documentNumber) {
      const src = scope.originalPoaSource;
      scopeText += `\n\nح. مراجع الوكالة الأصلية / المستند إليها:`;
      if (src.sourceType === 'adoul') {
        scopeText += `\n  - تلقي العدلين: كناش/دفتر ${src.book || '---'}، حرف ${src.letter || '---'}، صحيفة ${src.page || '---'}، عدد ${src.number || '---'}، بتاريخ ${src.date || '---'}، توثيق محكمة ${src.court || '---'}`;
      } else if (src.sourceType === 'official_other') {
        scopeText += `\n  - محرر رسمي: صادر عن ${src.issuerAuthority || '---'}، رقم ${src.documentNumber || '---'}، بتاريخ ${src.date || '---'}`;
      } else if (src.sourceType === 'fixed_date') {
        scopeText += `\n  - محرر ثابت التاريخ: رقم ${src.referenceNumber || '---'}، بتاريخ ${src.fixedDate || '---'}`;
      } else if (src.sourceType === 'foreign') {
        scopeText += `\n  - وكالة محررة بالخارج: دولة ${src.country || '---'}، رقم ${src.foreignNumber || '---'}، بتاريخ ${src.foreignDate || '---'}`;
      }
    }

    // Sub-agent / Deputy
    if (scope.subAgentInfo?.hasSubAgent === 'yes') {
      scopeText += `\n\nط. النيابة والوكيل الفرعي (الفصول 931-934 ق.ل.ع):`;
      scopeText += `\n  - النائب / الوكيل الفرعي المعين: ${scope.subAgentInfo.subAgentName || '---'} (رقم البطاقة: ${scope.subAgentInfo.subAgentCin || '---'})`;
      if (scope.subAgentInfo.subAgentScope) {
        scopeText += `\n  - نطاق الإنابة: ${scope.subAgentInfo.subAgentScope}`;
      }
    }

    // Multiple Principals
    if (scope.multiplePrincipalsCheck?.isJointOperation) {
      scopeText += `\n\nي. تعدد الموكلين (الفصل 933 ق.ل.ع): صدرت هذه الوكالة عن موكلين متعددين لعملية مشتركة غير قابلة للتجزئة.`;
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
  تاريخ صلاحية البطاقة: ${seller.idIssueDate || '---'}
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
  تاريخ صلاحية البطاقة: ${buyer.idIssueDate || '---'}
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
      توثيق: ${doc.correspondingDate || '---'}
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

${(documentType as string) === 'حيازة' ? 'تفاصيل الحيازة' : 'تفاصيل الملكية'}:
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
