import crypto from 'crypto';
import { env } from '../env';

export interface DeedSealPayload {
  fileNumber: string;
  documentType: string;
  parties: Array<{ name: string; cin?: string; role?: string }>;
  inclusionDate?: string;
  metadata?: Record<string, unknown>;
  contentHash?: string;
}

export interface DeedDigitalSeal {
  version: '1.0';
  algorithm: 'HMAC-SHA256';
  fileNumber: string;
  sealHash: string;
  sealedAt: string;
  notaryLedgerDigest: string;
}

/**
 * Deterministically sorts object keys for canonical cryptographic hashing.
 */
function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalStringify(item)).join(',')}]`;
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys.map((key) => {
    const value = (obj as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${canonicalStringify(value)}`;
  });

  return `{${pairs.join(',')}}`;
}

export class DeedSealingService {
  private static pepper = env.DEED_SEAL_PEPPER || 'sovereign-moroccan-notary-seal-pepper-2026';

  /**
   * Generates a tamper-evident digital seal for a finalized notarial deed.
   */
  public static sealDeed(payload: DeedSealPayload): DeedDigitalSeal {
    const canonicalData = canonicalStringify({
      fileNumber: payload.fileNumber,
      documentType: payload.documentType,
      parties: payload.parties,
      inclusionDate: payload.inclusionDate || '',
      contentHash: payload.contentHash || '',
      metadata: payload.metadata || {},
    });

    const hmac = crypto.createHmac('sha256', this.pepper);
    hmac.update(canonicalData);
    const sealHash = hmac.digest('hex');

    const sealedAt = new Date().toISOString();

    // Secondary ledger digest for double-entry notarization validation
    const ledgerDigest = crypto
      .createHash('sha256')
      .update(`${payload.fileNumber}:${sealHash}:${sealedAt}`)
      .digest('hex');

    return {
      version: '1.0',
      algorithm: 'HMAC-SHA256',
      fileNumber: payload.fileNumber,
      sealHash,
      sealedAt,
      notaryLedgerDigest: ledgerDigest,
    };
  }

  /**
   * Validates whether a given deed payload strictly matches its claimed digital seal.
   */
  public static verifySeal(
    payload: DeedSealPayload,
    seal: DeedDigitalSeal,
  ): { isValid: boolean; error?: string } {
    if (seal.version !== '1.0') {
      return { isValid: false, error: `Unsupported seal version: ${seal.version}` };
    }

    if (seal.fileNumber !== payload.fileNumber) {
      return { isValid: false, error: 'File number mismatch between deed and seal' };
    }

    const canonicalData = canonicalStringify({
      fileNumber: payload.fileNumber,
      documentType: payload.documentType,
      parties: payload.parties,
      inclusionDate: payload.inclusionDate || '',
      contentHash: payload.contentHash || '',
      metadata: payload.metadata || {},
    });

    const hmac = crypto.createHmac('sha256', this.pepper);
    hmac.update(canonicalData);
    const expectedSealHash = hmac.digest('hex');

    if (expectedSealHash !== seal.sealHash) {
      return { isValid: false, error: 'Cryptographic hash mismatch. Deed data has been altered.' };
    }

    const expectedLedgerDigest = crypto
      .createHash('sha256')
      .update(`${seal.fileNumber}:${seal.sealHash}:${seal.sealedAt}`)
      .digest('hex');

    if (expectedLedgerDigest !== seal.notaryLedgerDigest) {
      return { isValid: false, error: 'Ledger digest mismatch. Digital seal envelope is corrupt.' };
    }

    return { isValid: true };
  }
}

