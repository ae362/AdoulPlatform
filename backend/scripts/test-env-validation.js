#!/usr/bin/env node

/**
 * Test Suite: Strict Zod Environment Validation
 */

const assert = require('assert');
const { validateEnv, envSchema } = require('../dist/backend/src/env');

console.log('\n⚙️  Starting Test Suite: Zod Environment Validation & Boot Resilience...\n');

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

// 1. Dev default fallback test
it('should fallback to safe development defaults when empty object is passed', () => {
  const result = validateEnv({});
  assert.strictEqual(result.NODE_ENV, 'development');
  assert.strictEqual(result.PORT, 4000);
  assert.strictEqual(result.HOST, '0.0.0.0');
  assert.ok(result.COOKIE_SECRET.length >= 16);
  assert.ok(result.JWT_SECRET.length >= 16);
  assert.ok(result.DEED_SEAL_PEPPER.length >= 16);
});

// 2. Custom PORT coercion test
it('should safely coerce string numbers into integer ports', () => {
  const result = validateEnv({ PORT: '5050' });
  assert.strictEqual(result.PORT, 5050);
});

// 3. Invalid port rejection test
it('should reject non-numeric or negative ports', () => {
  const parsed = envSchema.safeParse({ PORT: -100 });
  assert.strictEqual(parsed.success, false);
});

// 4. Secret length boundary test
it('should reject short cookie or JWT secrets under 16 characters in schema', () => {
  const shortSecret = envSchema.safeParse({ COOKIE_SECRET: 'short' });
  assert.strictEqual(shortSecret.success, false);
});

// 5. Valid full configuration test
it('should parse valid production-ready configuration cleanly', () => {
  const fullConfig = {
    NODE_ENV: 'development',
    PORT: '8080',
    HOST: '127.0.0.1',
    LOG_LEVEL: 'warn',
    COOKIE_SECRET: 'super-secure-production-cookie-secret-2026',
    JWT_SECRET: 'super-secure-production-jwt-secret-2026',
    SUPABASE_URL: 'https://xyzcompany.supabase.co',
    SUPABASE_SERVICE_KEY: 'service-role-key-secret',
    DEED_SEAL_PEPPER: 'sovereign-moroccan-notary-seal-pepper-2026',
  };
  const parsed = validateEnv(fullConfig);
  assert.strictEqual(parsed.PORT, 8080);
  assert.strictEqual(parsed.LOG_LEVEL, 'warn');
  assert.strictEqual(parsed.SUPABASE_URL, 'https://xyzcompany.supabase.co');
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
