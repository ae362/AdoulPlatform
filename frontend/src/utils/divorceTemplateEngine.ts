import type { FeesAgentState } from '../types/feesAgentTypes';
import {
  convertGregorianToHijri,
  getArabicWeekdayName,
  convertGregorianDateToWords,
  convertHijriDateToWords,
  convertNumberToArabicWords,
  convertTimeToWords,
} from './feesAgentUtils';

// ============================================================================
// SHARED EXTRACTORS & HELPERS
// ============================================================================

interface ExtractedPartyData {
  fullName: string;
  fatherName: string;
  motherName: string;
  birthDate: string;
  birthPlace: string;
  profession: string;
  nationality: string;
  address: string;
  idNumber: string;
  idExpiryDate: string;
  idIssueDate?: string;
  idIssuePlace?: string;
}

interface CommonDivorceData {
  sessionTimeWords: string;
  sessionDayWords: string;
  hijriWords: string;
  gregorianWords: string;
  notary1: string;
  notary2: string;
  appellateCourt: string;
  primaryCourt: string;
  courtSection: string;
  registryNumber: string;
  registryCount: string;
  registryPage: string;
  permissionNumber: string;
  permissionDate: string;
  fileNumber: string;
  marriageDeedDate: string;
  marriageBookNumber: string;
  marriageBookLetter: string;
  marriageDeedNumber: string;
  marriagePageNumber: string;
  marriageIssuingCourt: string;
  husband: ExtractedPartyData;
  wife: ExtractedPartyData;
}

function extractCommonData(state: FeesAgentState): CommonDivorceData {
  const meta = state.meta || ({} as any);
  const sellers = state.sellers || [];
  const buyers = state.buyers || [];
  const dc = state.divorceClassification || ({} as any);
  const rw = dc.revocableWorkflow || ({} as any);
  const kw = dc.khulWorkflow || ({} as any);
  const tw = dc.tamlikWorkflow || ({} as any);
  const cw = dc.consensualWorkflow || ({} as any);
  const dw = dc.discordWorkflow || ({} as any);
  const ctw = dc.completedThreeWorkflow || ({} as any);
  const md = state.marriageDetails || ({} as any);

  // Date & Time formatting
  const dateGreg = meta.dateGregorian || rw.receptionDate || kw.receptionDate || tw.receptionDate || cw.receptionDate || dw.judgmentDate || ctw.receptionDate || new Date().toISOString().split('T')[0];
  const sessionDayWords = getArabicWeekdayName(dateGreg) || 'اليوم';
  const gregorianWords = meta.dateGregorianInWords || convertGregorianDateToWords(dateGreg);
  const hijriWords = meta.dateHijriInWords || convertHijriDateToWords(dateGreg);

  let sessionTimeWords = meta.hourInWords || '';
  if (!sessionTimeWords) {
    if (meta.time && meta.time.includes(':')) {
      const [h, m] = meta.time.split(':').map(Number);
      if (!isNaN(h)) {
        const dObj = new Date();
        dObj.setHours(h, m || 0, 0, 0);
        sessionTimeWords = convertTimeToWords(dObj);
      }
    }
  }
  if (!sessionTimeWords) {
    sessionTimeWords = 'الحادية عشرة صباحاً';
  }

  // Courts & Notaries
  const primaryCourt = ctw.court || dw.courtCity || rw.court || kw.court || tw.court || cw.court || dc.discordDetails?.courtName || dc.consensualAgreement?.courtName || meta.court || state.preReceptionVerification?.primaryCourt || 'طنجة';
  const appellateCourt = meta.appellateCourt || (state.preReceptionVerification as any)?.appellateCourt || (state.preReceptionVerification as any)?.appealCourt || primaryCourt;
  const courtSection = ctw.section || (dw.familySectionCity ? `قسم قضاء الأسرة ب${dw.familySectionCity}` : (rw.section || kw.section || tw.section || cw.section || meta.courtSection || 'قسم قضاء الأسرة'));
  const notary1 = meta.notaryPrimary || state.preReceptionVerification?.notary1Name || 'العدل الأول';
  const notary2 = meta.notarySecondary || state.preReceptionVerification?.notary2Name || 'العدل الثاني';

  // Registry & Memorandum
  const registryNumber = md.registryNumber || meta.registryNumber || state.preReceptionVerification?.registryRecord?.number || '---';
  const registryCount = md.registryCount || meta.registryCount || state.preReceptionVerification?.registryRecord?.count || '---';
  const registryPage = md.registryPage || meta.registryPage || state.preReceptionVerification?.registryRecord?.page || '---';

  // Permission / Judgment details
  const permissionNumber = ctw.permissionNumber || dw.judgmentNumber || rw.permissionNumber || kw.permissionNumber || tw.permissionNumber || cw.permissionNumber || dc.discordDetails?.judgmentNumber || dc.consensualAgreement?.courtPermissionNumber || meta.authorizationNumber || '---';
  const permissionDate = ctw.permissionDate || dw.judgmentDate || rw.permissionDate || kw.permissionDate || tw.permissionDate || cw.permissionDate || dc.discordDetails?.judgmentDate || dc.consensualAgreement?.courtPermissionDate || meta.authorizationDate || '---';
  const fileNumber = ctw.fileNumber || dw.caseNumber || rw.fileNumber || kw.fileNumber || tw.fileNumber || cw.fileNumber || dc.discordDetails?.caseFileNumber || meta.fileNumber || '---';

  // Marriage Deed references
  const mRef = ctw.marriageRef || dw.marriageRef || rw.marriageRef || kw.marriageDeed || tw.marriageRef || cw.marriageRef || {};
  const marriageDeedDate = mRef.deedDate || md.registryDate || '---';
  const marriageBookNumber = mRef.bookNumber || mRef.registryBookNumber || md.registryNumber || '---';
  const marriageBookLetter = mRef.bookLetter || mRef.registryBook || (md as any)?.registryLetter || '---';
  const marriageDeedNumber = mRef.deedNumber || mRef.count || md.registryCount || '---';
  const marriagePageNumber = mRef.pageNumber || mRef.page || md.registryPage || '---';
  const marriageIssuingCourt = mRef.issuingAuthority || mRef.issuingCourt || mRef.courtName || md.courtName || primaryCourt;

  // Husband Party Extraction
  const s0 = sellers[0] || ({} as any);
  const hWf = ctw.husband || dw.husband || rw.husband || kw.husband || tw.husband || cw.husband || {};
  const husbandFullName = (hWf.firstNameAr && hWf.lastNameAr ? `${hWf.firstNameAr} ${hWf.lastNameAr}` : s0.name) || '---';
  const husband: ExtractedPartyData = {
    fullName: husbandFullName,
    fatherName: hWf.fatherName || s0.fatherName || '---',
    motherName: hWf.motherName || s0.motherName || '---',
    birthDate: hWf.birthDate || s0.dateOfBirth || '---',
    birthPlace: hWf.birthPlace || s0.placeOfBirth || '---',
    profession: hWf.profession || s0.profession || '---',
    nationality: hWf.nationality || s0.nationality || 'مغربية',
    address: hWf.address ? `${hWf.address}${hWf.city ? `، ${hWf.city}` : ''}` : s0.address || '---',
    idNumber: hWf.idNumber || s0.idNumber || '---',
    idExpiryDate: hWf.idExpiryDate || s0.idExpiryDate || s0.idIssueDate || '---',
    idIssueDate: s0.idIssueDate || undefined,
    idIssuePlace: s0.idIssuePlace || undefined,
  };

  // Wife Party Extraction
  const b0 = buyers[0] || ({} as any);
  const wWf = ctw.wife || dw.wife || rw.wife || kw.wife || tw.wife || cw.wife || {};
  const wifeFullName = (wWf.firstNameAr && wWf.lastNameAr ? `${wWf.firstNameAr} ${wWf.lastNameAr}` : b0.name) || '---';
  const wife: ExtractedPartyData = {
    fullName: wifeFullName,
    fatherName: wWf.fatherName || b0.fatherName || '---',
    motherName: wWf.motherName || b0.motherName || '---',
    birthDate: wWf.birthDate || b0.dateOfBirth || '---',
    birthPlace: wWf.birthPlace || b0.placeOfBirth || '---',
    profession: wWf.profession || b0.profession || '---',
    nationality: wWf.nationality || b0.nationality || 'مغربية',
    address: wWf.address ? `${wWf.address}${wWf.city ? `، ${wWf.city}` : ''}` : b0.address || '---',
    idNumber: wWf.idNumber || b0.idNumber || '---',
    idExpiryDate: wWf.idExpiryDate || b0.idExpiryDate || b0.idIssueDate || '---',
    idIssueDate: b0.idIssueDate || undefined,
    idIssuePlace: b0.idIssuePlace || undefined,
  };

  return {
    sessionTimeWords,
    sessionDayWords,
    hijriWords,
    gregorianWords,
    notary1,
    notary2,
    appellateCourt,
    primaryCourt,
    courtSection,
    registryNumber,
    registryCount,
    registryPage,
    permissionNumber,
    permissionDate,
    fileNumber,
    marriageDeedDate,
    marriageBookNumber,
    marriageBookLetter,
    marriageDeedNumber,
    marriagePageNumber,
    marriageIssuingCourt,
    husband,
    wife,
  };
}

// ============================================================================
// 1. الطلاق الرجعي (Based on templates/طلاق رجعي.docx)
// ============================================================================

export function generateRevocableDivorceDraft(state: FeesAgentState): string {
  const d = extractCommonData(state);
  const dc = state.divorceClassification || ({} as any);
  const rw = dc.revocableWorkflow || ({} as any);

  // Divorce Count clause
  const divorceCount = rw.divorceCount || dc.divorceCount || 'first';
  const countText = divorceCount === 'second'
    ? 'طلقة ثانية رجعية يملك بها رجعتها ما لم تنقض عدتها'
    : divorceCount === 'third' || divorceCount === 'other'
    ? 'طلقة مكملة للثلاث'
    : 'طلقة أولى رجعية يملك بها رجعتها ما لم تنقض عدتها';

  // Consummation
  const consummationText = rw.consummationHappened !== false ? 'بعد الدخول بها' : 'قبل الدخول بها';

  // Dues and Deposit
  const depositAmount = rw.depositDetails?.depositAmount || rw.dues?.totalAmount || state.finance?.price || 0;
  const depositAmountWords = rw.depositDetails?.depositAmountInWords || rw.dues?.totalAmountInWords || (depositAmount ? convertNumberToArabicWords(depositAmount) : '---');
  const receiptNumber = rw.depositDetails?.receiptNumber || '---';
  const depositDate = rw.depositDetails?.depositDate || '---';

  // Children
  let childrenClause = 'ولا ولد له منها';
  if (rw.hasChildren && rw.childrenList && rw.childrenList.length > 0) {
    const list = rw.childrenList.map((c: any) => {
      const type = c.gender === 'أنثى' ? 'الطفلة' : 'الطفل';
      return `${type} ${c.firstName || c.fullName} المولود${c.gender === 'أنثى' ? 'ة' : ''} بتاريخ ${c.birthDate || '---'}`;
    }).join(' و ');
    childrenClause = `وهم ${list}`;
  }

  // Presence / Absence of wife
  const wifeAbsence = rw.attendeeType === 'both'
    ? 'وذلك بحضور مطلقته المذكورة'
    : 'وذلك في غيبة مطلقته المذكورة';

  return `طلاق رجعي

الحمد لله وحده و بعد وعلى الساعة ${d.sessionTimeWords} من يوم ${d.sessionDayWords} ${d.hijriWords} موافق ${d.gregorianWords} تلقى العدلان ${d.notary1} و ${d.notary2} المنتصبان للإشهاد بدائرة محكمة الاستئناف ب${d.appellateCourt} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.primaryCourt} الشهادة المدرجة بسجل البيانات للأول رقم ${d.registryNumber} عدد ${d.registryCount} صفحة ${d.registryPage} نصها : وبعد إذن المحكمة الموقرة بالإشهاد على هذا الطلاق الصادر عنها بتاريخ ${d.permissionDate} تحت عدد ${d.permissionNumber} حضر لدينا السيد ${d.husband.fullName} من والديه ${d.husband.fatherName} و ${d.husband.motherName} المولود ب${d.husband.birthPlace} بتاريخ ${d.husband.birthDate} مهنته ${d.husband.profession} مغربي الجنسية الساكن ب${d.husband.address} الحامل لبطاقة التعريف الوطنية رقم ${d.husband.idNumber} صالحة الى غاية ${d.husband.idExpiryDate} وأشهد على نفسه أنه طلق زوجته السيدة ${d.wife.fullName} بنت ${d.wife.fatherName} المولودة ب${d.wife.birthPlace} بتاريخ ${d.wife.birthDate} مهنتها ${d.wife.profession} مغربية الجنسية؛ الساكنة ب${d.wife.address}، الحاملة لبطاقة التعريف الوطنية حرف ورقم ${d.wife.idNumber} صالحة الى غاية ${d.wife.idExpiryDate} المذكورة معه بمستند زواجهما المؤرخ في ${d.marriageDeedDate} والمضمن بسجل الزواج رقم ${d.marriageBookNumber} حرف ${d.marriageBookLetter} عدد ${d.marriageDeedNumber} صفحة ${d.marriagePageNumber} بتاريخ ${d.marriageDeedDate} توثيق قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.marriageIssuingCourt} ${countText} ${consummationText} وذلك بعد ما أودع بكتابة الضبط بذي المحكمة مبلغا ماليا قدره ${depositAmount.toLocaleString('ar-MA')} درهم (${depositAmountWords}) بمقتضى وصل الإيداع رقم ${receiptNumber} المؤرخ في ${depositDate} لأداء مستحقاتها ومستحقات أولاده منها ${childrenClause} .. ${wifeAbsence} عرف قدره شهد به عليه وهو بأتمه وعرف به بما ذكر وقد وقع أسفل الشهادة بالسجل المشار إليه أعلاه بعد تلاوتنا عليه مضمونها وفصولها وشرحنا له مفرداتها ومعانيها وحرر في غده عبد ربه ${d.notary1} وعبد ربه ${d.notary2}`;
}

// ============================================================================
// 2. الطلاق الخلعي (Based on templates/طلاق خلعي.docx)
// ============================================================================

export function generateKhulDivorceDraft(state: FeesAgentState): string {
  const d = extractCommonData(state);
  const dc = state.divorceClassification || ({} as any);
  const kw = dc.khulWorkflow || ({} as any);

  // Compensation breakdown
  const comp = kw.compensation || {};
  const deferredDowry = comp.deferredDowryAmount || 0;
  const deferredDowryWords = comp.deferredDowryInWords || (deferredDowry ? convertNumberToArabicWords(deferredDowry) : '---');

  let compensationDesc = `بجميع مستحقاتها من مؤخر صداقها وقدره ${deferredDowry.toLocaleString('ar-MA')} درهم (${deferredDowryWords}) ونفقة عدتها ومتعتها`;
  if (comp.otherCompensationIncluded && comp.otherCompensationAmount > 0) {
    compensationDesc += ` وببدل خلع إضافي قدره ${comp.otherCompensationAmount.toLocaleString('ar-MA')} درهم مقابل ${comp.otherCompensationDesc || 'التراضي المبرم'}`;
  }

  // Pregnancy clause
  const pregnancyText = kw.pregnancyStatus === 'yes'
    ? 'مصرحة بثبوت حملها وتحمل نفقته حتى وضعه وسقوط الفرض شرعا وقانونا'
    : 'مصرحة ألا حمل بها وعلى فرض وجوده فقد تحملت بفرضه إلى وضعه وبعده إلى سقوط الفرض عنه شرعا وقانونا';

  // Children and Custody
  let childrenClause = 'ومصرحة بأنه ليس لهما أي ولد مشترك';
  if (kw.hasChildren && kw.childrenList && kw.childrenList.length > 0) {
    const list = kw.childrenList.map((c: any) => {
      return `${c.firstName || c.fullName} المولود بتاريخ ${c.birthDate || '---'}`;
    }).join(' و ');
    childrenClause = `وأن لهما من الأولاد ${list}؛ التزمت بالإنفاق عليهما وبحضانتهما وبسكناهما إلى سقوط الفرض عنهما ؛ مصرحة أنها الآن قادرة على ذلك`;
  }

  // Guarantor clause (if father present)
  let guarantorClause = '';
  if (kw.maternalGrandfatherCommitment || kw.wife?.legalGuardianName) {
    const gName = kw.wife?.legalGuardianName || kw.wife?.fatherName || 'والدها';
    guarantorClause = ` وقد حضر معها والدها السيد ${gName} بن ${kw.wife?.fatherName || '---'} وضمن للزوج ما التزمت به ضمانا لازما لماله وذمته؛`;
  }

  // Divorce Count clause
  const divorceCount = kw.divorceCount || dc.divorceCount || 'second';
  const countText = divorceCount === 'second'
    ? 'طلقة ثانية خلعية سبقتها أولى رجعية تفارقا بها كما يجب شرعا وقانونا'
    : divorceCount === 'third'
    ? 'طلقة ثالثة بائنة بينونة كبرى بالخلع'
    : 'طلقة أولى خلعية بائنة تفارقا بها كما يجب شرعا وقانونا';

  return `طلاق خلعي

الحمد لله وحده و بعد وعلى الساعة ${d.sessionTimeWords} من يوم ${d.sessionDayWords} ${d.hijriWords} موافق ${d.gregorianWords} تلقى العدلان ${d.notary1} و ${d.notary2} المنتصبان للإشهاد بدائرة محكمة الاستئناف ب${d.appellateCourt} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.primaryCourt} الشهادة المدرجة بسجل البيانات للأول رقم ${d.registryNumber} عدد ${d.registryCount} صفحة ${d.registryPage} نصها : وبعد إذن المحكمة الموقرة بالإشهاد على هذا الطلاق الصادر عنها بتاريخ ${d.permissionDate} تحت عدد ${d.permissionNumber} حضر لدينا الزوجان السيد ${d.husband.fullName} من والديه ${d.husband.fatherName} و ${d.husband.motherName}؛ المولود ب${d.husband.birthPlace} بتاريخ ${d.husband.birthDate}؛ مهنته ${d.husband.profession} مغربي الجنسية حالته متزوج الساكن ب${d.husband.address} الحامل لبطاقة التعريف الوطنية حرف ورقم ${d.husband.idNumber} مسلمة له بتاريخ ${d.husband.idExpiryDate} والسيدة ${d.wife.fullName} بنت ${d.wife.fatherName} المولودة ب${d.wife.birthPlace} بتاريخ ${d.wife.birthDate} مهنتها ${d.wife.profession} مغربية الجنسية الساكنة ب${d.wife.address} الحاملة لبطاقة التعريف الوطنية حرف ورقم ${d.wife.idNumber} مسلمة لها بتاريخ ${d.wife.idExpiryDate} المذكوران معا برسم زواجهما المؤرخ في ${d.marriageDeedDate} المضمن بسجل الزواج رقم ${d.marriageBookNumber} حرف ${d.marriageBookLetter} تحت عدد ${d.marriageDeedNumber} صفحة ${d.marriagePageNumber} بتاريخ ${d.marriageDeedDate} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.marriageIssuingCourt} وأشهدت المرأة على نفسها أنها اختلعت من عصمة زوجها المذكور ${compensationDesc} ${pregnancyText} ${childrenClause}؛${guarantorClause} وتبارأ الزوجان بينهما في جميع الدعاوى المتعلقة بالزوجية وتوابعها براءة تامة وبسبب ما ذكر ومن أجله أشهد الزوج المذكور أنه طلق زوجته المذكورة ${countText} عرفوا قدره شهد به عليهم وهم بأتمه؛ وعرف بهم بما ذكر ؛ وقد وقعوا أسفل الشهادة بمذكرة الحفظ المشار إليها أعلاه بعد تلاوتنا عليهم مضمونها وفصولها وشرحنا لهم مفرداتها ومعانيها ومراقبتها وحرر في غده عبد ربه ${d.notary1} وعبد ربه ${d.notary2}`;
}

// ============================================================================
// 3. الطلاق المملك (Based on templates/طلاق مملك.docx)
// ============================================================================

export function generateTamlikDivorceDraft(state: FeesAgentState): string {
  const d = extractCommonData(state);
  const dc = state.divorceClassification || ({} as any);
  const tw = dc.tamlikWorkflow || ({} as any);

  // Tamlik Basis clause
  let tamlikBasisText = 'بحسب ما هو ثابت برسم زواجها الذي بيدها المشار إليه أعلاه';
  if (tw.tamlikSource === 'independent_deed' && tw.independentDeedRef) {
    const ind = tw.independentDeedRef;
    tamlikBasisText = `بحسب ما هو ثابت برسم التطوع والشرط المؤرخ بـ ${ind.deedDate || '---'} المضمن بسجل رقم ${ind.bookNumber || '---'} حرف ${ind.bookLetter || '---'} تحت عدد ${ind.deedNumber || '---'} صفحة ${ind.pageNumber || '---'} قسم قضاء الأسرة بـ ${ind.courtName || d.primaryCourt}`;
  }

  // Consummation
  const consummationText = tw.consummationHappened !== false ? 'بعد البناء' : 'قبل البناء';

  // Divorce Count clause
  const divorceCount = tw.divorceCount || dc.divorceCount || 'first';
  const countText = divorceCount === 'second'
    ? 'وهي طلقة ثانية سبقتها طلقة أولى'
    : divorceCount === 'third'
    ? 'وهي طلقة ثالثة مكملة للثلاث بائنة بينونة كبرى'
    : 'وهي طلقة أولى مملكة';

  // Husband presence
  const husbandPresenceText = tw.husband?.presenceStatus === 'present'
    ? 'وذلك بحضور مطلقها المذكور'
    : 'وذلك في غيبة مطلقها المذكور';

  return `طلاق مملك

الحمد لله وحده و بعد وعلى الساعة ${d.sessionTimeWords} من يوم ${d.sessionDayWords} ${d.hijriWords} موافق ${d.gregorianWords} تلقى العدلان ${d.notary1} و ${d.notary2} المنتصبان للإشهاد بدائرة محكمة الاستئناف ب${d.appellateCourt} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.primaryCourt} الشهادة المدرجة بسجل البيانات للأول رقم ${d.registryNumber} عدد ${d.registryCount} صفحة ${d.registryPage} نصها : وبعد إذن المحكمة الموقرة بالإشهاد على هذا الطلاق الصادر عنها بتاريخ ${d.permissionDate} تحت عدد ${d.permissionNumber} حضرت لدينا السيدة ${d.wife.fullName} بنت ${d.wife.fatherName}؛ المولودة ب${d.wife.birthPlace} بتاريخ ${d.wife.birthDate} مهنتها ${d.wife.profession} مغربية الجنسية الساكنة ب${d.wife.address} الحاملة لبطاقة التعريف الوطنية حرف ورقم ${d.wife.idNumber} مسلمة لها بتاريخ ${d.wife.idExpiryDate} زوجة السيد ${d.husband.fullName} بن ${d.husband.fatherName} المذكور معها برسم زواجهما المؤرخ في ${d.marriageDeedDate} المضمن بسجل الزواج رقم ${d.marriageBookNumber} حرف ${d.marriageBookLetter} صفحة ${d.marriagePageNumber} عدد ${d.marriageDeedNumber} بتاريخ ${d.marriageDeedDate} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.marriageIssuingCourt} وطلبت الإشهاد عليها بطلاق نفسها بنفسها أخذا بشرطها المجعول لها من طرف زوجها المذكور، ${tamlikBasisText} وبعد تأكد شهيديه مما ذكر من خلال اطلاعهما على رسم الشرط أو الطوع المشار إليه أعلاه ومن خلال ورقة إذن المحكمة بتوثيق هذا الطلاق أشهدت الزوجة المذكورة أنها طلقت نفسها من زوجها ${d.husband.fullName} المذكور ؛ طلقة مملكة ملكت بها أمر نفسها ${consummationText} ؛ على سنة الطلاق وحكمه وسبيله؛ ${countText}؛ ${husbandPresenceText}؛ عرفت قدره شهد به عليها وهي بأتمه؛ وعرف بها بما ذكر وقد وقعت أسفل الشهادة بالسجل المشار إليه أعلاه؛ بعد تلاوتنا عليها مضمون الشهادة وفصولها وشرحنا لها مفرداتها ومعانيها؛ وحرر في غده؛ عبد ربه ${d.notary1} و عبد ربه ${d.notary2}`;
}

// ============================================================================
// 4. توثيق حكم طلاق للشقاق (Based on templates/توثيق حكم طلاق للشقاق.docx)
// ============================================================================

export function generateDiscordDivorceDraft(state: FeesAgentState): string {
  const d = extractCommonData(state);
  const dc = state.divorceClassification || ({} as any);
  const dw = dc.discordWorkflow || ({} as any);
  const discord = dc.discordDetails || {};

  const judgmentNumber = dw.judgmentNumber || discord.judgmentNumber || d.permissionNumber || '---';
  const judgmentDate = dw.judgmentDate || discord.judgmentDate || d.permissionDate || '---';
  const judgmentCourt = dw.courtCity || discord.courtName || d.primaryCourt;

  // Attendees & Request phrasing
  const attendee = dw.attendeeForCertification || 'wife';
  let attendeeText = '';
  if (attendee === 'husband') {
    attendeeText = `حضر لدينا السيد ${d.husband.fullName} من والديه ${d.husband.fatherName} و ${d.husband.motherName}؛ المولود ب${d.husband.birthPlace} بتاريخ ${d.husband.birthDate} المغربي الجنسية الساكن بعنوان ${d.husband.address} الحامل لبطاقة التعريف الوطنية حرف ورقم ${d.husband.idNumber} مسلمة له بتاريخ ${d.husband.idExpiryDate}؛ وطلب توثيق الحكم القضائي عدد ${judgmentNumber} الصادر بتاريخ ${judgmentDate} عن المحكمة الابتدائية ب${judgmentCourt} القاضي بتطليق زوجته ومفارقته السيدة ${d.wife.fullName} من والديها ${d.wife.fatherName} و ${d.wife.motherName}؛ المولودة ب${d.wife.birthPlace} بتاريخ ${d.wife.birthDate} مهنتها ${d.wife.profession} مغربية الجنسية الساكنة ب${d.wife.address} الحاملة لبطاقة التعريف الوطنية حرف ورقم ${d.wife.idNumber} مسلمة لها بتاريخ ${d.wife.idExpiryDate}`;
  } else if (attendee === 'both') {
    attendeeText = `حضر لدينا الزوجان السيد ${d.husband.fullName} من والديه ${d.husband.fatherName} و ${d.husband.motherName}؛ المولود ب${d.husband.birthPlace} بتاريخ ${d.husband.birthDate} المغربي الجنسية الساكن بعنوان ${d.husband.address} الحامل لبطاقة التعريف الوطنية حرف ورقم ${d.husband.idNumber} مسلمة له بتاريخ ${d.husband.idExpiryDate}، والسيدة ${d.wife.fullName} من والديها ${d.wife.fatherName} و ${d.wife.motherName}؛ المولودة ب${d.wife.birthPlace} بتاريخ ${d.wife.birthDate} مهنتها ${d.wife.profession} مغربية الجنسية الساكنة ب${d.wife.address} الحاملة لبطاقة التعريف الوطنية حرف ورقم ${d.wife.idNumber} مسلمة لها بتاريخ ${d.wife.idExpiryDate}؛ وطلبا معاً توثيق الحكم القضائي عدد ${judgmentNumber} الصادر بتاريخ ${judgmentDate} عن المحكمة الابتدائية ب${judgmentCourt} القاضي بالتطليق للشقاق بينهما`;
  } else {
    // Default: wife
    attendeeText = `حضرت لدينا السيدة ${d.wife.fullName} من والديها ${d.wife.fatherName} و ${d.wife.motherName}؛ المولودة ب${d.wife.birthPlace} بتاريخ ${d.wife.birthDate} مهنتها ${d.wife.profession} مغربية الجنسية الساكنة ب${d.wife.address} الحاملة لبطاقة التعريف الوطنية حرف ورقم ${d.wife.idNumber} مسلمة لها بتاريخ ${d.wife.idExpiryDate}؛ وطلبت توثيق الحكم القضائي عدد ${judgmentNumber} الصادر بتاريخ ${judgmentDate} عن المحكمة الابتدائية ب${judgmentCourt} القاضي بتطليقها من مفارقها السيد ${d.husband.fullName} من والديه ${d.husband.fatherName} و ${d.husband.motherName}؛ المولود ب${d.husband.birthPlace} بتاريخ ${d.husband.birthDate} المغربي الجنسية الساكن بعنوان ${d.husband.address} الحامل لبطاقة التعريف الوطنية حرف ورقم ${d.husband.idNumber} مسلمة له بتاريخ ${d.husband.idExpiryDate}`;
  }

  // Marriage Deed Reference
  const marriageRefText = `المذكوران معاً برسم زواجهما المؤرخ في ${d.marriageDeedDate} المضمن بسجل الزواج رقم ${d.marriageBookNumber} حرف ${d.marriageBookLetter} عدد ${d.marriageDeedNumber} صفحة ${d.marriagePageNumber} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.marriageIssuingCourt}`;

  // Divorce rank & nature
  const countText = dw.divorceCount === 'second'
    ? 'طلقة ثانية بائنة بينونة صغرى'
    : 'طلقة أولى بائنة بينونة صغرى';
  const consummationText = dw.consummationHappened === false
    ? 'قبل البناء، ولا عدة على الزوجة شرعاً وقانوناً'
    : 'بعد البناء بها';

  // Reconciliation & Responsibility
  const respText = dw.responsibleParty === 'husband'
    ? 'مع تحميل مسؤولية الشقاق للزوج'
    : dw.responsibleParty === 'wife'
    ? 'مع تحميل مسؤولية الشقاق للزوجة'
    : 'مع ثبوت الشقاق واستحكامه بين الطرفين';

  // Financial dues & Deposit
  let financialClause = '';
  if (dw.dues && dw.dues.totalAmount > 0) {
    financialClause = `؛ وقضى منطوق الحكم المذكور بمستحقات مالية وتعويضات إجمالها مبلغ ${dw.dues.totalAmount.toLocaleString('ar-MA')} درهم (${dw.dues.totalAmountInWords || ''})`;
    if (dw.duesExecutionStatus && dw.executionDetails?.depositAmount > 0) {
      financialClause += `، ثبت إيداعها بصندوق المحكمة بمقتضى وصل الإيداع رقم ${dw.executionDetails.receiptNumber || '---'} المؤرخ في ${dw.executionDetails.depositDate || '---'} لدى المحكمة الابتدائية ب${dw.executionDetails.courtName || judgmentCourt}`;
    }
  }

  // Children clause
  let childrenClause = '';
  if (dw.hasChildren && dw.childrenList && dw.childrenList.length > 0) {
    const list = dw.childrenList.map((c: any) => {
      const type = c.gender === 'أنثى' ? 'الابنة' : 'الابن';
      const custody = c.custodyAssignment === 'mother' ? 'حضانة الأم' : c.custodyAssignment === 'father' ? 'حضانة الأب' : 'بحسب ما قضى به الحكم';
      return `${type} ${c.firstName || c.fullName} (المولود${c.gender === 'أنثى' ? 'ة' : ''} بتاريخ ${c.birthDate || '---'}، بـ ${custody} ونفقة شهرية قدرها ${c.monthlySupport || 0} درهم${c.visitationRights ? `، مع تنظيم حق الزيارة: ${c.visitationRights}` : ''})`;
    }).join(' و ');
    childrenClause = `؛ ولهما من الأبناء المشتركين: ${list}`;
  }

  // Pregnancy clause
  const pregnancyClause = dw.pregnancyStatus === 'yes'
    ? '؛ مع ثبوت حمل الزوجة وقت الإشهاد وامتداد العدة إلى حين وضع حملها وفق المادة 134 من مدونة الأسرة وتستمر واجبات نفقة الحمل'
    : '';

  const closingPronoun = attendee === 'both' ? 'أشهدا على أنفسهما أنهما طلبا' : attendee === 'husband' ? 'أشهد السيد المذكور على نفسه أنه قد طلب' : 'أشهدت المرأة المذكورة على نفسها أنها قد طلبت';
  const signPronoun = attendee === 'both' ? 'وقد وقعا أسفل الشهادة' : 'وقد وقع(ت) أسفل الشهادة';

  return `توثيق حكم بالتطليق للشقاق

الحمد لله وحده و بعد وعلى الساعة ${d.sessionTimeWords} من يوم ${d.sessionDayWords} ${d.hijriWords} موافق ${d.gregorianWords} تلقى العدلان ${d.notary1} و ${d.notary2} المنتصبان للإشهاد بدائرة محكمة الاستئناف ب${d.appellateCourt} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.primaryCourt} الشهادة المدرجة بسجل البيانات للأول رقم ${d.registryNumber} عدد ${d.registryCount} صفحة ${d.registryPage} نصها : ${attendeeText}؛ ${marriageRefText}؛ والقاضي الحكم المذكور بإنهاء الرابطة الزوجية بالتطليق للشقاق واعتباره ${countText} ${consummationText} طبقاً لمقتضيات المواد 94 إلى 97 والمادة 123 من مدونة الأسرة؛ وذلك بعد ما تعذر الإصلاح بينهما واستنفدت المحكمة جلسات ومحاولات الصلح واستمر الشقاق المستحكم في العلاقة الزوجية التي كانت بينهما، ${respText}${financialClause}${childrenClause}${pregnancyClause}؛ وبعد الفراغ من إدراج منطوق الحكم وفحواه بمذكرة الحفظ المشار إليها أعلاه ${closingPronoun} توثيقه وتدوينه تأكيداً له وأخذاً به وبجميع حيثياته الشرعية والقانونية؛ طلباً وحضوراً وإشهاداً الكل تام عرفوا قدره شهد به عليهم وهم بأتمه وعرف بهم بما ذكر ${signPronoun} بالسجل المشار إليه أعلاه بعد تلاوتنا عليهم مضمون الشهادة وفصولها وشرحنا لهم مفرداتها ومعانيها وحرر في غده؛ عبد ربه ${d.notary1} وعبد ربه ${d.notary2}`;
}

// ============================================================================
// 5. الطلاق الاتفاقي (المادة 114 من مدونة الأسرة)
// ============================================================================

export function generateConsensualDivorceDraft(state: FeesAgentState): string {
  const d = extractCommonData(state);
  const dc = state.divorceClassification || ({} as any);
  const cw = dc.consensualWorkflow || ({} as any);
  const consensual = dc.consensualAgreement || {};

  const permNum = cw.permissionNumber || consensual.courtPermissionNumber || d.permissionNumber || '---';
  const permDate = cw.permissionDate || consensual.courtPermissionDate || d.permissionDate || '---';
  const permCourt = cw.court || consensual.courtName || d.primaryCourt;

  // Divorce Count clause
  const divorceCount = cw.divorceCount || dc.divorceCount || 'first';
  const countText = divorceCount === 'second'
    ? 'طلقة ثانية اتفاقية بائنة بينونة صغرى'
    : 'طلقة أولى اتفاقية بائنة بينونة صغرى';

  // Consummation
  const consummationText = cw.consummationHappened === false
    ? 'قبل البناء بها، ولا عدة عليها شرعاً وقانوناً'
    : 'بعد البناء بها';

  // Financial Dues clause
  let duesClause = '';
  if (cw.dues) {
    const parts = [];
    if (cw.dues.wifeAgreedDues > 0) parts.push(`مستحقات الزوجة المتفق عليها قدرها ${cw.dues.wifeAgreedDues.toLocaleString('ar-MA')} درهم`);
    if (cw.dues.housingOrCompDues > 0) parts.push(`واجبات السكنى/التعويض قدرها ${cw.dues.housingOrCompDues.toLocaleString('ar-MA')} درهم`);
    if (cw.dues.childrenMonthlySupport > 0) parts.push(`نفقة الأبناء الاتفاقية قدرها ${cw.dues.childrenMonthlySupport.toLocaleString('ar-MA')} درهم شهرياً`);
    if (cw.dues.otherConditions) parts.push(`شروط إضافية: ${cw.dues.otherConditions}`);
    if (parts.length > 0) {
      duesClause = `؛ وعلى الشروط والالتزامات المالية المتفق عليها المتمثلة في: ${parts.join('، ')}، بإجمالي قدره ${cw.dues.totalAmount ? cw.dues.totalAmount.toLocaleString('ar-MA') : '---'} درهم (${cw.dues.totalAmountInWords || ''})`;
    }
  }

  // Financial execution/deposit clause
  let executionClause = '';
  if (cw.duesExecutionStatus && cw.executionDetails?.executedAmount > 0) {
    executionClause = ` وقد ثبت إيداع/تسليم المستحقات المالية المحددة في مبلغ ${cw.executionDetails.executedAmount.toLocaleString('ar-MA')} درهم بمقتضى وصل الإيداع/الإشهاد رقم ${cw.executionDetails.receiptOrDeliveryRef || '---'} المؤرخ في ${cw.executionDetails.executionDate || '---'}`;
  }

  // Children clause
  let childrenClause = 'وليس بين الزوجين أي ولد مشترك';
  if (cw.hasChildren && cw.childrenList && cw.childrenList.length > 0) {
    const list = cw.childrenList.map((c: any) => {
      const type = c.gender === 'أنثى' ? 'الطفلة' : 'الطفل';
      const custody = c.custodyAssignment === 'mother' ? 'بحضانة الأم' : c.custodyAssignment === 'father' ? 'بحضانة الأب' : 'بحسب الترتيب المتفق عليه';
      return `${type} ${c.firstName || c.fullName} (المولود${c.gender === 'أنثى' ? 'ة' : ''} بتاريخ ${c.birthDate || '---'}، ${custody}${c.visitationRights ? `، وحق الزيارة: ${c.visitationRights}` : ''})`;
    }).join(' و ');
    childrenClause = `ولهما من الأولاد المشتركين: ${list}`;
  }

  // Pregnancy clause
  const pregnancyClause = cw.pregnancyStatus === 'yes'
    ? 'مع تصريح الزوجة بثبوت حملها وقت الإشهاد والتزام الطرفين بنفقة الحمل'
    : cw.pregnancyStatus === 'no'
    ? 'مع تصريح الزوجة ببراءة رحمها من الحمل'
    : '';

  return `طلاق اتفاقي

الحمد لله وحده و بعد وعلى الساعة ${d.sessionTimeWords} من يوم ${d.sessionDayWords} ${d.hijriWords} موافق ${d.gregorianWords} تلقى العدلان ${d.notary1} و ${d.notary2} المنتصبان للإشهاد بدائرة محكمة الاستئناف ب${d.appellateCourt} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.primaryCourt} الشهادة المدرجة بسجل البيانات للأول رقم ${d.registryNumber} عدد ${d.registryCount} صفحة ${d.registryPage} نصها : وبعد إذن المحكمة الموقرة بالإشهاد على هذا الطلاق الاتفاقي الصادر عنها بتاريخ ${permDate} تحت عدد ${permNum} حضر لدينا الزوجان السيد ${d.husband.fullName} من والديه ${d.husband.fatherName} و ${d.husband.motherName}؛ المولود ب${d.husband.birthPlace} بتاريخ ${d.husband.birthDate}؛ مهنته ${d.husband.profession} مغربي الجنسية الساكن ب${d.husband.address} الحامل لبطاقة التعريف الوطنية رقم ${d.husband.idNumber} والسيدة ${d.wife.fullName} بنت ${d.wife.fatherName} المولودة ب${d.wife.birthPlace} بتاريخ ${d.wife.birthDate} مهنتها ${d.wife.profession} مغربية الجنسية الساكنة ب${d.wife.address} الحاملة لبطاقة التعريف الوطنية حرف ورقم ${d.wife.idNumber} المذكوران معا برسم زواجهما المؤرخ في ${d.marriageDeedDate} المضمن بسجل الزواج رقم ${d.marriageBookNumber} حرف ${d.marriageBookLetter} تحت عدد ${d.marriageDeedNumber} صفحة ${d.marriagePageNumber} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.marriageIssuingCourt} وأشهدا العدلين بمجلس العقد أنهما اتفقا برضاهما التام واختيارهما الحر دون إكراه على إنهاء الرابطة الزوجية بينهما بالطلاق الاتفاقي طبقاً لأحكام المادة 114 من مدونة الأسرة، وذلك وفق الشروط والالتزامات المضمنة بالاتفاق المصادق عليه قضائياً بموجب الإذن المذكور أعلاه${duesClause}${executionClause}؛ ${childrenClause}؛ ${pregnancyClause}، وبناءً عليه أوقع الزوج على زوجته ${countText} ${consummationText}، وتبادلا الإبراء والبراءة التامة في كافة الحقوق والتبعات المترتبة عن الزوجية. عرفوا قدره شهد به عليهم وهم بأتمه وعرف بهم بما ذكر وقد وقعوا أسفل الشهادة بمذكرة الحفظ المشار إليها أعلاه بعد تلاوتنا عليهم مضمونها وفصولها وشرحنا لهم مفرداتها ومعانيها وحرر في غده عبد ربه ${d.notary1} وعبد ربه ${d.notary2}`;
}

// ============================================================================
// 6. الطلاق المكمل للثلاث (المادتان 123 و127 من مدونة الأسرة - بينونة كبرى)
// ============================================================================

export function generateCompletedThreeDivorceDraft(state: FeesAgentState): string {
  const d = extractCommonData(state);
  const dc = state.divorceClassification || ({} as any);
  const ctw = dc.completedThreeWorkflow || ({} as any);

  const permNum = ctw.permissionNumber || d.permissionNumber || '---';
  const permDate = ctw.permissionDate || d.permissionDate || '---';
  const permCourt = ctw.court || d.primaryCourt;

  // Husband presence & representation
  const attendee = ctw.attendeeType || 'husband_or_proxy';
  let attendeeText = '';
  if (attendee === 'both_spouses') {
    attendeeText = `حضر لدينا الزوجان السيد ${d.husband.fullName} والسيدة ${d.wife.fullName}`;
  } else {
    attendeeText = `حضر لدينا الزوج السيد ${d.husband.fullName} من والديه ${d.husband.fatherName} و ${d.husband.motherName}؛ المولود ب${d.husband.birthPlace} بتاريخ ${d.husband.birthDate} مغربي الجنسية الساكن ب${d.husband.address} الحامل لبطاقة التعريف الوطنية حرف ورقم ${d.husband.idNumber} مسلمة له بتاريخ ${d.husband.idExpiryDate}`;
  }

  // Previous divorces
  const d1 = ctw.firstDivorceRef || {};
  const d2 = ctw.secondDivorceRef || {};
  const prevDivorcesText = `وذلك بعد أن سبقت لهما طلقتان شرعيتان؛ أولاهما بموجب الرسم عدد ${d1.deedNumber || '---'} بتاريخ ${d1.deedDate || '---'} صادر عن ${d1.issuingAuthority || permCourt}؛ وثانيتهما بموجب الرسم عدد ${d2.deedNumber || '---'} بتاريخ ${d2.deedDate || '---'} صادر عن ${d2.issuingAuthority || permCourt}`;

  // Consummation
  const consummationText = ctw.consummationHappened !== false ? 'بعد البناء بها' : 'قبل البناء بها';

  // Husband sanity/will
  const sanityText = 'وهو بأتم قواه العقلية وطواعيته واختياره التام دون إكراه ولا سكر طافح ولا غضب مطبق مفسد للإرادة';

  // Dues & deposit
  let duesText = '';
  if (ctw.dues && ctw.dues.totalAmount > 0) {
    duesText = `، وقد حددت مستحقاتها القانونية في مبلغ ${ctw.dues.totalAmount.toLocaleString('ar-MA')} درهم (${ctw.dues.totalAmountInWords || ''})`;
    if (ctw.isDepositedInCourt && ctw.depositDetails?.depositAmount > 0) {
      duesText += `، وثبت إيداعها بصندوق المحكمة بموجب وصل الإيداع رقم ${ctw.depositDetails.receiptNumber || '---'} بتاريخ ${ctw.depositDetails.depositDate || '---'} لدى المحكمة الابتدائية ب${ctw.depositDetails.courtName || permCourt}`;
    }
  }

  // Children
  let childrenText = '';
  if (ctw.hasChildren && ctw.childrenList && ctw.childrenList.length > 0) {
    const list = ctw.childrenList.map((c: any) => `${c.gender === 'أنثى' ? 'الابنة' : 'الابن'} ${c.firstName || c.fullName} (المولود${c.gender === 'أنثى' ? 'ة' : ''} بتاريخ ${c.birthDate || '---'}${c.healthStatus ? `، الحالة الصحية: ${c.healthStatus}` : ''}${c.academicStatus ? `، الحالة الدراسية: ${c.academicStatus}` : ''})`).join(' و ');
    childrenText = `، ولهما من الأبناء: ${list}`;
  }

  // Pregnancy
  const pregnancyText = ctw.pregnancyStatus === 'yes'
    ? '، مع إقرار بثبوت حمل الزوجة وقت الإشهاد وامتداد عدتها إلى حين وضع حملها عملاً بالمادة 134 من مدونة الأسرة وتستمر واجبات نفقة الحمل وسكناه'
    : '، مع تصريح ببراءة رحمها من الحمل';

  return `طلاق مكمل للثلاث

الحمد لله وحده و بعد وعلى الساعة ${d.sessionTimeWords} من يوم ${d.sessionDayWords} ${d.hijriWords} موافق ${d.gregorianWords} تلقى العدلان ${d.notary1} و ${d.notary2} المنتصبان للإشهاد بدائرة محكمة الاستئناف ب${d.appellateCourt} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.primaryCourt} الشهادة المدرجة بسجل البيانات للأول رقم ${d.registryNumber} عدد ${d.registryCount} صفحة ${d.registryPage} نصها : وبعد إذن المحكمة الموقرة بالإشهاد على هذا الطلاق الصادر عنها بتاريخ ${permDate} تحت عدد ${permNum} بملف عدد ${ctw.fileNumber || d.fileNumber}؛ ${attendeeText} وأشهد على نفسه ${sanityText} أنه طلق زوجته السيدة ${d.wife.fullName} بنت ${d.wife.fatherName} المولودة ب${d.wife.birthPlace} بتاريخ ${d.wife.birthDate} الحاملة لبطاقة التعريف الوطنية رقم ${d.wife.idNumber} المذكورة معه برسم زواجهما المؤرخ في ${d.marriageDeedDate} المضمن بسجل الزواج رقم ${d.marriageBookNumber} حرف ${d.marriageBookLetter} عدد ${d.marriageDeedNumber} صفحة ${d.marriagePageNumber} قسم قضاء الأسرة بالمحكمة الابتدائية ب${d.marriageIssuingCourt}؛ طلقة ثالثة مكملة للثلاث بائنة بينونة كبرى هادمة للحل والملك معاً طبقاً للمادتين 123 و127 من مدونة الأسرة، لا تحل له من بعدها حتى تنكح زوجاً غيره نكاحاً صحيحاً ويدخل بها دخولاً حقيقياً بعد انقضاء عدتها منه شرعاً وقانوناً؛ ${prevDivorcesText}؛ ${consummationText}${duesText}${childrenText}${pregnancyText}؛ عرف قدره شهد به عليه وهو بأتمه وعرف به بما ذكر وقد وقع أسفل الشهادة بالسجل المشار إليه أعلاه بعد تلاوتنا عليه مضمون الشهادة وفصولها وشرحنا له مفرداتها ومعانيها وحرر في غده عبد ربه ${d.notary1} وعبد ربه ${d.notary2}`;
}

// ============================================================================
// MASTER DISPATCHER
// ============================================================================

export function isSettledDivorceDocument(state: FeesAgentState): boolean {
  if (!state) return false;
  const docType = state.documentType || '';
  const pType = state.divorceClassification?.primaryType;

  // EXPLICIT EXCEPTION: Do NOT touch rajah or murajaah
  if (pType === 'rajah' || pType === 'murajaah' || docType.includes('رجعة') || docType.includes('مراجعة')) {
    return false;
  }

  if (pType && ['revocable', 'khul', 'tamlik', 'discord', 'consensual', 'completed_three'].includes(pType)) {
    return true;
  }

  const docTypeStr = String(docType);
  return (
    docTypeStr === 'طلاق' ||
    docTypeStr.includes('طلاق') ||
    docTypeStr === 'الاشهاد_على_الطلاق_الاتفاقي'
  );
}

export function generateDivorceDraft(state: FeesAgentState): string {
  if (!isSettledDivorceDocument(state)) return '';

  const pType = state.divorceClassification?.primaryType;
  const docType = state.documentType || '';

  if (pType === 'revocable' || docType.includes('رجعي')) {
    return generateRevocableDivorceDraft(state);
  }
  if (pType === 'khul' || docType.includes('خلعي') || docType.includes('خلع')) {
    return generateKhulDivorceDraft(state);
  }
  if (pType === 'tamlik' || docType.includes('مملك') || docType.includes('تمليك')) {
    return generateTamlikDivorceDraft(state);
  }
  if (pType === 'discord' || docType.includes('شقاق')) {
    return generateDiscordDivorceDraft(state);
  }
  if (pType === 'consensual' || docType.includes('اتفاقي')) {
    return generateConsensualDivorceDraft(state);
  }
  if (pType === 'completed_three' || docType.includes('مكمل') || docType.includes('الثلاث')) {
    return generateCompletedThreeDivorceDraft(state);
  }

  // Fallback to revocable if generic طلاق
  return generateRevocableDivorceDraft(state);
}

// ============================================================================
// HTML RASM GENERATOR FOR STEP 7 A4 PREVIEW
// ============================================================================

export function generateDivorceRasmHtml(state: FeesAgentState): string {
  const d = extractCommonData(state);
  const draft = generateDivorceDraft(state);
  const dc = state.divorceClassification || ({} as any);
  const pType = dc.primaryType;

  let title = 'رسم إشهاد بالطلاق';
  if (pType === 'revocable') title = 'رسم إشهاد بطلاق رجعي';
  else if (pType === 'khul') title = 'رسم إشهاد بطلاق خلعي';
  else if (pType === 'tamlik') title = 'رسم إشهاد بطلاق مملك';
  else if (pType === 'discord') title = 'رسم توثيق حكم بالتطليق للشقاق';
  else if (pType === 'consensual') title = 'رسم إشهاد بطلاق اتفاقي';
  else if (pType === 'completed_three') title = 'رسم إشهاد بطلاق مكمل للثلاث';

  return `
    <div style="direction: rtl; text-align: justify; font-family: 'Amiri', 'Traditional Arabic', serif; color: #1e293b; background: #ffffff; padding: 40px; border: 3px double #0f766e; border-radius: 8px; line-height: 2.2; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      
      <!-- Moroccan Official Notarial Header -->
      <div style="text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 8px 0; font-size: 20px; color: #047857; font-weight: bold;">المملكة المغربية</h3>
        <p style="margin: 0 0 5px 0; font-size: 16px; color: #334155;">وزارة العدل</p>
        <p style="margin: 0 0 5px 0; font-size: 15px; color: #475569;">محكمة الاستئناف ب${d.appellateCourt}</p>
        <p style="margin: 0 0 15px 0; font-size: 15px; color: #475569;">المحكمة الابتدائية ب${d.primaryCourt} — ${d.courtSection}</p>
        <div style="display: inline-block; background: #ecfdf5; border: 1px solid #10b981; padding: 6px 30px; border-radius: 9999px;">
          <h2 style="margin: 0; font-size: 22px; color: #065f46; font-weight: bold;">${title}</h2>
        </div>
      </div>

      <!-- Reference Badges -->
      <div style="display: flex; justify-content: space-between; font-size: 14px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 20px; margin-bottom: 25px; color: #475569;">
        <div><span>رقم الملف: </span><strong style="color: #0f172a;">${d.fileNumber}</strong></div>
        <div><span>رقم الإذن القضائي: </span><strong style="color: #0f172a;">${d.permissionNumber}</strong></div>
        <div><span>تاريخ الإذن: </span><strong style="color: #0f172a;">${d.permissionDate}</strong></div>
        <div><span>سجل البيانات: </span><strong style="color: #0f172a;">رقم ${d.registryNumber} (ع ${d.registryCount} ص ${d.registryPage})</strong></div>
      </div>

      <!-- Main Legal Text from Official Template -->
      <div style="font-size: 19px; text-indent: 40px; margin-bottom: 35px; white-space: pre-wrap; color: #0f172a; text-align: justify;">
        ${draft}
      </div>

      <!-- Judicial Footer & Signatures Block -->
      <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 25px;">
        <div style="display: flex; justify-content: space-between; text-align: center; margin-bottom: 30px;">
          <div style="flex: 1; padding: 10px;">
            <p style="margin: 0 0 50px 0; font-weight: bold; color: #047857;">توقيع العدل الأول</p>
            <p style="margin: 0; font-size: 15px; color: #64748b;">الأستاذ: ${d.notary1}</p>
          </div>
          <div style="flex: 1; padding: 10px; border-right: 1px dashed #cbd5e1;">
            <p style="margin: 0 0 50px 0; font-weight: bold; color: #047857;">توقيع العدل الثاني</p>
            <p style="margin: 0; font-size: 15px; color: #64748b;">الأستاذ: ${d.notary2}</p>
          </div>
        </div>

        <div style="text-align: center; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; font-size: 13px; color: #92400e;">
          ⚖️ تم تضمين هذا الرسم بسجل البيانات طبقاً لأحكام القانون رقم 16.03 المتعلق بخطة العدالة ومقتضيات مدونة الأسرة المغربية.
        </div>
      </div>
    </div>
  `;
}
