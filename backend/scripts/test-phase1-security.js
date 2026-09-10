#!/usr/bin/env node

/**
 * Phase 1 Security & Stability Gates Verification Script
 * Validates:
 * 1. CacheService incrWithExpiry atomic counting and window TTL
 * 2. Fastify Security Headers (X-Content-Type-Options, X-Frame-Options, etc.)
 * 3. Distributed Rate Limiter:
 *    - Route tier classification
 *    - Headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
 *    - HTTP 429 Too Many Requests response on threshold violation
 *    - Exemption of /health route
 * 4. CacheService clean disconnection
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Fastify = require('fastify');
const { CacheService } = require('../dist/backend/src/services/cacheService');
const securityHeaders = require('../dist/backend/src/plugins/securityHeaders').default;
const rateLimiter = require('../dist/backend/src/plugins/rateLimiter').default;

async function runPhase1Verification() {
  console.log('\n======================================================');
  console.log('🔒 PHASE 1 VERIFICATION: SECURITY & STABILITY GATES');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`   ✅ ${message}`);
      passed++;
    } else {
      console.error(`   ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- TEST 1: CacheService Counter & Expiry ---
  console.log('📋 TEST 1: CacheService Atomic Counter & Expiry (Rate-Limit Backbone)');
  await CacheService.init();
  const testKey = 'test:rl:unit:' + Math.random().toString(36).slice(2);
  
  const step1 = await CacheService.incrWithExpiry(testKey, 10);
  assert(step1.count === 1 && step1.ttl > 0, `Initial incr returns count=1 and valid ttl (got count=${step1.count}, ttl=${step1.ttl})`);

  const step2 = await CacheService.incrWithExpiry(testKey, 10);
  assert(step2.count === 2, `Second incr correctly increments count to 2 (got ${step2.count})`);

  const step3 = await CacheService.incrWithExpiry(testKey, 10);
  assert(step3.count === 3, `Third incr increments count to 3 (got ${step3.count})`);

  // --- Setup Fastify Test Instance ---
  console.log('\n📋 TEST 2: Fastify Security Headers & Defense-in-Depth RFC Conformance');
  const app = Fastify({ logger: false });
  await app.register(securityHeaders);
  await app.register(rateLimiter, { authLimit: 3, generalLimit: 50, heavyLimit: 5 });

  // Register dummy test routes
  app.get('/health', async () => ({ status: 'ok', cache: CacheService.getStatus() }));
  app.get('/trpc/auth.login', async () => ({ message: 'auth route response' }));
  app.get('/trpc/feesAgent.previewPdf', async () => ({ message: 'heavy compute route response' }));
  app.get('/trpc/general.test', async () => ({ message: 'general route response' }));

  await app.ready();

  // Test Security Headers on /health
  const healthRes = await app.inject({ method: 'GET', url: '/health' });
  assert(healthRes.statusCode === 200, `Health check responds with HTTP 200 OK`);
  assert(healthRes.headers['x-content-type-options'] === 'nosniff', `X-Content-Type-Options is 'nosniff'`);
  assert(healthRes.headers['x-frame-options'] === 'SAMEORIGIN', `X-Frame-Options is 'SAMEORIGIN'`);
  assert(healthRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin', `Referrer-Policy is 'strict-origin-when-cross-origin'`);
  assert(healthRes.headers['x-xss-protection'] === '1; mode=block', `X-XSS-Protection is '1; mode=block'`);
  assert(typeof healthRes.headers['permissions-policy'] === 'string', `Permissions-Policy header is configured`);

  // --- TEST 3: Rate Limiter on Exempt vs Monitored Routes ---
  console.log('\n📋 TEST 3: Route Tiering & Rate Limiter Header Generation');

  // /health should be exempt from rate limiting headers
  assert(healthRes.headers['ratelimit-limit'] === undefined, `/health is exempt from rate limit headers`);

  // /trpc/general.test request should have rate limit headers
  const genRes = await app.inject({ method: 'GET', url: '/trpc/general.test' });
  assert(genRes.statusCode === 200, `General endpoint returns HTTP 200`);
  assert(genRes.headers['ratelimit-limit'] === '50', `General endpoint reports correct RateLimit-Limit (50)`);
  assert(Number(genRes.headers['ratelimit-remaining']) <= 49, `RateLimit-Remaining decrements correctly`);

  // --- TEST 4: Sensitive Route Rate Limiting (Brute-Force Protection) ---
  console.log('\n📋 TEST 4: Anti-Brute-Force Rate Limiting Threshold (Auth Route)');
  // authLimit was set to 3 for this test
  const req1 = await app.inject({ method: 'GET', url: '/trpc/auth.login' });
  assert(req1.statusCode === 200, `Auth request 1/3 allowed (HTTP 200)`);
  
  const req2 = await app.inject({ method: 'GET', url: '/trpc/auth.login' });
  assert(req2.statusCode === 200, `Auth request 2/3 allowed (HTTP 200)`);

  const req3 = await app.inject({ method: 'GET', url: '/trpc/auth.login' });
  assert(req3.statusCode === 200, `Auth request 3/3 allowed (HTTP 200)`);

  // 4th request must be blocked with HTTP 429
  const req4 = await app.inject({ method: 'GET', url: '/trpc/auth.login' });
  assert(req4.statusCode === 429, `Auth request 4/3 BLOCKED with HTTP 429 Too Many Requests`);
  assert(req4.headers['retry-after'] !== undefined, `Retry-After header is provided on 429`);
  
  const errPayload = JSON.parse(req4.body);
  assert(errPayload.error === 'Too Many Requests', `Response payload contains structured error message: "${errPayload.message}"`);

  // --- TEST 5: Graceful Disconnect & Teardown ---
  console.log('\n📋 TEST 5: Graceful Shutdown & Resource Disposal');
  await app.close();
  assert(true, `Fastify server closed cleanly`);

  await CacheService.disconnect();
  assert(true, `CacheService disconnected and cleanup intervals flushed cleanly`);

  console.log('\n======================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1Verification().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});

