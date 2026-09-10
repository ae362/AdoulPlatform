#!/usr/bin/env node

/**
 * Test Suite: Cryptographic Deed Sealing & Tamper Detection
 */

const assert = require('assert');
const path = require('path');

// Load built DeedSealingService
const { DeedSealingService } = require('../dist/backend/src/services/deedSealing');

console.log('\n🔒 Starting Test Suite: Cryptographic Deed Sealing (HMAC-SHA256 WORM)...\n');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

const sampleDeed = {
  fileNumber: 'RASM_2026_8892',
  documentType: 'بيع_وشراء',
  parties: [
    { name: 'محمد الفاسي', cin: 'A123456', role: 'seller' },
    { name: 'فاطمة الزهراء العلوي', cin: 'B654321', role: 'buyer' },
  ],
  inclusionDate: '2026-09-10',
  metadata: {
    propertyId: 'T-98124/04',
    totalPrice: 1200000,
    currency: 'MAD',
  },
  contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
};

// 1. Generation Test
let seal;
it('should generate a valid DeedDigitalSeal with version 1.0 and HMAC-SHA256', () => {
  seal = DeedSealingService.sealDeed(sampleDeed);
  assert.strictEqual(seal.version, '1.0');
  assert.strictEqual(seal.algorithm, 'HMAC-SHA256');
  assert.strictEqual(seal.fileNumber, sampleDeed.fileNumber);
  assert.strictEqual(typeof seal.sealHash, 'string');
  assert.strictEqual(seal.sealHash.length, 64); // SHA-256 hex string
  assert.strictEqual(typeof seal.notaryLedgerDigest, 'string');
  assert.strictEqual(seal.notaryLedgerDigest.length, 64);
  assert.ok(seal.sealedAt);
});

// 2. Verification Test (Genuine)
it('should verify an unaltered deed as valid', () => {
  const result = DeedSealingService.verifySeal(sampleDeed, seal);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.error, undefined);
});

// 3. Tamper Detection: Modified Parties
it('should immediately detect tampering when a party name or CIN is altered', () => {
  const tamperedDeed = {
    ...sampleDeed,
    parties: [
      { name: 'محمد الفاسي المزور', cin: 'A123456', role: 'seller' }, // Name altered!
      { name: 'فاطمة الزهراء العلوي', cin: 'B654321', role: 'buyer' },
    ],
  };
  const result = DeedSealingService.verifySeal(tamperedDeed, seal);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes('Cryptographic hash mismatch'));
});

// 4. Tamper Detection: Modified Financial Price in Metadata
it('should immediately detect tampering when metadata / transaction price is altered', () => {
  const tamperedDeed = {
    ...sampleDeed,
    metadata: {
      ...sampleDeed.metadata,
      totalPrice: 2200000, // Altered from 1200000!
    },
  };
  const result = DeedSealingService.verifySeal(tamperedDeed, seal);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes('Cryptographic hash mismatch'));
});

// 5. Tamper Detection: Modified File Number
it('should detect file number mismatch', () => {
  const tamperedDeed = {
    ...sampleDeed,
    fileNumber: 'RASM_2026_9999',
  };
  const result = DeedSealingService.verifySeal(tamperedDeed, seal);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes('File number mismatch'));
});

// 6. Tamper Detection: Altered Seal Hash
it('should reject when digital seal hash itself has been modified', () => {
  const forgedSeal = {
    ...seal,
    sealHash: seal.sealHash.replace(/[a-f0-9]/, '0'),
  };
  const result = DeedSealingService.verifySeal(sampleDeed, forgedSeal);
  assert.strictEqual(result.isValid, false);
});

// 7. Canonical Order Invariance: Key reordering must not alter the resulting hash
it('should produce identical deterministic hash regardless of JSON key ordering', () => {
  const deedKeyOrderA = {
    fileNumber: 'RASM_2026_1',
    documentType: 'وكالة',
    parties: [{ name: 'أحمد' }],
    metadata: { a: 1, b: 2 },
  };
  const deedKeyOrderB = {
    metadata: { b: 2, a: 1 },
    parties: [{ name: 'أحمد' }],
    documentType: 'وكالة',
    fileNumber: 'RASM_2026_1',
  };

  const sealA = DeedSealingService.sealDeed(deedKeyOrderA);
  const sealB = DeedSealingService.sealDeed(deedKeyOrderB);
  assert.strictEqual(sealA.sealHash, sealB.sealHash);
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
