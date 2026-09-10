#!/usr/bin/env node

/**
 * Test Suite: Automated PII & Secrets Redaction in Logs
 */

const assert = require('assert');
const pino = require('pino');

console.log('\n🛡️  Starting Test Suite: Automated PII & Secrets Redaction...\n');

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

// Set up in-memory destination stream to inspect logged serialized output
let logs = [];
const memoryDestination = {
  write(chunk) {
    logs.push(JSON.parse(chunk));
  },
};

const logger = pino(
  {
    level: 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        '*.password',
        'token',
        '*.token',
        'secret',
        '*.secret',
        'cin',
        '*.cin',
        'husband_cin',
        '*.husband_cin',
        'wife_cin',
        '*.wife_cin',
        'idNumber',
        '*.idNumber',
        'phone',
        '*.phone',
        'body.password',
        'body.token',
      ],
      censor: '[REDACTED]',
    },
  },
  memoryDestination
);

// 1. Password Redaction
it('should redact sensitive user passwords from log entries', () => {
  logs = [];
  logger.info({ user: 'ahmed', password: 'SecretPassword123!' }, 'User login attempted');
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].password, '[REDACTED]');
  assert.strictEqual(JSON.stringify(logs[0]).includes('SecretPassword123!'), false);
});

// 2. Moroccan Citizen CIN Redaction
it('should redact Moroccan National ID (CIN) numbers from deed logs', () => {
  logs = [];
  logger.info(
    {
      deed: 'RASM_442',
      husband_cin: 'AB123456',
      wife_cin: 'CD789012',
    },
    'Deed processed'
  );
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].husband_cin, '[REDACTED]');
  assert.strictEqual(logs[0].wife_cin, '[REDACTED]');
  assert.strictEqual(JSON.stringify(logs[0]).includes('AB123456'), false);
});

// 3. Authorization Header & Session Token Redaction
it('should redact Authorization tokens and HTTP session cookies', () => {
  logs = [];
  logger.info(
    {
      req: {
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          cookie: 'auth_session_token=s%3Asecret.session',
        },
      },
    },
    'Incoming request'
  );
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].req.headers.authorization, '[REDACTED]');
  assert.strictEqual(logs[0].req.headers.cookie, '[REDACTED]');
  assert.strictEqual(JSON.stringify(logs[0]).includes('eyJhbGciOi'), false);
});

// 4. Phone Number Redaction
it('should redact personal phone numbers from notification logs', () => {
  logs = [];
  logger.info({ notary: 'Saeed', phone: '+212600112233' }, 'SMS dispatch requested');
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].phone, '[REDACTED]');
  assert.strictEqual(JSON.stringify(logs[0]).includes('+212600112233'), false);
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
