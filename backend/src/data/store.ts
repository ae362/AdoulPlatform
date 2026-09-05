import {
  CopyRequest,
  Contract,
  ContractTemplate,
  DivorceRecord,
  InheritanceFee,
  MarriageRecord,
  Notary,
  OtherDocumentFee,
  PropertyFee,
  RegistrationStamp,
} from '../../../shared/schemas';
import { randomUUID } from 'crypto';

interface DbShape {
  notaries: Notary[];
  marriageRecords: MarriageRecord[];
  divorceRecords: DivorceRecord[];
  propertyFees: PropertyFee[];
  inheritanceFees: InheritanceFee[];
  otherDocumentFees: OtherDocumentFee[];
  copyRequests: CopyRequest[];
  contracts: Contract[];
  contractTemplates: ContractTemplate[];
  registrationStamps: RegistrationStamp[];
}

export const db: DbShape = {
  notaries: [],
  marriageRecords: [],
  divorceRecords: [],
  propertyFees: [],
  inheritanceFees: [],
  otherDocumentFees: [],
  copyRequests: [],
  contracts: [],
  contractTemplates: [],
  registrationStamps: [],
};

export function ensureId<T extends { id?: string }>(payload: T): T & { id: string } {
  return { ...payload, id: payload.id || randomUUID() };
}
