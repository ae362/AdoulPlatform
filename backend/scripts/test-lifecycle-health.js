#!/usr/bin/env node

/**
 * Test Suite: Server Lifecycle & Deep Health Probes
 */

const assert = require('assert');
const { fastify } = require('../dist/backend/src/server');

console.log('\n🩺 Starting Test Suite: Server Lifecycle & Deep Health Probes...\n');

let passedTests = 0;
let totalTests = 0;

async function it(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function run() {
  await it('should return HTTP 200 on /health check with deep diagnostics', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);

    assert.strictEqual(body.status, 'ok');
    assert.ok(body.timestamp);
    assert.ok(typeof body.uptime === 'number');
    assert.ok(body.cache);
    assert.ok(body.memory);
    assert.ok(body.memory.rssMb >= 0);
    assert.ok(body.memory.heapUsedMb >= 0);
    assert.ok(body.memory.heapTotalMb >= 0);
  });

  await it('should correctly include security headers on all responses', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    // Content-Type should be JSON
    assert.ok(response.headers['content-type'].includes('application/json'));
    // Security headers (HSTS / X-Content-Type-Options)
    assert.strictEqual(response.headers['x-content-type-options'], 'nosniff');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
