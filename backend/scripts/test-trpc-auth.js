#!/usr/bin/env node

/**
 * Diagnostic & Automated Test for Enterprise tRPC Middleware & protectedProcedure
 * Run with: node scripts/test-trpc-auth.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CacheService } = require('../dist/backend/src/services/cacheService');
const { router, publicProcedure, protectedProcedure, notaryProcedure, judgeProcedure } = require('../dist/backend/src/routers/trpc');
const { z } = require('zod');

async function testTrpcAuthMiddleware() {
  console.log('\n======================================================');
  console.log('🛡️  VERIFICATION: ENTERPRISE tRPC AUTH & ROLE MIDDLEWARE');
  console.log('======================================================\n');

  // Build a test router using our middleware
  const testRouter = router({
    publicHello: publicProcedure.query(() => ({ message: 'مرحباً بالجميع' })),
    secretProfile: protectedProcedure
      .input(z.object({ sessionToken: z.string().optional() }).optional())
      .query(({ ctx }) => {
        return {
          authenticated: true,
          userId: ctx.user.id,
          fullName: ctx.user.full_name,
          role: ctx.user.role,
        };
      }),
    notaryOnlyAction: notaryProcedure
      .input(z.object({ sessionToken: z.string().optional() }).optional())
      .mutation(({ ctx }) => {
        return { success: true, authorizedNotary: ctx.user.full_name };
      }),
    judgeOnlyAction: judgeProcedure
      .input(z.object({ sessionToken: z.string().optional() }).optional())
      .mutation(({ ctx }) => {
        return { success: true, authorizedJudge: ctx.user.full_name };
      }),
  });

  const callerFactory = testRouter.createCaller;

  // Test 1: Public endpoint allows access without token
  console.log('📋 STEP 1: Public Procedure Access');
  const publicCaller = callerFactory({ sessionToken: null, user: null });
  const pubRes = await publicCaller.publicHello();
  console.log('   ✅ Public procedure responded:', JSON.stringify(pubRes));

  // Test 2: Protected procedure rejects unauthenticated caller
  console.log('\n📋 STEP 2: Protected Procedure Rejection (No Session)');
  let rejected = false;
  try {
    const unauthCaller = callerFactory({ sessionToken: null, user: null });
    await unauthCaller.secretProfile();
  } catch (err) {
    if (err.code === 'UNAUTHORIZED') {
      rejected = true;
      console.log('   ✅ Correctly rejected unauthenticated call with TRPCError UNAUTHORIZED:', err.message);
    } else {
      throw err;
    }
  }
  if (!rejected) throw new Error('❌ Test 2 Failed: Protected procedure did not reject unauthenticated call');

  // Test 3: Protected procedure accepts valid cached token from input payload
  console.log('\n📋 STEP 3: Protected Procedure Cache-Fast Resolution');
  const mockToken = 'mock_jwt_' + Math.random().toString(36).substring(2);
  const mockNotary = {
    user: {
      id: 'usr_notary_42',
      email: 'notary42@justice.gov.ma',
      role: 'notary',
      full_name: 'الأستاذ عبد الكريم التوثيقي',
      is_active: true,
    },
    notaryProfile: { appointment_decree_number: '5566/2025' },
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  };

  // Prime cache
  await CacheService.cacheSession(mockToken, mockNotary, 900);

  const startCaller = process.hrtime.bigint();
  const authCaller = callerFactory({ sessionToken: null, user: null });
  const profileRes = await authCaller.secretProfile({ sessionToken: mockToken });
  const endCaller = process.hrtime.bigint();
  const callerTimeMs = Number(endCaller - startCaller) / 1_000_000;

  if (!profileRes.authenticated || profileRes.userId !== 'usr_notary_42') {
    throw new Error('❌ Test 3 Failed: User was not resolved correctly through middleware');
  }
  console.log(`   ✅ Resolved authenticated user in: ${callerTimeMs.toFixed(3)} ms`);
  console.log(`   ✅ User authenticated: ${profileRes.fullName} (Role: ${profileRes.role})`);

  // Test 4: Role-based procedure: notaryProcedure allows notary
  console.log('\n📋 STEP 4: Role Enforcement (Notary Allowed)');
  const notaryRes = await authCaller.notaryOnlyAction({ sessionToken: mockToken });
  console.log('   ✅ Notary procedure executed successfully:', JSON.stringify(notaryRes));

  // Test 5: Role-based procedure: judgeProcedure rejects notary with FORBIDDEN
  console.log('\n📋 STEP 5: Role Enforcement (Notary Rejected on Judge Procedure)');
  let forbidden = false;
  try {
    await authCaller.judgeOnlyAction({ sessionToken: mockToken });
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      forbidden = true;
      console.log('   ✅ Correctly blocked notary from judge procedure with TRPCError FORBIDDEN:', err.message);
    } else {
      throw err;
    }
  }
  if (!forbidden) throw new Error('❌ Test 5 Failed: Judge procedure did not reject notary');

  // Clean up mock token
  await CacheService.invalidateSession(mockToken);

  console.log('\n======================================================');
  console.log('🎉 ALL tRPC AUTH & ROLE MIDDLEWARE TESTS PASSED!');
  console.log('   Enterprise SaaS security & caching architecture is fully verified.');
  console.log('======================================================\n');
  process.exit(0);
}

testTrpcAuthMiddleware().catch((err) => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
