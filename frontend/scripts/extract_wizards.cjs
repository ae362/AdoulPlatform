const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../src/modules/FeesAgent.tsx'), 'utf8');
const lines = content.split('\n');

function getLines(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

const baseDir = path.join(__dirname, '../src/components/FeesAgent');

function makeStepComponent(stepCode, stepName) {
  const regex = new RegExp(`const\\s+${stepName}\\s*=\\s*\\(\\)\\s*=>\\s*\\{`);
  const hasHandleNext = stepCode.includes('const handleNext');
  const hasHandlePrev = stepCode.includes('const handlePrev');
  
  let injection = '';
  if (!hasHandleNext) {
    injection += `  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };\n`;
  }
  if (!hasHandlePrev) {
    injection += `  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };\n`;
  }
  
  return stepCode.replace(regex, `export const ${stepName}: React.FC<DocumentWizardProps> = ({ state, setState }) => {\n${injection}`);
}

const fullTypesImport = `import type {
  PaymentMethod, PropertyType, ValidationSeverity, Party, Applicant,
  TitleDocumentDetails, OwnershipCertificateDetails, PropertyDetails,
  FinanceDetails, DocumentMeta, ValidationAlert, AuditEntry,
  AdministrativeCertificate, PostRegistrationDetails, InheritanceDeed,
  Witness, PartitionBeneficiary, PartitionDivision, FacilityShare,
  FacilityItem, CommonFacilities, BuildingProof, EasementProof,
  PossessionProof, PromiseToSell, ProofOfEstate, EstateInventory,
  WillDeed, ExchangeDeed, DeliveryDeed, AcknowledgmentDeed,
  DebtDischargeDeed, DebtAcknowledgmentDeed, PersonIdentityFields,
  BilingualPersonIdentity, MarriageContinuityDeed, MarriageDetails,
  DowryDetails, TawkilScope, FeesAgentState
} from '../../../../types/feesAgentTypes';`;

const fullUtilsImport = `import {
  createEmptyTitleDocument, createEmptyProperty, createEmptyPartitionDivision,
  createEmptyParty, createEmptyWitness, calculateAge, convertGregorianToHijri,
  generateFileNumber, convertNumberToArabicWords, convertGregorianDateToWords,
  convertHijriDateToWords, convertTimeToWords, getArabicWeekdayName,
  generateValidationId, generateValidationAlert, performValidationChecks,
  executeLegalFiltersForPossession, validatePossessionConditions,
  validateWitnessRequirements, generateOutcomeRouting
} from '../../../../utils/feesAgentUtils';
import { formatCourtName, generateRasmHtml, generateDocumentDraft } from '../../../../templates/feesAgentTemplates';`;

const fullLocalesImport = `import {
  type DocumentType, type PartyLabels, DEFAULT_PARTY_LABELS,
  DOCUMENT_PARTY_LABELS, getPartyLabels, DOCUMENT_CATEGORIES,
  LEGAL_ENTITY_TYPE_OPTIONS, REPRESENTATION_DOC_TYPE_OPTIONS,
  PROFESSIONAL_CONVICTION_QUESTIONS, JUDGE_SEND_TRANSIT_MESSAGES,
  ARABIC_ONES, ARABIC_TENS, ARABIC_TEENS, ARABIC_HUNDREDS,
  GREGORIAN_MONTHS_ARABIC, SALE_DOCUMENT_TYPES, FAMILY_DEED_TYPES,
  MARRIAGE_DOCUMENT_TYPES, INHERITANCE_DOCUMENT_TYPES
} from '../../../../constants/feesAgentLocales';`;

const fullIconsImport = `import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar
} from 'lucide-react';`;

// Helper to wrap standard wizard
function makeStandardWizard(name, customStep3Code = null, customStep3Name = null, options = {}) {
  const isLineage = options.isLineage || false;
  const isPartition = options.isPartition || false;
  
  let step3Render = `<Step3_AdministrativeCertificates state={state} setState={setState} />`;
  if (customStep3Name) {
    step3Render = `<${customStep3Name} state={state} setState={setState} />`;
  }

  let code = `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step1_PartiesDefinition } from '../../steps/Step1_PartiesDefinition';
import { Step2_PropertyDetails } from '../../steps/Step2_PropertyDetails';
import { Step3_AdministrativeCertificates } from '../../steps/Step3_AdministrativeCertificates';
import { Step4_Finance } from '../../steps/Step4_Finance';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import { Step6_Dates } from '../../steps/Step6_Dates';
import { ShareDistributionModal } from '../../modals';
${fullTypesImport}
${fullUtilsImport}
${fullLocalesImport}
${fullIconsImport}
`;

  if (customStep3Code && customStep3Name) {
    code += `\n${makeStepComponent(customStep3Code, customStep3Name)}\n`;
  }

  if (isPartition && options.partitionCode) {
    code += `\n${makeStepComponent(options.partitionCode, 'Step3_PartitionDetails')}\n`;
  }

  code += `
export const ${name}: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      ${!isLineage ? `{state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}` : ''}
      {state.step === 3 && ${step3Render}}
      ${isPartition ? `{state.step === 3.5 && <Step3_PartitionDetails state={state} setState={setState} />}` : ''}
      ${!isLineage ? `{state.step === 4 && <Step4_Finance state={state} setState={setState} />}` : ''}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
`;

  return code;
}

// ----------------------------------------------------------------------------
// 1. STEPS
// ----------------------------------------------------------------------------
const step1LegalEntityBody = getLines(4236, 4854);
const step1PartiesBody = getLines(8018, 11624)
  .replace(/state\.documentType\s*===\s*'استمرار_الزوجية'/g, "(state.documentType as string) === 'استمرار_الزوجية'")
  .replace(/state\.documentType\s*!==\s*'استمرار_الزوجية'/g, "(state.documentType as string) !== 'استمرار_الزوجية'")
  .replace(/state\.documentType\s*===\s*'طلاق'/g, "(state.documentType as string) === 'طلاق'")
  .replace(/state\.documentType\s*===\s*'طلاق_اتفاقي'/g, "(state.documentType as string) === 'طلاق_اتفاقي'")
  .replace(/state\.documentType\s*===\s*'رجعة'/g, "(state.documentType as string) === 'رجعة'")
  .replace(/state\.documentType\s*!==\s*'مقاسمة'/g, "(state.documentType as string) !== 'مقاسمة'")
  .replace(/state\.documentType\s*===\s*'مقاسمة'/g, "(state.documentType as string) === 'مقاسمة'")
  .replace(/state\.documentType\s*===\s*'بيع_وشراء'/g, "(state.documentType as string) === 'بيع_وشراء'")
  .replace(/state\.documentType\s*===\s*'بيع_وشراء_معنوي'/g, "(state.documentType as string) === 'بيع_وشراء_معنوي'")
  .replace(/state\.documentType\s*===\s*'عقد_ايجار_المفضي_الى_تملك'/g, "(state.documentType as string) === 'عقد_ايجار_المفضي_الى_تملك'")
  .replace(/state\.documentType\s*===\s*'بيع_وشراء_طور_انجاز_ابتدائي'/g, "(state.documentType as string) === 'بيع_وشراء_طور_انجاز_ابتدائي'")
  .replace(/state\.documentType\s*===\s*'بيع_وشراء_طور_انجاز_نهائي'/g, "(state.documentType as string) === 'بيع_وشراء_طور_انجاز_نهائي'")
  .replace(/=== 'ارملة'/g, "=== ('ارملة' as any)")
  .replace(/=== 'مطلقة'/g, "=== ('مطلقة' as any)");

fs.writeFileSync(path.join(baseDir, 'steps/Step1_PartiesDefinition.tsx'), `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type {
  Party, Applicant, PossessionProof, InheritanceDeed
} from '../../../types/feesAgentTypes';
import { createEmptyParty, calculateAge, performValidationChecks } from '../../../utils/feesAgentUtils';
import {
  LEGAL_ENTITY_TYPE_OPTIONS,
  REPRESENTATION_DOC_TYPE_OPTIONS,
  INHERITANCE_DOCUMENT_TYPES,
  getPartyLabels
} from '../../../constants/feesAgentLocales';
import { ShareDistributionModal } from '../modals';
${fullIconsImport}

export const Step1_PartiesDefinition: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const isMinor = (dob?: string) => {
    if (!dob) return false;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 18;
  };

  const [tempSellers, setTempSellers] = useState<Party[]>(
    state.sellers?.length ? state.sellers.map((seller) => ({ ...createEmptyParty(), ...seller })) : [createEmptyParty()]
  );
  const [tempBuyers, setTempBuyers] = useState<Party[]>(
    state.buyers?.length ? state.buyers.map((buyer) => ({ ...createEmptyParty(), ...buyer })) : [createEmptyParty()]
  );
  const isInheritanceType = (INHERITANCE_DOCUMENT_TYPES as readonly string[]).includes(state.documentType);
  const [tempApplicant, setTempApplicant] = useState<Applicant>(
    state.applicant ? { ...state.applicant } : { ...createEmptyParty(), capacity: '' }
  );
  const [tempApplicants, setTempApplicants] = useState<Applicant[]>(
    state.applicants && state.applicants.length > 0
      ? state.applicants
      : [{ ...createEmptyParty(), capacity: '' }]
  );
  const [tempInheritanceDeeds, setTempInheritanceDeeds] = useState<InheritanceDeed[]>(
    state.inheritanceDeeds && state.inheritanceDeeds.length > 0 
      ? state.inheritanceDeeds 
      : [{ book: '', page: '', number: '', date: '', notary: '' }]
  );

  const handleSellerChange = (index: number, field: keyof Party, value: string | File | null) => {
    setTempSellers((prev) =>
      prev.map((seller, idx) =>
        idx === index
          ? ({
              ...seller,
              [field]: value,
            } as Party)
          : seller,
      ),
    );
  };

  const [ownershipCriteria, setOwnershipCriteria] = useState(
    state.ownershipCriteria || { areApplicantsOwners: '', areOwnersAlive: '' }
  );
  let labels = getPartyLabels(state.documentType);
  if ((state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areOwnersAlive === 'yes') {
    const isPossession = state.documentType === 'حيازة';
    if (ownershipCriteria.areApplicantsOwners === 'yes') {
      labels = {
        ...labels,
        buyerGroup: isPossession ? 'طالب الشهادة/الحائزون' : 'طالب الشهادة/الملاك',
        buyerSingle: isPossession ? 'الحائز' : 'المالك',
        buyerAdd: isPossession ? 'إضافة حائز' : 'إضافة مالك',
        buyerShareTitle: isPossession ? 'توزيع حصص الحائزين' : 'توزيع حصص الملاك',
      };
    } else {
      labels = {
        ...labels,
        buyerGroup: isPossession ? 'الحائزون' : 'الملاك',
        buyerSingle: isPossession ? 'الحائز' : 'المالك',
        buyerAdd: isPossession ? 'إضافة حائز' : 'إضافة مالك',
        buyerShareTitle: isPossession ? 'توزيع حصص الحائزين' : 'توزيع حصص الملاك',
      };
    }
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBuyerShareModal, setShowBuyerShareModal] = useState(false);
  const [showSellerShareModal, setShowSellerShareModal] = useState(false);
  const [showDeceasedSelectionModal, setShowDeceasedSelectionModal] = useState(false);

${step1LegalEntityBody}

${step1PartiesBody}
`);

const step2PropBody = getLines(12231, 14772)
  .replace("['ara', 'fari', 'ihsa'", "['ara' as any, 'fari', 'ihsa'")
  .replace(/state\.documentType\s*===\s*'ara'/g, "(state.documentType as string) === 'ara'")
  .replace(/state\.documentType\s*===\s*'حيازة'/g, "(state.documentType as string) === 'حيازة'");

fs.writeFileSync(path.join(baseDir, 'steps/Step2_PropertyDetails.tsx'), `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { PropertyDetails, TitleDocumentDetails, OwnershipCertificateDetails, PropertyType } from '../../../types/feesAgentTypes';
import { createEmptyProperty, createEmptyTitleDocument } from '../../../utils/feesAgentUtils';
${fullIconsImport}

export const Step2_PropertyDetails: React.FC<DocumentWizardProps> = ({ state, setState }) => {
${step2PropBody}
`);

const step3AdminBody = getLines(30073, 30405);
fs.writeFileSync(path.join(baseDir, 'steps/Step3_AdministrativeCertificates.tsx'), `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { AdministrativeCertificate } from '../../../types/feesAgentTypes';
${fullIconsImport}

export const Step3_AdministrativeCertificates: React.FC<DocumentWizardProps> = ({ state, setState }) => {
${step3AdminBody}
`);

const step4FinanceBody = getLines(31008, 31202);
fs.writeFileSync(path.join(baseDir, 'steps/Step4_Finance.tsx'), `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { PaymentMethod } from '../../../types/feesAgentTypes';
import { convertNumberToArabicWords } from '../../../utils/feesAgentUtils';
${fullIconsImport}

export const Step4_Finance: React.FC<DocumentWizardProps> = ({ state, setState }) => {
${step4FinanceBody}
`);

const step5WitnessesBody = getLines(31204, 31589)
  .replace("['ara', 'fari', 'ihsa'", "['ara' as any, 'fari', 'ihsa'")
  .replace("state.documentType === 'ara'", "(state.documentType as string) === 'ara'");

fs.writeFileSync(path.join(baseDir, 'steps/Step5_Witnesses.tsx'), `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { Witness } from '../../../types/feesAgentTypes';
import { createEmptyWitness } from '../../../utils/feesAgentUtils';
${fullIconsImport}

export const Step5_Witnesses: React.FC<DocumentWizardProps> = ({ state, setState }) => {
${step5WitnessesBody}
`);

const step6DatesBody = getLines(31591, 31837)
  .replace("['ara', 'fari', 'ihsa'", "['ara' as any, 'fari', 'ihsa'");

fs.writeFileSync(path.join(baseDir, 'steps/Step6_Dates.tsx'), `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import { useAuth } from '../../../contexts/AuthContext';
import {
  convertGregorianToHijri,
  convertGregorianDateToWords,
  convertHijriDateToWords,
  convertTimeToWords,
  getArabicWeekdayName,
  performValidationChecks
} from '../../../utils/feesAgentUtils';
import { generateDocumentDraft, generateRasmHtml } from '../../../templates/feesAgentTemplates';
${fullIconsImport}

export const Step6_Dates: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const { user } = useAuth();
  const currentNotary = user?.full_name || state.meta?.notaryPrimary || '';
  const secondaryNotaryName = state.meta?.notarySecondary || '';
${step6DatesBody}
`);

// ----------------------------------------------------------------------------
// 2. MARRIAGE
// ----------------------------------------------------------------------------
const marriageDetailsCode = getLines(11625, 12229);
const mixedMarriageSpecificsCode = getLines(4856, 5191);
const marriageContinuityCode = getLines(23531, 24349);

const marriageHeaderImports = `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step1_PartiesDefinition } from '../../steps/Step1_PartiesDefinition';
import { Step6_Dates } from '../../steps/Step6_Dates';
import { useAuth } from '../../../../contexts/AuthContext';
${fullTypesImport}
${fullUtilsImport}
${fullLocalesImport}
${fullIconsImport}
`;

const cleanMarriageDetails = marriageDetailsCode.replace(new RegExp('const\\s+Step2_MarriageDetails\\s*=\\s*\\(\\)\\s*=>\\s*\\{'), '');

const marriageDetailsWrapper = `
export const Step2_MarriageDetails: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const { user, notaryProfile } = useAuth();
  const notaryPrimaryCourt = formatCourtName(
    notaryProfile?.primary_court ||
    (notaryProfile?.court_type === 'first_instance' ? notaryProfile?.court_name : null) ||
    notaryProfile?.court_name ||
    notaryProfile?.appellate_court ||
    user?.court_name
  );
  const notaryAppellateCourt = formatCourtName(notaryProfile?.appellate_court);
${cleanMarriageDetails}
`;

fs.writeFileSync(path.join(baseDir, 'documents/marriage/MarriageWizard.tsx'), `${marriageHeaderImports}

${marriageDetailsWrapper}

export const MarriageWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_MarriageDetails state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
`);

fs.writeFileSync(path.join(baseDir, 'documents/marriage/MixedMarriageWizard.tsx'), `${marriageHeaderImports}

${makeStepComponent(mixedMarriageSpecificsCode, 'Step1_MixedMarriageSpecifics')}

${marriageDetailsWrapper}

export const MixedMarriageWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 0.5 && <Step1_MixedMarriageSpecifics state={state} setState={setState} />}
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_MarriageDetails state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
`);

fs.writeFileSync(path.join(baseDir, 'documents/marriage/MarriageContinuityWizard.tsx'), `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step1_PartiesDefinition } from '../../steps/Step1_PartiesDefinition';
import { Step4_Finance } from '../../steps/Step4_Finance';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import { Step6_Dates } from '../../steps/Step6_Dates';
${fullTypesImport}
${fullUtilsImport}
${fullLocalesImport}
${fullIconsImport}

${makeStepComponent(marriageContinuityCode, 'Step3_MarriageContinuityDeed')}

export const MarriageContinuityWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {(state.step === 2 || state.step === 3) && <Step3_MarriageContinuityDeed state={state} setState={setState} />}
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
`);

// ----------------------------------------------------------------------------
// 3. DIVORCE
// ----------------------------------------------------------------------------
fs.writeFileSync(path.join(baseDir, 'documents/divorce/DivorceWizard.tsx'), `import React from 'react';
import type { DocumentWizardProps } from '../../types';
import {
  Step1_Divorce_JudicialDetails,
  Step2_Divorce_Spouses,
  Step3_Divorce_MarriageDetails,
  Step4_Divorce_Summary
} from '../../../../modules/DivorceSteps';

export const DivorceWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_Divorce_JudicialDetails state={state} setState={setState} />}
      {state.step === 2 && <Step2_Divorce_Spouses state={state} setState={setState} />}
      {state.step === 3 && <Step3_Divorce_MarriageDetails state={state} setState={setState} />}
      {state.step === 4 && <Step4_Divorce_Summary state={state} setState={setState} />}
    </>
  );
};
`);

// ----------------------------------------------------------------------------
// 4. OTHER
// ----------------------------------------------------------------------------
const tawkil1Code = getLines(6797, 7194);
const tawkil2Code = getLines(7195, 7354)
  .replace("useState<'individual' | 'joint' | 'mixed'>(state.agencyMode || 'individual')", "useState<'individual' | 'joint' | 'mixed'>((state.agencyMode as any) || 'individual')");
const tawkil3Code = getLines(7355, 8016);

fs.writeFileSync(path.join(baseDir, 'documents/other/TawkilWizard.tsx'), `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step6_Dates } from '../../steps/Step6_Dates';
${fullTypesImport}
${fullUtilsImport}
${fullLocalesImport}
${fullIconsImport}

${makeStepComponent(tawkil1Code, 'Step1_Tawkil_Principals')}

${makeStepComponent(tawkil2Code, 'Step2_Tawkil_Agents')}

${makeStepComponent(tawkil3Code, 'Step3_Tawkil_Scope')}

export const TawkilWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_Tawkil_Principals state={state} setState={setState} />}
      {state.step === 2 && <Step2_Tawkil_Agents state={state} setState={setState} />}
      {state.step === 3 && <Step3_Tawkil_Scope state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
`);

const paternityCode = getLines(16889, 17276);
fs.writeFileSync(path.join(baseDir, 'documents/other/PaternityAcknowledgmentWizard.tsx'), 
  makeStandardWizard('PaternityAcknowledgmentWizard', paternityCode, 'Step3_PaternityAcknowledgment_Details', { isLineage: true })
);

const lineageCode = getLines(17277, 17744);
fs.writeFileSync(path.join(baseDir, 'documents/other/LineageProofWizard.tsx'), 
  makeStandardWizard('LineageProofWizard', lineageCode, 'Step3_LineageProofByHearsay_Details', { isLineage: true })
);

const maritalAssetsCode = getLines(17745, 18362);
fs.writeFileSync(path.join(baseDir, 'documents/other/MaritalAssetsAgreementWizard.tsx'), 
  makeStandardWizard('MaritalAssetsAgreementWizard', maritalAssetsCode, 'Step3_MaritalAssetsAgreement_Details', { isLineage: true })
);

const easementCode = getLines(20421, 21145);
fs.writeFileSync(path.join(baseDir, 'documents/other/EasementProofWizard.tsx'), 
  makeStandardWizard('EasementProofWizard', easementCode, 'Step3_EasementProof')
);

const officialMortgageCode = getLines(18363, 18926)
  .replace(/checked=\{mortgage\.(smart[A-Za-z]+)\s*\|\|\s*false\}/g, "checked={Boolean(mortgage.$1)}");
fs.writeFileSync(path.join(baseDir, 'documents/other/MortgageWizard.tsx'), 
  makeStandardWizard('MortgageWizard', officialMortgageCode, 'Step3_OfficialMortgage_Details')
);

const possessoryMortgageCode = getLines(18927, 19488);
fs.writeFileSync(path.join(baseDir, 'documents/other/PossessoryMortgageWizard.tsx'), 
  makeStandardWizard('PossessoryMortgageWizard', possessoryMortgageCode, 'Step3_PossessoryMortgage_Details')
);

const debtDischargeCode = getLines(23069, 23299);
fs.writeFileSync(path.join(baseDir, 'documents/other/DebtDischargeWizard.tsx'), 
  makeStandardWizard('DebtDischargeWizard', debtDischargeCode, 'Step3_DebtDischargeDeed')
);

const debtAckCode = getLines(23300, 23530);
fs.writeFileSync(path.join(baseDir, 'documents/other/DebtAcknowledgmentWizard.tsx'), 
  makeStandardWizard('DebtAcknowledgmentWizard', debtAckCode, 'Step3_DebtAcknowledgmentDeed')
);

fs.writeFileSync(path.join(baseDir, 'documents/other/OtherDocumentWizard.tsx'), 
  makeStandardWizard('OtherDocumentWizard')
);

// ----------------------------------------------------------------------------
// 5. PROPERTY
// ----------------------------------------------------------------------------
const malakiya1Code = getLines(5692, 6294);
const malakiya1_5Code = getLines(6295, 6796);
const possessionCode = getLines(21146, 22653)
  .replace("checked={poss.governingLaws?.[key as keyof typeof poss.governingLaws] || false}", "checked={Boolean(poss.governingLaws?.[key as keyof typeof poss.governingLaws])}");

const malakiya1_5Wrapped = `
export const Step1_5_Malakiya_OwnerStatus: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const [tempInheritanceDeeds, setTempInheritanceDeeds] = useState<InheritanceDeed[]>(
    state.inheritanceDeeds && state.inheritanceDeeds.length > 0 
      ? state.inheritanceDeeds 
      : [{ book: '', page: '', number: '', date: '', notary: '' }]
  );
  const addInheritanceDeed = () => {
    setTempInheritanceDeeds(prev => [...prev, { book: '', page: '', number: '', date: '', notary: '' }]);
  };
  const removeInheritanceDeed = (index: number) => {
    setTempInheritanceDeeds(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };
  const handleInheritanceDeedChange = (index: number, field: keyof InheritanceDeed, value: string) => {
    setTempInheritanceDeeds(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
` + malakiya1_5Code.replace(new RegExp('const\\s+Step1_5_Malakiya_OwnerStatus\\s*=\\s*\\(\\)\\s*=>\\s*\\{'), '');

fs.writeFileSync(path.join(baseDir, 'documents/property/MalakiyaWizard.tsx'), `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step2_PropertyDetails } from '../../steps/Step2_PropertyDetails';
import { Step3_AdministrativeCertificates } from '../../steps/Step3_AdministrativeCertificates';
import { Step4_Finance } from '../../steps/Step4_Finance';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import { Step6_Dates } from '../../steps/Step6_Dates';
import { ShareDistributionModal } from '../../modals';
${fullTypesImport}
${fullUtilsImport}
${fullLocalesImport}
${fullIconsImport}

${makeStepComponent(malakiya1Code, 'Step1_Malakiya_Applicant')}

${malakiya1_5Wrapped}

export const MalakiyaWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_Malakiya_Applicant state={state} setState={setState} />}
      {state.step === 1.5 && <Step1_5_Malakiya_OwnerStatus state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_AdministrativeCertificates state={state} setState={setState} />}
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
`);

fs.writeFileSync(path.join(baseDir, 'documents/property/PossessionWizard.tsx'), `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step2_PropertyDetails } from '../../steps/Step2_PropertyDetails';
import { Step4_Finance } from '../../steps/Step4_Finance';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import { Step6_Dates } from '../../steps/Step6_Dates';
import { ShareDistributionModal } from '../../modals';
${fullTypesImport}
${fullUtilsImport}
${fullLocalesImport}
${fullIconsImport}

${makeStepComponent(malakiya1Code, 'Step1_Malakiya_Applicant')}

${malakiya1_5Wrapped}

${makeStepComponent(possessionCode, 'Step3_PossessionProof')}

export const PossessionWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_Malakiya_Applicant state={state} setState={setState} />}
      {state.step === 1.5 && <Step1_5_Malakiya_OwnerStatus state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_PossessionProof state={state} setState={setState} />}
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
`);

const partitionCode = getLines(30406, 31006);
fs.writeFileSync(path.join(baseDir, 'documents/property/PartitionWizard.tsx'), 
  makeStandardWizard('PartitionWizard', null, null, { isPartition: true, partitionCode })
);

const airRightsCode = getLines(14773, 15515);
fs.writeFileSync(path.join(baseDir, 'documents/property/AirRightsSaleWizard.tsx'), 
  makeStandardWizard('AirRightsSaleWizard', airRightsCode, 'Step3_AirRights_Details')
);

const surfaceRightsCode = getLines(15516, 16217);
fs.writeFileSync(path.join(baseDir, 'documents/property/SurfaceRightsWizard.tsx'), 
  makeStandardWizard('SurfaceRightsWizard', surfaceRightsCode, 'Step3_SurfaceRights_Details')
);

const ornamentalCode = getLines(16218, 16539);
fs.writeFileSync(path.join(baseDir, 'documents/property/OrnamentalRightWizard.tsx'), 
  makeStandardWizard('OrnamentalRightWizard', ornamentalCode, 'Step3_OrnamentalRight_Details')
);

const omraCode = getLines(16540, 16888);
fs.writeFileSync(path.join(baseDir, 'documents/property/OmraWizard.tsx'), 
  makeStandardWizard('OmraWizard', omraCode, 'Step3_Omra_Details')
);

const buildingCode = getLines(19932, 20420)
  .replace("bp.evidenceSources?.includes(source)", "bp.evidenceSources?.includes(source as any)")
  .replace("toggleArrayValue('evidenceSources', source)", "toggleArrayValue('evidenceSources', source as any)");
fs.writeFileSync(path.join(baseDir, 'documents/property/BuildingProofWizard.tsx'), 
  makeStandardWizard('BuildingProofWizard', buildingCode, 'Step3_BuildingProof')
);

const longTermLeaseCode = getLines(19489, 19931);
fs.writeFileSync(path.join(baseDir, 'documents/property/LongTermLeaseWizard.tsx'), 
  makeStandardWizard('LongTermLeaseWizard', longTermLeaseCode, 'Step3_LongTermLease_Details')
);

const deliveryCode = getLines(22654, 22842);
fs.writeFileSync(path.join(baseDir, 'documents/property/DeliveryWithCompensationWizard.tsx'), 
  makeStandardWizard('DeliveryWithCompensationWizard', deliveryCode, 'Step3_DeliveryDeed')
);

const ackCode = getLines(22843, 23068);
fs.writeFileSync(path.join(baseDir, 'documents/property/AcknowledgmentWizard.tsx'), 
  makeStandardWizard('AcknowledgmentWizard', ackCode, 'Step3_AcknowledgmentDeed')
);

const munakalaCode = getLines(24350, 25279);
fs.writeFileSync(path.join(baseDir, 'documents/property/MunakalaWizard.tsx'), 
  makeStandardWizard('MunakalaWizard', munakalaCode, 'Step3_Munakala_Details')
);

const giftCode = getLines(25280, 25984);
fs.writeFileSync(path.join(baseDir, 'documents/property/GiftWizard.tsx'), 
  makeStandardWizard('GiftWizard', giftCode, 'Step3_GiftDeed_Details')
);

fs.writeFileSync(path.join(baseDir, 'documents/property/SadaqaWizard.tsx'), 
  makeStandardWizard('SadaqaWizard', giftCode, 'Step3_GiftDeed_Details')
);

const promiseToSellCode = getLines(25985, 26679);
fs.writeFileSync(path.join(baseDir, 'documents/property/PromiseToSellWizard.tsx'), 
  makeStandardWizard('PromiseToSellWizard', promiseToSellCode, 'Step3_PromiseToSell')
);

const waqfCode = getLines(29528, 30071);
fs.writeFileSync(path.join(baseDir, 'documents/property/WaqfWizard.tsx'), 
  makeStandardWizard('WaqfWizard', waqfCode, 'Step3_Waqf_Details')
);

fs.writeFileSync(path.join(baseDir, 'documents/property/SalePersonWizard.tsx'), makeStandardWizard('SalePersonWizard'));
fs.writeFileSync(path.join(baseDir, 'documents/property/SaleEntityWizard.tsx'), makeStandardWizard('SaleEntityWizard'));
fs.writeFileSync(path.join(baseDir, 'documents/property/SaleJointPropertyWizard.tsx'), makeStandardWizard('SaleJointPropertyWizard'));
fs.writeFileSync(path.join(baseDir, 'documents/property/RentToOwnWizard.tsx'), makeStandardWizard('RentToOwnWizard'));
fs.writeFileSync(path.join(baseDir, 'documents/property/OffPlanInitialSaleWizard.tsx'), makeStandardWizard('OffPlanInitialSaleWizard'));
fs.writeFileSync(path.join(baseDir, 'documents/property/OffPlanFinalSaleWizard.tsx'), makeStandardWizard('OffPlanFinalSaleWizard'));

// ----------------------------------------------------------------------------
// 6. INHERITANCE
// ----------------------------------------------------------------------------
fs.writeFileSync(path.join(baseDir, 'documents/inheritance/InheritanceWizard.tsx'), makeStandardWizard('InheritanceWizard'));
fs.writeFileSync(path.join(baseDir, 'documents/inheritance/FaridahStatementWizard.tsx'), makeStandardWizard('FaridahStatementWizard'));

const proofOfEstateCode = getLines(26680, 27644);
fs.writeFileSync(path.join(baseDir, 'documents/inheritance/ProofOfEstateWizard.tsx'), 
  makeStandardWizard('ProofOfEstateWizard', proofOfEstateCode, 'Step3_ProofOfEstate')
);

const estateInventoryCode = getLines(27645, 28610);
fs.writeFileSync(path.join(baseDir, 'documents/inheritance/EstateInventoryWizard.tsx'), 
  makeStandardWizard('EstateInventoryWizard', estateInventoryCode, 'Step3_EstateInventory')
);

const willCode = getLines(28611, 29527);
fs.writeFileSync(path.join(baseDir, 'documents/inheritance/WillWizard.tsx'), 
  makeStandardWizard('WillWizard', willCode, 'Step3_Will_Details')
);

console.log('Finished updating steps and wizards.');
