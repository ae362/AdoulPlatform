import { supabase } from '../../services/supabase';
import { uploadDocument } from '../../utils/storage';
import {
  JUDGE_APPROVED_STATUSES,
  SignedDeedWorkflowStatus,
} from './types';

export function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s.length ? s : null;
}

export function pickFirstString(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    const s = toNonEmptyString(v);
    if (s) return s;
  }
  return null;
}

export function pickFirstDate(obj: any, keys: string[]): string | null {
  const s = pickFirstString(obj, keys);
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function mergeLiveJudgeSubmissionSnapshot(
  payload: Record<string, unknown>,
  submission: {
    id: string;
    status: string | null;
    decision: string | null;
    judge_notes: string | null;
    updated_at: string | null;
    decided_at: string | null;
  } | null,
): Record<string, unknown> {
  const judgeSubmissionId =
    String((payload as any)?.step7JudgeSubmissionId || (payload as any)?.judgeSubmissionId || '').trim() || null;

  if (!judgeSubmissionId) {
    return payload;
  }

  const nextStep = (() => {
    const current = String((payload as any)?.step7Step || (payload as any)?.workflowStep || '').trim();
    if (current === 'inclusion' || current === 'final') return current;
    return 'judicial_review';
  })();

  return {
    ...payload,
    judgeSubmissionId,
    step7JudgeSubmissionId: judgeSubmissionId,
    step7Step: nextStep,
    workflowStep: nextStep,
    judgeSubmissionStatus: submission?.status ?? ((payload as any)?.judgeSubmissionStatus ?? null),
    judgeSubmissionDecision: submission?.decision ?? ((payload as any)?.judgeSubmissionDecision ?? null),
    judgeSubmissionJudgeNotes: submission?.judge_notes ?? ((payload as any)?.judgeSubmissionJudgeNotes ?? null),
    judgeSubmissionUpdatedAt: submission?.updated_at ?? ((payload as any)?.judgeSubmissionUpdatedAt ?? null),
    judgeSubmissionDecidedAt: submission?.decided_at ?? ((payload as any)?.judgeSubmissionDecidedAt ?? null),
  };
}

export function deriveSignedDeedWorkflowStatus(
  stage: string | null | undefined,
  readyForJudge: boolean,
  latestJudgeSubmissionStatus?: string | null,
  hasPostJudgeArchiveVersion?: boolean,
): SignedDeedWorkflowStatus {
  const normalizedStage = String(stage || '').trim().toLowerCase();
  const normalizedJudgeStatus = String(latestJudgeSubmissionStatus || '').trim().toLowerCase();
  if (hasPostJudgeArchiveVersion) return 'FinalArchived';
  if (normalizedStage === 'final_archived') return 'FinalArchived';
  if (normalizedStage === 'judge_endorsed') return 'JudgeEndorsed';
  if (normalizedStage === 'pending_judge_endorsement' || normalizedStage === 'sent_to_judge') {
    return 'PendingJudgeEndorsement';
  }
  if (normalizedJudgeStatus === 'accepted' || normalizedJudgeStatus === 'accepted_with_notes') {
    return 'JudgeEndorsed';
  }
  if (
    normalizedJudgeStatus === 'pending' ||
    normalizedJudgeStatus === 'in_review' ||
    normalizedJudgeStatus === 'substantive_notes'
  ) {
    return 'PendingJudgeEndorsement';
  }
  return readyForJudge ? 'NotSent' : 'NotSent';
}

export function extractInclusionFromPayload(payload: any) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const auditHub = (p as any)?.auditHubInclusion && typeof (p as any).auditHubInclusion === 'object'
    ? (p as any).auditHubInclusion
    : ((p as any)?.audit_hub_inclusion && typeof (p as any).audit_hub_inclusion === 'object' ? (p as any).audit_hub_inclusion : null);
  const meta = (p as any)?.meta && typeof (p as any).meta === 'object' ? (p as any).meta : null;
  const notaries = (p as any)?.notaries && typeof (p as any).notaries === 'object' ? (p as any).notaries : null;
  const auditHubNotaries = auditHub && typeof (auditHub as any)?.notaries === 'object' ? (auditHub as any).notaries : null;

  const inclusionId = pickFirstString(p, ['inclusionId', 'inclusion_id', 'InclusionID', 'InclusionId']);
  const registerNumber = pickFirstString(p, ['registryNumber', 'registry_number', 'registerNumber', 'register_number', 'inclusionRegisterNumber', 'inclusion_register_number'])
    || pickFirstString(auditHub, ['registryNumber', 'registry_number', 'registerNumber', 'register_number', 'inclusionRegisterNumber', 'inclusion_register_number']);
  const registryLetter = pickFirstString(p, ['registryLetter', 'registry_letter', 'letter', 'deedLetter', 'deed_letter'])
    || pickFirstString(auditHub, ['registryLetter', 'registry_letter', 'letter', 'deedLetter', 'deed_letter']);
  const registryBookType = pickFirstString(p, ['registryBookType', 'registry_book_type', 'bookType', 'book_type', 'registerType', 'register_type'])
    || pickFirstString(auditHub, ['registryBookType', 'registry_book_type', 'bookType', 'book_type', 'registerType', 'register_type']);
  const certificateNumber = pickFirstString(p, ['certificateNumber', 'certificate_number', 'registryCount', 'registry_count', 'inclusionCertificateNumber', 'inclusion_certificate_number'])
    || pickFirstString(auditHub, ['certificateNumber', 'certificate_number', 'registryCount', 'registry_count', 'inclusionCertificateNumber', 'inclusion_certificate_number']);
  const registryPage = pickFirstString(p, ['registryPage', 'registry_page', 'pageNumber', 'page_number', 'inclusionPageNumber', 'inclusion_page_number'])
    || pickFirstString(auditHub, ['registryPage', 'registry_page', 'pageNumber', 'page_number', 'inclusionPageNumber', 'inclusion_page_number']);
  const inclusionDate = pickFirstDate(p, ['inclusionDate', 'inclusion_date', 'createdAt', 'created_at', 'registrationDate', 'registration_date'])
    || pickFirstDate(auditHub, ['inclusionDate', 'inclusion_date', 'registrationDate', 'registration_date', 'documentDate', 'document_date', 'date']);
  const inclusionHijri = pickFirstString(p, ['inclusionHijri', 'inclusion_hijri', 'dateHijri', 'date_hijri']);
  const court = pickFirstString(p, ['court', 'court_name', 'courtName', 'primaryCourt', 'primary_court', 'authority'])
    || pickFirstString(auditHub, ['court', 'court_name', 'courtName', 'primaryCourt', 'primary_court', 'authority']);
  const operationId = pickFirstString(p, ['operationId', 'operation_id', 'processId', 'process_id', 'transactionId', 'transaction_id', 'serial', 'reference'])
    || pickFirstString(auditHub, ['operationId', 'operation_id', 'processId', 'process_id', 'transactionId', 'transaction_id', 'serial', 'reference']);
  const inclusionHash = pickFirstString(p, ['inclusionHash', 'inclusion_hash', 'hashInclusion', 'hash_inclusion', 'preHash', 'pre_hash']);
  const notary1Name = pickFirstString(p, ['notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name', 'notaryPrimary', 'notary_primary'])
    || pickFirstString(notaries, ['primary', 'notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name'])
    || pickFirstString(meta, ['notaryPrimary', 'notary_primary'])
    || pickFirstString(auditHub, ['notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name', 'notaryPrimary', 'notary_primary'])
    || pickFirstString(auditHubNotaries, ['primary', 'notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name']);
  const notary2Name = pickFirstString(p, ['notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'notarySecondary', 'notary_secondary', 'partnerName', 'partner_name', 'partner'])
    || pickFirstString(notaries, ['secondary', 'notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'partnerName', 'partner_name'])
    || pickFirstString(meta, ['notarySecondary', 'notary_secondary', 'partnerName', 'partner_name', 'partner'])
    || pickFirstString(auditHub, ['notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'notarySecondary', 'notary_secondary', 'partnerName', 'partner_name', 'partner'])
    || pickFirstString(auditHubNotaries, ['secondary', 'notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'partnerName', 'partner_name']);

  return {
    inclusionId,
    registryBookType,
    registerNumber,
    registryLetter,
    certificateNumber,
    registryPage,
    inclusionDate,
    inclusionHijri,
    court,
    operationId,
    inclusionHash,
    notary1Name,
    notary2Name,
  };
}

export function hasMeaningfulInclusionFields(incl: ReturnType<typeof extractInclusionFromPayload>): boolean {
  return Boolean(
    incl.registerNumber ||
      incl.certificateNumber ||
      incl.registryPage ||
      incl.inclusionDate ||
      incl.court ||
      incl.operationId ||
      incl.inclusionHash
  );
}

export async function persistInclusionForSavedRasm(opts: {
  savedRasmId: string;
  payload: any;
  existingInclusionId?: string | null;
  fallbackNotaryName?: string | null;
}): Promise<string | null> {
  const payloadObj = opts.payload && typeof opts.payload === 'object' ? opts.payload : {};
  const parsed = extractInclusionFromPayload(payloadObj);

  if (!hasMeaningfulInclusionFields(parsed)) return null;

  const resolvedExisting = opts.existingInclusionId ? String(opts.existingInclusionId) : null;
  const fromPayload = parsed.inclusionId ? String(parsed.inclusionId) : null;
  let inclusionId: string | null = resolvedExisting || fromPayload;

  const buildPatch = () => {
    const patch: any = {};
    if (parsed.registerNumber) patch.register_number = parsed.registerNumber;
    if (parsed.certificateNumber) patch.certificate_number = parsed.certificateNumber;
    if (parsed.registryPage) patch.registry_page = parsed.registryPage;
    if (parsed.inclusionDate) patch.inclusion_date = parsed.inclusionDate;
    if (parsed.inclusionHijri) patch.inclusion_hijri = parsed.inclusionHijri;
    if (parsed.court) patch.court = parsed.court;
    if (parsed.operationId) patch.operation_id = parsed.operationId;
    if (parsed.inclusionHash) patch.inclusion_hash = parsed.inclusionHash;
    if (parsed.notary1Name || opts.fallbackNotaryName) patch.notary1_name = parsed.notary1Name ?? opts.fallbackNotaryName ?? null;
    if (parsed.notary2Name) patch.notary2_name = parsed.notary2Name;
    return patch;
  };

  const inclPatch = buildPatch();
  if (!Object.keys(inclPatch).length) return null;

  if (inclusionId) {
    const upd = await supabase.from('inclusion_registry').update(inclPatch).eq('id', inclusionId);
    if (!upd.error) {
      try {
        await supabase.from('saved_rasms').update({ inclusion_id: inclusionId }).eq('id', opts.savedRasmId);
      } catch {
        // best-effort
      }
      return inclusionId;
    }
    inclusionId = null;
  }

  const ins = await supabase
    .from('inclusion_registry')
    .insert(inclPatch)
    .select('id')
    .single();

  if (ins.error || !ins.data) return null;

  inclusionId = String(ins.data.id);
  try {
    await supabase.from('saved_rasms').update({ inclusion_id: inclusionId }).eq('id', opts.savedRasmId);
  } catch {
    // best-effort
  }
  return inclusionId;
}

export function extractPartiesFromPayload(payload: any): Array<{ role: string | null; fullName: string; idNumber: string | null; phone: string | null }> {
  const p = payload && typeof payload === 'object' ? payload : {};
  const parties: Array<{ role: string | null; fullName: string; idNumber: string | null; phone: string | null }> = [];

  const readParty = (obj: any, role: string | null) => {
    const fullName = pickFirstString(obj, ['fullName', 'full_name', 'name', 'partyName', 'party_name']);
    if (!fullName) return;
    const idNumber = pickFirstString(obj, ['idNumber', 'id_number', 'cin', 'CIN', 'nationalId', 'national_id', 'id']);
    const phone = pickFirstString(obj, ['phone', 'phoneNumber', 'phone_number', 'mobile', 'mobile_number']);
    parties.push({ role, fullName, idNumber, phone });
  };

  const pushFromArray = (arr: any, role: string) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((x) => readParty(x, role));
  };

  pushFromArray((p as any).sellers, 'seller');
  pushFromArray((p as any).buyers, 'buyer');
  pushFromArray((p as any).applicants, 'applicant');

  const husbandName = pickFirstString(p, ['husband_name', 'husbandName', 'husband']);
  const wifeName = pickFirstString(p, ['wife_name', 'wifeName', 'wife']);
  if (husbandName) {
    const idNumber = pickFirstString(p, ['husband_id', 'husbandId', 'husband_id_number', 'husbandIdNumber']);
    parties.push({ role: 'husband', fullName: husbandName, idNumber, phone: null });
  }
  if (wifeName) {
    const idNumber = pickFirstString(p, ['wife_id', 'wifeId', 'wife_id_number', 'wifeIdNumber']);
    parties.push({ role: 'wife', fullName: wifeName, idNumber, phone: null });
  }

  const party1Name = pickFirstString(p, ['party1Name', 'party_1_name', 'firstPartyName']);
  const party2Name = pickFirstString(p, ['party2Name', 'party_2_name', 'secondPartyName']);
  if (party1Name) parties.push({ role: 'party_1', fullName: party1Name, idNumber: null, phone: null });
  if (party2Name) parties.push({ role: 'party_2', fullName: party2Name, idNumber: null, phone: null });

  const partiesNames = pickFirstString(p, [
    'parties_names',
    'partiesNames',
    'parties',
    'partySummary',
    'involvedNames',
    'involved_names',
  ]);
  if (partiesNames) {
    partiesNames
      .split(/[-,،؛|/\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((name) => parties.push({ role: null, fullName: name, idNumber: null, phone: null }));
  }

  const seen = new Set<string>();
  return parties.filter((x) => {
    const key = `${x.role || ''}::${x.fullName}::${x.idNumber || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractTaxReferenceCandidates(payload: any): Array<{
  registrationNumber: string | null;
  registrationDate: string | null;
  paymentNumber: string | null;
  financeReference: string | null;
}> {
  const p = payload && typeof payload === 'object' ? payload : {};
  const candidates: Array<{
    registrationNumber: string | null;
    registrationDate: string | null;
    paymentNumber: string | null;
    financeReference: string | null;
  }> = [];

  const pushCandidate = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;

    const registrationNumber =
      pickFirstString(obj, [
        'registrationNumber',
        'registration_number',
        'depositNumber',
        'deposit_number',
        'taxRegistrationNumber',
        'tax_registration_number',
        'number',
        'recordNumber',
        'record_number',
        'counterpartNumber',
        'counterpart_number',
      ]) || null;
    const registrationDate =
      pickFirstDate(obj, ['registrationDate', 'registration_date', 'depositDate', 'deposit_date', 'date']) || null;
    const paymentNumber =
      pickFirstString(obj, [
        'paymentNumber',
        'payment_number',
        'depositNumber',
        'deposit_number',
        'receiptNumber',
        'receipt_number',
        'counterpartNumber',
        'counterpart_number',
        'number',
        'recordNumber',
        'record_number',
      ]) || null;
    const financeReference =
      pickFirstString(obj, [
        'financeReference',
        'finance_reference',
        'registeredAtFinance',
        'registered_at_finance',
        'registeredAt',
        'registered_at',
        'book',
        'bookType',
        'book_type',
      ]) || null;

    if (!registrationNumber && !registrationDate && !paymentNumber && !financeReference) return;
    candidates.push({ registrationNumber, registrationDate, paymentNumber, financeReference });
  };

  pushCandidate(p);
  pushCandidate((p as any).financialData);
  pushCandidate((p as any).financial_data);
  pushCandidate((p as any).postRegistration);
  pushCandidate((p as any).post_registration);
  pushCandidate((p as any).taxRegistration);
  pushCandidate((p as any).tax_registration);
  pushCandidate((p as any).finance);

  const properties = Array.isArray((p as any).properties) ? (p as any).properties : [];
  properties.forEach((property: any) => {
    const titleDocuments = Array.isArray(property?.titleDocuments) ? property.titleDocuments : [];
    titleDocuments.forEach((doc: any) => pushCandidate(doc));
  });

  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = `${item.registrationNumber || ''}::${item.registrationDate || ''}::${item.paymentNumber || ''}::${item.financeReference || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractPayloadDeedRelations(payload: any): Array<{
  originalDeed: string | null;
  originalDeedNumber: string | null;
  transferType: string | null;
  referenceDate: string | null;
}> {
  const p = payload && typeof payload === 'object' ? payload : {};
  const properties = Array.isArray((p as any).properties) ? (p as any).properties : [];
  const relations: Array<{
    originalDeed: string | null;
    originalDeedNumber: string | null;
    transferType: string | null;
    referenceDate: string | null;
  }> = [];

  properties.forEach((property: any) => {
    const titleDocuments = Array.isArray(property?.titleDocuments) ? property.titleDocuments : [];
    titleDocuments.forEach((doc: any) => {
      const bookReference = pickFirstString(doc, ['bookReference', 'book_reference', 'register', 'registerNumber']);
      const number = pickFirstString(doc, ['number', 'deedNumber', 'deed_number']);
      const letter = pickFirstString(doc, ['letter', 'deedLetter', 'deed_letter']);
      const page = pickFirstString(doc, ['page', 'pageNumber', 'page_number']);
      const count = pickFirstString(doc, ['count', 'certificateNumber', 'certificate_number']);
      const transferType = pickFirstString(doc, ['feeType', 'type', 'deedType', 'deed_type']);
      const referenceDate = pickFirstDate(doc, ['date', 'correspondingDate', 'corresponding_date']);

      const parts = [
        bookReference ? `دفتر ${bookReference}` : null,
        number ? `رقم ${number}` : null,
        letter ? `حرف ${letter}` : null,
        page ? `صحيفة ${page}` : null,
        count ? `عدد ${count}` : null,
      ].filter(Boolean);

      if (!parts.length && !transferType && !referenceDate) return;

      relations.push({
        originalDeed: parts.length ? parts.join(' | ') : null,
        originalDeedNumber: number,
        transferType,
        referenceDate,
      });
    });
  });

  const seen = new Set<string>();
  return relations.filter((item) => {
    const key = `${item.originalDeed || ''}::${item.transferType || ''}::${item.referenceDate || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractTitleDocumentCandidates(payload: any): Array<{
  deedType: string | null;
  bookType: string | null;
  bookNumber: string | null;
  number: string | null;
  count: string | null;
  page: string | null;
  office: string | null;
  date: string | null;
  notes: string | null;
}> {
  const p = payload && typeof payload === 'object' ? payload : {};
  const properties = Array.isArray((p as any).properties) ? (p as any).properties : [];
  const candidates: Array<{
    deedType: string | null;
    bookType: string | null;
    bookNumber: string | null;
    number: string | null;
    count: string | null;
    page: string | null;
    office: string | null;
    date: string | null;
    notes: string | null;
  }> = [];

  properties.forEach((property: any) => {
    const titleDocuments = Array.isArray(property?.titleDocuments) ? property.titleDocuments : [];
    titleDocuments.forEach((doc: any) => {
      const deedType = pickFirstString(doc, ['feeType', 'type', 'deedType', 'deed_type']);
      const bookType = pickFirstString(doc, ['bookType', 'book_type']);
      const bookNumber = pickFirstString(doc, ['bookNumber', 'book_number', 'register', 'registerNumber']);
      const number = pickFirstString(doc, ['number', 'deedNumber', 'deed_number', 'counterpartNumber', 'counterpart_number']);
      const count = pickFirstString(doc, ['count', 'certificateNumber', 'certificate_number']);
      const page = pickFirstString(doc, ['page', 'pageNumber', 'page_number']);
      const office = pickFirstString(doc, ['court', 'courtName', 'court_name', 'office', 'officeName', 'office_name', 'authority']);
      const date = pickFirstDate(doc, ['date', 'deedDate', 'deed_date', 'correspondingDate', 'corresponding_date']);
      const notes = pickFirstString(doc, ['notes', 'remarks', 'comment', 'comments', 'observation']);

      if (!deedType && !bookType && !bookNumber && !number && !count && !page && !office && !date && !notes) return;
      candidates.push({ deedType, bookType, bookNumber, number, count, page, office, date, notes });
    });
  });

  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = `${item.deedType || ''}::${item.bookType || ''}::${item.bookNumber || ''}::${item.number || ''}::${item.count || ''}::${item.page || ''}::${item.office || ''}::${item.date || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractSecureArchiveSearchDetails(payload: any) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const auditHub =
    (p as any).auditHubInclusion && typeof (p as any).auditHubInclusion === 'object'
      ? (p as any).auditHubInclusion
      : ((p as any).audit_hub_inclusion && typeof (p as any).audit_hub_inclusion === 'object'
        ? (p as any).audit_hub_inclusion
        : ((p as any).auditHub && typeof (p as any).auditHub === 'object' ? (p as any).auditHub : {}));
  const meta = (p as any).meta && typeof (p as any).meta === 'object' ? (p as any).meta : {};
  const notaries = (p as any).notaries && typeof (p as any).notaries === 'object' ? (p as any).notaries : {};
  const financialData = (p as any).financialData && typeof (p as any).financialData === 'object' ? (p as any).financialData : {};
  const parties = extractPartiesFromPayload(p);
  const titleDocuments = extractTitleDocumentCandidates(p);
  const taxReferences = extractTaxReferenceCandidates(p);

  return {
    certificateType:
      pickFirstString(p, ['certificateType', 'certificate_type', 'documentType', 'document_type']) ||
      pickFirstString(meta, ['documentType', 'document_type']) ||
      null,
    inclusionRegistryType:
      pickFirstString(p, ['registryBookType', 'registry_book_type', 'bookType', 'book_type', 'registerType', 'register_type']) ||
      pickFirstString(auditHub, ['registryBookType', 'registry_book_type', 'bookType', 'book_type', 'registerType', 'register_type']) ||
      null,
    intakeOffice:
      pickFirstString(p, ['court', 'courtName', 'court_name', 'authority', 'officeName', 'office_name']) ||
      pickFirstString(auditHub, ['court', 'courtName', 'court_name', 'authority', 'officeName', 'office_name']) ||
      null,
    intakeDate:
      pickFirstDate(p, ['intakeDate', 'intake_date', 'receivedAt', 'received_at', 'submissionDate', 'submission_date', 'date']) ||
      pickFirstDate(auditHub, ['intakeDate', 'intake_date', 'receivedAt', 'received_at', 'submissionDate', 'submission_date', 'date']) ||
      null,
    referenceNumber:
      pickFirstString(p, ['reference', 'referenceNumber', 'reference_number', 'serial', 'operationId', 'operation_id']) ||
      pickFirstString(auditHub, ['reference', 'referenceNumber', 'reference_number', 'serial', 'operationId', 'operation_id']) ||
      null,
    registryNumber:
      pickFirstString(p, ['registryNumber', 'registry_number', 'registerNumber', 'register_number', 'register']) ||
      pickFirstString(auditHub, ['registryNumber', 'registry_number', 'registerNumber', 'register_number', 'register']) ||
      null,
    registryLetter:
      pickFirstString(p, ['registryLetter', 'registry_letter', 'letter', 'deedLetter', 'deed_letter']) ||
      pickFirstString(auditHub, ['registryLetter', 'registry_letter', 'letter', 'deedLetter', 'deed_letter']) ||
      null,
    registryPage:
      pickFirstString(p, ['registryPage', 'registry_page', 'pageNumber', 'page_number', 'page']) ||
      pickFirstString(auditHub, ['registryPage', 'registry_page', 'pageNumber', 'page_number', 'page']) ||
      null,
    registryCount:
      pickFirstString(p, ['certificateNumber', 'certificate_number', 'registryCount', 'registry_count', 'count']) ||
      pickFirstString(auditHub, ['certificateNumber', 'certificate_number', 'registryCount', 'registry_count', 'count']) ||
      null,
    party1Name: parties[0]?.fullName || null,
    party1Id: parties[0]?.idNumber || null,
    party2Name: parties[1]?.fullName || null,
    party2Id: parties[1]?.idNumber || null,
    titleDeedType: titleDocuments[0]?.deedType || null,
    titleBookType: titleDocuments[0]?.bookType || null,
    titleBookNumber: titleDocuments[0]?.bookNumber || null,
    titleDeedNumber: titleDocuments[0]?.number || null,
    titleDeedCount: titleDocuments[0]?.count || null,
    titleDeedPage: titleDocuments[0]?.page || null,
    titleDeedOffice: titleDocuments[0]?.office || null,
    titleDeedDate: titleDocuments[0]?.date || null,
    titleDeedNotes: titleDocuments[0]?.notes || null,
    financialCounterpartNumber:
      pickFirstString(financialData, ['counterpartNumber', 'counterpart_number', 'referenceNumber', 'reference_number']) ||
      pickFirstString(p, ['counterpartNumber', 'counterpart_number']) ||
      null,
    propertyIncomeReference:
      pickFirstString(financialData, ['propertyIncome', 'property_income', 'realEstateIncome', 'real_estate_income']) ||
      pickFirstString(p, ['propertyIncome', 'property_income', 'realEstateIncome', 'real_estate_income']) ||
      null,
    financialBook:
      pickFirstString(financialData, ['book', 'bookType', 'book_type', 'register', 'registerType', 'register_type']) ||
      pickFirstString(p, ['financialBook', 'financial_book']) ||
      null,
    financialNumber:
      pickFirstString(financialData, ['number', 'recordNumber', 'record_number', 'counterpartNumber', 'counterpart_number']) ||
      pickFirstString(p, ['financialNumber', 'financial_number']) ||
      null,
    financialCount:
      pickFirstString(financialData, ['count', 'recordCount', 'record_count', 'certificateNumber', 'certificate_number']) ||
      pickFirstString(p, ['financialCount', 'financial_count']) ||
      null,
    financialDate:
      pickFirstDate(financialData, ['date', 'recordDate', 'record_date', 'registrationDate', 'registration_date']) ||
      pickFirstDate(p, ['financialDate', 'financial_date']) ||
      null,
    firstNotaryName:
      pickFirstString(p, ['notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name']) ||
      pickFirstString(notaries, ['primary', 'notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name']) ||
      null,
    secondNotaryName:
      pickFirstString(p, ['notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'partnerName', 'partner_name']) ||
      pickFirstString(notaries, ['secondary', 'notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'partnerName', 'partner_name']) ||
      null,
    notes:
      pickFirstString(p, ['notes', 'remarks', 'comment', 'comments', 'observations']) ||
      pickFirstString(auditHub, ['notes', 'remarks', 'comment', 'comments', 'observations']) ||
      null,
    taxReferences,
  };
}

export function extractRasmFilesStoragePathFromPublicUrl(url: string): string | null {
  try {
    const marker = '/storage/v1/object/public/rasm-files/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const rawPath = url.slice(idx + marker.length);
    // Sanitize path traversal attempts
    const sanitized = rawPath.replace(/\.\.[\/\\]/g, '').replace(/^[\\\/]+/, '').trim();
    return sanitized || null;
  } catch {
    return null;
  }
}

export function pickJudgeAttachmentFromPayload(payload: any, desiredCategory: 'judge_attachment' | 'judge_attachment_docx'): any {
  if (!payload || typeof payload !== 'object') return null;
  const list = Array.isArray(payload.attachments) ? payload.attachments : [];

  const hasData = (a: any) => !!(a?.base64 || a?.url || a?.fileUrl || a?.file_url || a?.fileURL);
  const categoryOf = (a: any) => (a?.category || '').toString().toLowerCase();
  const nameOf = (a: any) => (a?.name || a?.fileName || a?.filename || '').toString().toLowerCase();
  const typeOf = (a: any) => (a?.type || a?.mimeType || a?.mime_type || '').toString().toLowerCase();

  const manual = list.find((a: any) => hasData(a) && (a?.field || '').toString().includes('manualRasmFile'));

  if (desiredCategory === 'judge_attachment_docx') {
    const explicitDocx = list.find((a: any) => hasData(a) && categoryOf(a) === 'judge_attachment_docx');
    if (explicitDocx) return explicitDocx;

    const manualDocx = manual && (nameOf(manual).endsWith('.docx') || nameOf(manual).endsWith('.doc') || typeOf(manual).includes('word'));
    if (manualDocx) return manual;

    const docx = list.find((a: any) => {
      if (!hasData(a)) return false;
      const n = nameOf(a);
      const t = typeOf(a);
      return n.endsWith('.docx') || n.endsWith('.doc') || t.includes('wordprocessingml') || t.includes('msword');
    });
    if (docx) return docx;

    const single = payload.attachment;
    if (single && hasData(single)) {
      const n = nameOf(single);
      const t = typeOf(single);
      if (n.endsWith('.docx') || n.endsWith('.doc') || t.includes('word')) return single;
    }

    return null;
  }

  const explicitPdf = list.find((a: any) => hasData(a) && categoryOf(a) === 'judge_attachment');
  if (explicitPdf) return explicitPdf;

  if (manual) return manual;

  const pdf = list.find((a: any) => {
    if (!hasData(a)) return false;
    const n = nameOf(a);
    const t = typeOf(a);
    return n.endsWith('.pdf') || t.includes('application/pdf') || t.includes('pdf');
  });
  if (pdf) return pdf;

  const single = payload.attachment;
  if (single && hasData(single)) return single;

  return null;
}

export async function ensureSavedRasmHasJudgeAttachment(opts: {
  recordId: string;
  notaryUserId: string;
  payload: any;
  desiredCategory: 'judge_attachment' | 'judge_attachment_docx';
}): Promise<void> {
  const judgeSubmissionId = opts.payload?.judgeSubmissionId || opts.payload?.step7JudgeSubmissionId || null;
  if (!judgeSubmissionId) return;

  const { data: existing, error: existingError } = await supabase
    .from('deed_attachments')
    .select('id')
    .eq('record_type', 'saved_rasm')
    .eq('record_id', opts.recordId)
    .eq('category', opts.desiredCategory)
    .limit(1);

  if (existingError) throw new Error(existingError.message);
  if ((existing ?? []).length) return;

  const { data: submission, error: subError } = await supabase
    .from('judge_submissions')
    .select('id, notary_user_id, status, payload')
    .eq('id', judgeSubmissionId)
    .single();

  if (subError || !submission) return;
  if (submission.notary_user_id !== opts.notaryUserId) return;
  if (!JUDGE_APPROVED_STATUSES.includes((submission.status ?? '') as any)) {
    return;
  }

  const judgePayload = submission.payload && typeof submission.payload === 'object' ? submission.payload : null;
  const att = pickJudgeAttachmentFromPayload(judgePayload, opts.desiredCategory);
  if (!att) return;

  const name = (att.name || att.fileName || att.filename || 'judge_attachment').toString();
  const type = (att.type || att.mimeType || att.mime_type || 'application/octet-stream').toString();
  const size = Number(att.size || att.fileSize || 0) || null;

  let fileUrl = null;
  let storagePath = null;

  if (att.base64) {
    const uploaded = await uploadDocument({
      name,
      type,
      size: Number(att.size || att.fileSize || 0) || 0,
      base64: att.base64,
    });
    fileUrl = uploaded.url;
    storagePath = uploaded.path;
  } else {
    const url = (att.url || att.fileUrl || att.file_url || att.fileURL || '').toString();
    if (!url) return;
    fileUrl = url;
    storagePath = extractRasmFilesStoragePathFromPublicUrl(url);
  }

  if (!fileUrl) return;

  const { error: insertError } = await supabase.from('deed_attachments').insert({
    record_id: opts.recordId,
    record_type: 'saved_rasm',
    category: opts.desiredCategory,
    file_name: name,
    file_url: fileUrl,
    storage_path: storagePath || '',
    mime_type: type,
    file_size: size,
    metadata: {
      source: 'judge_submission',
      judgeSubmissionId,
      field: att.field ?? null,
      originalCategory: att.category ?? null,
    },
  });

  if (insertError) throw new Error(insertError.message);
}

export async function ensureSavedRasmHasJudgeAttachments(opts: {
  recordId: string;
  notaryUserId: string;
  payload: any;
}): Promise<void> {
  await ensureSavedRasmHasJudgeAttachment({ ...opts, desiredCategory: 'judge_attachment' });
  await ensureSavedRasmHasJudgeAttachment({ ...opts, desiredCategory: 'judge_attachment_docx' });
}
