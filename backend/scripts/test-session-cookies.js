#!/usr/bin/env node

/**
 * Enterprise Session & Cookie Management Automated Test Suite
 * Run with: node scripts/test-session-cookies.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CacheService } = require('../dist/backend/src/services/cacheService');
const { createContext } = require('../dist/backend/src/server');

async function runSessionCookieTests() {
  console.log('\n======================================================');
  console.log('🍪 VERIFICATION: SESSION COOKIES & EXTENDED SLIDING TTL');
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

  // ----------------------------------------------------
  // TEST 1: createContext Token Extraction Precedence
  // ----------------------------------------------------
  console.log('📋 TEST 1: Context Token Resolution Priority');

  // Case 1a: Authorization Bearer header
  const reqBearer = {
    headers: { authorization: 'Bearer test-bearer-token-12345' },
    cookies: {},
    query: {},
  };
  const ctxBearer = await createContext({ req: reqBearer, res: {} });
  assert(ctxBearer.sessionToken === 'test-bearer-token-12345', 'Extracts token from Authorization: Bearer header');

  // Case 1b: httpOnly cookie
  const reqCookie = {
    headers: {},
    cookies: { session_token: 'test-cookie-token-67890' },
    query: {},
  };
  const ctxCookie = await createContext({ req: reqCookie, res: {} });
  assert(ctxCookie.sessionToken === 'test-cookie-token-67890', 'Extracts token from session_token cookie');

  // Case 1c: x-session-token header
  const reqHeader = {
    headers: { 'x-session-token': 'test-x-header-token' },
    cookies: {},
    query: {},
  };
  const ctxHeader = await createContext({ req: reqHeader, res: {} });
  assert(ctxHeader.sessionToken === 'test-x-header-token', 'Extracts token from x-session-token header');

  // Case 1d: Authorization header takes precedence over cookie
  const reqBoth = {
    headers: { authorization: 'Bearer priority-bearer' },
    cookies: { session_token: 'secondary-cookie' },
    query: {},
  };
  const ctxBoth = await createContext({ req: reqBoth, res: {} });
  assert(ctxBoth.sessionToken === 'priority-bearer', 'Bearer header takes precedence over cookie if both exist');

  // ----------------------------------------------------
  // TEST 2: Sliding Window Expiration Extension
  // ----------------------------------------------------
  console.log('\n📋 TEST 2: Sliding Window Session TTL Extension');

  const testToken = 'sliding-test-' + Date.now();
  // Set expiration to 24 hours from now (within the 48h sliding threshold)
  const expiringSoon = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  await CacheService.cacheSession(testToken, {
    user: { id: 'usr-slide-1', full_name: 'سعيد التوثيقي', role: 'notary' },
    notaryProfile: { id: 'notary-slide-1' },
    expires_at: expiringSoon,
  }, 3600);

  // Verification helper triggers sliding extension
  const verified = await CacheService.verifySessionWithCache(testToken);
  assert(verified !== null && verified.user.id === 'usr-slide-1', 'Session verified successfully from cache');

  // Allow asynchronous extension to complete
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Check cached token expires_at was extended past 6 days
  const updatedCache = await CacheService.getCachedSession(testToken);
  assert(updatedCache !== null, 'Updated session remains in cache');
  const updatedExpiry = new Date(updatedCache.expires_at).getTime();
  const minExpected = Date.now() + 6 * 86400 * 1000;
  assert(updatedExpiry > minExpected, `Expiry was bumped by ~7 days (new expiry: ${updatedCache.expires_at})`);

  // Clean up test token
  await CacheService.invalidateSession(testToken);
  const invalidated = await CacheService.getCachedSession(testToken);
  assert(invalidated === null, 'Session invalidated and evicted from cache cleanly');

  // ----------------------------------------------------
  // TEST 3: Rate Limiting 429 with CORS Headers & tRPC Batch Format
  // ----------------------------------------------------
  console.log('\n📋 TEST 3: Rate Limiting 429 CORS & Batch Response Shape');
  const { fastify } = require('../dist/backend/src/server');

  // Simulate reaching the auth rate limit
  const rlKey = 'rl:auth:127.0.0.1';
  // Directly set counter in CacheService above limit
  await CacheService.set(rlKey, 99, 60);

  const res429 = await fastify.inject({
    method: 'POST',
    url: '/trpc/auth.login?batch=1',
    headers: {
      origin: 'http://localhost:5173',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ 0: { email: 'test@example.com', password: 'wrong' } }),
  });

  assert(res429.statusCode === 429, `Server responded with HTTP 429 Too Many Requests`);
  assert(
    res429.headers['access-control-allow-origin'] === 'http://localhost:5173',
    `Access-Control-Allow-Origin is set to 'http://localhost:5173' on 429 (got: ${res429.headers['access-control-allow-origin']})`
  );
  assert(
    res429.headers['access-control-allow-credentials'] === 'true',
    `Access-Control-Allow-Credentials is true on 429`
  );

  const batchPayload = JSON.parse(res429.body);
  assert(Array.isArray(batchPayload), `Batch endpoint returns array format on 429`);
  assert(
    batchPayload[0]?.error?.message && batchPayload[0]?.error?.data?.code === 'TOO_MANY_REQUESTS',
    `Error payload has tRPC error format with Arabic message: "${batchPayload[0]?.error?.message}"`
  );

  // Clean up rate limit key
  await CacheService.del(rlKey);
  await fastify.close();

  // ----------------------------------------------------
  // TEST SUMMARY
  // ----------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  await CacheService.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runSessionCookieTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

