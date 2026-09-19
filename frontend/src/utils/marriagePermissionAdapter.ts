import type { FeesAgentState, Party, SmartMarriageClassificationData, MarriageDetails } from '../types/feesAgentTypes';
import { createEmptyParty, convertGregorianToHijri, convertGregorianDateToWords, convertHijriDateToWords } from './feesAgentUtils';

export interface RawMarriagePermissionRecord {
  id: string;
  request_number: string;
  status?: string;
  decision_type?: string;
  decision_serial_number?: string;
  decided_at?: string;
  judge_name?: string;
  target_court?: string;
  jurisdiction?: string;
  involved_names?: string;
  created_at?: string;
  data?: any;
  [key: string]: any;
}

/**
 * Parses raw JSON if needed and extracts structured marriage permission form data.
 */
export function extractMarriageData(permission: RawMarriagePermissionRecord): Record<string, any> {
  if (!permission) return {};
  let dataObj: Record<string, any> = {};
  if (typeof permission.data === 'string') {
    try {
      dataObj = JSON.parse(permission.data);
    } catch {
      dataObj = {};
    }
  } else if (permission.data && typeof permission.data === 'object') {
    dataObj = permission.data;
  }
  return {
    ...permission,
    ...dataObj,
  };
}

/**
 * Normalizes Moroccan marital status strings to FeesAgent party options.
 */
function normalizeMaritalStatus(status?: string): 'اعزب' | 'ارمل' | 'مطلق' | '' {
  if (!status) return '';
  const s = status.trim();
  if (s.includes('عزب') || s.includes('بكر') || s.includes('أعزب')) return 'اعزب';
  if (s.includes('أرمل') || s.includes('ارمل') || s.includes('أرملة') || s.includes('ارملة')) return 'ارمل';
  if (s.includes('مطلق') || s.includes('مطلقة')) return 'مطلق';
  return '';
}

/**
 * Attempts to parse father & mother names from a composite parents string like "محمد وفاطمة" or "أحمد بن علي و أمينة".
 */
function parseParents(parentsStr?: string): { fatherName: string; motherName: string } {
  if (!parentsStr) return { fatherName: '', motherName: '' };
  const str = parentsStr.trim();
  const separators = [' و ', ' و', 'و ', ' / ', '/', ' - ', '-'];
  for (const sep of separators) {
    if (str.includes(sep)) {
      const parts = str.split(sep).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          fatherName: parts[0],
          motherName: parts.slice(1).join(' '),
        };
      }
    }
  }
  return { fatherName: str, motherName: '' };
}

/**
 * Converts a Marriage Permission record from the judicial portal into a fully-populated FeesAgentState
 * ready for marriage deed drafting without retyping couple details.
 */
export function convertMarriagePermissionToFeesAgent(
  permission: RawMarriagePermissionRecord,
  currentState?: Partial<FeesAgentState>
): Partial<FeesAgentState> {
  const merged = extractMarriageData(permission);
  const today = new Date().toISOString().split('T')[0];

  // 1. Resolve Authorization / Judicial Decision Metadata
  const judgeDecision = merged.judge_decision || {};
  const authorizationNumber =
    merged.decision_serial_number ||
    judgeDecision.decision_serial_number ||
    merged.request_number ||
    '';
  
  const rawAuthDate =
    merged.decided_at ||
    judgeDecision.decided_at ||
    merged.created_at ||
    today;
  const authorizationDate = rawAuthDate ? String(rawAuthDate).split('T')[0] : today;

  const courtName =
    merged.targetCourt ||
    merged.target_court ||
    merged.court ||
    merged.jurisdiction ||
    'المحكمة الابتدائية – قسم قضاء الأسرة';

  const judgeName =
    merged.judge_name ||
    judgeDecision.judge_name ||
    merged.judgeName ||
    'قاضي الأسرة المكلف بالزواج';

  // Fallback parsing from involved_names (e.g. "test2 test و fghgfh fghgfhf")
  let involvedSuitorName = '';
  let involvedFianceeName = '';
  const rawInvolved = merged.involved_names || merged.involvedNames || permission.involved_names || '';
  if (rawInvolved && typeof rawInvolved === 'string') {
    const splitInvolved = rawInvolved.split(/ و | \/ | - /);
    if (splitInvolved.length >= 2) {
      involvedSuitorName = splitInvolved[0].trim();
      involvedFianceeName = splitInvolved.slice(1).join(' و ').trim();
    }
  }

  // 2. Build Husband (Party 0)
  const husbandFatherMother = parseParents(merged.suitorParents);
  const husbandFirstName = merged.suitorFirstNameAr || '';
  const husbandLastName = merged.suitorLastNameAr || '';
  const husbandFullName = `${husbandFirstName} ${husbandLastName}`.trim() || merged.suitorName || involvedSuitorName || 'الزوج';
  const husbandFirstNameLat = merged.suitorFirstNameLat || '';
  const husbandLastNameLat = merged.suitorLastNameLat || '';
  const husbandFullNameLat = `${husbandFirstNameLat} ${husbandLastNameLat}`.trim();

  const suitorDocs = merged.suitorDocs || {};

  const husbandParty: Party = {
    ...createEmptyParty(),
    name: husbandFullName,
    fatherName: merged.suitorFatherName || husbandFatherMother.fatherName || '',
    motherName: merged.suitorMotherName || husbandFatherMother.motherName || '',
    placeOfBirth: merged.suitorPOB || '',
    dateOfBirth: merged.suitorDOB || '',
    address: [merged.suitorAddress, merged.suitorAdministrativeAnnex, merged.suitorCommune].filter(Boolean).join(' - ') || merged.suitorAddress || '',
    idNumber: merged.suitorCIN || '',
    idIssueDate: '',
    profession: merged.suitorProfession || '',
    nationality: (merged.suitorNationality?.includes('أجنب') || merged.suitorNationality?.includes('اجنب')) ? 'اجنبي' : 'مغربي',
    maritalStatus: normalizeMaritalStatus(merged.suitorFamilyStatus),
    nameLatin: husbandFullNameLat,
    birthCertificateNumber: suitorDocs.birthCert?.number || merged.suitorBirthRegistryNumber || '',
    birthCertificateDate: suitorDocs.birthCert?.date || '',
    medicalCertificateNumber: suitorDocs.medicalCert?.number || '',
    medicalCertificateDate: suitorDocs.medicalCert?.date || '',
    medicalCertificateIssuedBy: suitorDocs.medicalCert?.issuer || '',
    engagementCertificateNumber: suitorDocs.adminCert?.number || '',
    engagementCertificateDate: suitorDocs.adminCert?.date || '',
    underagePermissionNumber: suitorDocs.marriagePermission?.number || '',
    underagePermissionDate: suitorDocs.marriagePermission?.date || '',
    underagePermissionCourt: courtName,
    underagePermissionIssuedBy: courtName,
  };

  // 3. Build Wife (Party 1)
  const wifeFatherMother = parseParents(merged.fianceeParents);
  const wifeFirstName = merged.fianceeFirstNameAr || '';
  const wifeLastName = merged.fianceeLastNameAr || '';
  const wifeFullName = `${wifeFirstName} ${wifeLastName}`.trim() || merged.fianceeName || involvedFianceeName || 'الزوجة';
  const wifeFirstNameLat = merged.fianceeFirstNameLat || '';
  const wifeLastNameLat = merged.fianceeLastNameLat || '';
  const wifeFullNameLat = `${wifeFirstNameLat} ${wifeLastNameLat}`.trim();

  const fianceeDocs = merged.fianceeDocs || {};

  const wifeParty: Party = {
    ...createEmptyParty(),
    name: wifeFullName,
    fatherName: merged.fianceeFatherName || wifeFatherMother.fatherName || '',
    motherName: merged.fianceeMotherName || wifeFatherMother.motherName || '',
    placeOfBirth: merged.fianceePOB || '',
    dateOfBirth: merged.fianceeDOB || '',
    address: [merged.fianceeAddress, merged.fianceeAdministrativeAnnex, merged.fianceeCommune].filter(Boolean).join(' - ') || merged.fianceeAddress || '',
    idNumber: merged.fianceeCIN || '',
    idIssueDate: '',
    profession: merged.fianceeProfession || '',
    nationality: (merged.fianceeNationality?.includes('أجنب') || merged.fianceeNationality?.includes('اجنب')) ? 'اجنبي' : 'مغربي',
    maritalStatus: normalizeMaritalStatus(merged.fianceeFamilyStatus),
    nameLatin: wifeFullNameLat,
    birthCertificateNumber: fianceeDocs.birthCert?.number || merged.fianceeBirthRegistryNumber || '',
    birthCertificateDate: fianceeDocs.birthCert?.date || '',
    medicalCertificateNumber: fianceeDocs.medicalCert?.number || '',
    medicalCertificateDate: fianceeDocs.medicalCert?.date || '',
    medicalCertificateIssuedBy: fianceeDocs.medicalCert?.issuer || '',
    engagementCertificateNumber: fianceeDocs.adminCert?.number || '',
    engagementCertificateDate: fianceeDocs.adminCert?.date || '',
    underagePermissionNumber: fianceeDocs.marriagePermission?.number || '',
    underagePermissionDate: fianceeDocs.marriagePermission?.date || '',
    underagePermissionCourt: courtName,
    underagePermissionIssuedBy: courtName,
    // Guardian details if present in permission
    contractsWithoutGuardian: merged.hasGuardian === 'نعم' ? 'لا' : (merged.hasGuardian === 'لا' ? 'نعم' : ''),
    guardianName: merged.guardianName || '',
    guardianNationalID: merged.guardianCIN || '',
    guardianRelationshipCustom: merged.guardianCapacity || '',
  };

  // 4. Smart Marriage Classification Gate Setup
  const isMinor =
    merged.marriageType?.includes('قاصر') ||
    !!suitorDocs.marriagePermission?.number ||
    !!fianceeDocs.marriagePermission?.number;

  const classification: SmartMarriageClassificationData = {
    primaryType: isMinor ? 'minor_marriage' : 'adult_marriage',
    minorParty: fianceeDocs.marriagePermission?.number ? 'wife' : 'husband',
    judgePermission: {
      permissionNumber: authorizationNumber,
      permissionDate: authorizationDate,
      courtName,
      judgeName,
      isVerified: true,
      status: 'verified',
      verificationSource: 'database',
      statusText: `تم الاستيراد والتحقق تلقائياً من بوابة أذونات الزواج - طلب رقم: ${permission.request_number}`,
    },
    confirmedAt: new Date().toISOString(),
  };

  // 5. Marriage Details Setup
  const resolvedDateHijri = convertGregorianToHijri(authorizationDate || today);
  const marriageDetails: MarriageDetails = {
    dowryAmount: 0,
    dowryAmountInWords: '',
    isDowryReceived: 'كاملا',
    dowryPaymentMethod: 'اعترافا',
    hasOtherDowryItems: 'لا',
    otherDowryItems: [],
    dowryAdvance: 0,
    dowryAdvanceInWords: '',
    dowryDeferred: 0,
    dowryDeferredInWords: '',
    hasAssetManagementAgreement: 'لا',
    hasSpecialConditions: 'لا',
    specialConditionsOwner: '',
    specialConditionsText: '',
    courtSection: 'قسم التوثيق وقضاء الأسرة',
    authorizationNumber,
    authorizationDate,
    hijriDate: resolvedDateHijri,
    registryBookType: 'كناش الأنكحة',
    registryNumber: '',
    registryPage: '',
    registryCount: '',
    registryDate: today,
    memorandumNumber: '',
    memorandumRecordNumber: '',
    memorandumPage: '',
    sessionTimeWords: '',
    sessionDateWords: convertGregorianDateToWords(today) ? `يوم ${convertGregorianDateToWords(today)}` : '',
    mixedMarriageForeignParty: '',
    husbandConvertedToIslam: '',
    courtName,
    conversionCertificate: {
      book: '',
      number: '',
      page: '',
      count: '',
      date: '',
      notary: '',
    },
    ...(currentState?.marriageDetails || {}),
  };

  // 6. Meta audit & tracking
  const meta = {
    ...(currentState?.meta || {}),
    court: courtName,
    originMarriagePermissionId: permission.id,
    originRequestNumber: permission.request_number,
    dateGregorian: today,
    dateHijri: convertGregorianToHijri(today),
    dateGregorianInWords: convertGregorianDateToWords(today),
    dateHijriInWords: convertHijriDateToWords(today),
  };

  return {
    ...currentState,
    id: permission.id,
    documentType: 'زواج',
    step: 1, // Advance straight to Step 1 Parties Definition
    sellers: [husbandParty],
    buyers: [wifeParty],
    parties: [husbandParty, wifeParty],
    marriageClassification: classification,
    marriageDetails,
    finance: {
      price: 0,
      priceInWords: '',
      paymentMethod: 'اعترافا',
      registeredWithTax: 'لا',
      ...(currentState?.finance || {}),
    },
    meta: meta as any,
    isImportedFromMarriagePermission: true,
    importedPermissionReference: {
      id: permission.id,
      requestNumber: permission.request_number,
      authorizationNumber,
      authorizationDate,
      husbandName: husbandFullName,
      wifeName: wifeFullName,
      importedAt: new Date().toISOString(),
    },
  };
}
