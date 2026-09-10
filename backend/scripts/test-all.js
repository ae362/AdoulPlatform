#!/usr/bin/env node

/**
 * Master Enterprise Test Runner
 * Executes all enterprise test suites and asserts 100% pass rate.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const suites = [
  { name: 'Environment Validation & Boot Resilience', script: 'test-env-validation.js' },
  { name: 'Cryptographic Deed Sealing & Ledger Integrity', script: 'test-deed-sealing.js' },
  { name: 'Automated PII & Secrets Redaction', script: 'test-pii-redaction.js' },
  { name: 'Server Lifecycle & Deep Health Probes', script: 'test-lifecycle-health.js' },
];

console.log('===============================================================');
console.log('🏛️  SOVEREIGN MOROCCAN NOTARY PLATFORM - ENTERPRISE TEST SUITE');
console.log('===============================================================');

let passedSuites = 0;

for (const suite of suites) {
  const scriptPath = path.join(__dirname, suite.script);
  console.log(`\n▶ Running Suite: ${suite.name}`);
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  });

  if (result.status === 0) {
    passedSuites++;
  } else {
    console.error(`\n❌ Suite failed with exit code ${result.status}: ${suite.name}`);
    process.exit(result.status || 1);
  }
}

console.log('===============================================================');
console.log(`🎉 ALL ${passedSuites}/${suites.length} ENTERPRISE TEST SUITES PASSED CLEANLY!`);
console.log('===============================================================');
process.exit(0);

