import { CacheService } from '../src/services/cacheService';

async function runCacheTests() {
  console.log('--- Starting P1 Cache & Session Store Automated Test ---');

  // 1. Check status
  const initialStatus = CacheService.getStatus();
  console.log('Initial Status:', initialStatus);

  // 2. Test standard set and get
  await CacheService.set('test:key1', { name: 'AdoulPlatform', role: 'notary' }, 60);
  const val1 = await CacheService.get<{ name: string; role: string }>('test:key1');
  if (!val1 || val1.name !== 'AdoulPlatform') {
    throw new Error('Test 2 Failed: value mismatch on set/get');
  }
  console.log('Test 2 Passed: set and get working cleanly.');

  // 3. Test session caching
  const mockToken = 'mock_token_' + Date.now();
  const mockSession = {
    user: { id: 'usr_123', email: 'notary@test.ma', role: 'notary', full_name: 'عدل تجريبي', is_active: true },
    notaryProfile: { appointment_decree_number: '12345/2026', court_name: 'محكمة الاستئناف بفاس' },
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  };

  await CacheService.cacheSession(mockToken, mockSession, 300);
  const cachedSession = await CacheService.getCachedSession(mockToken);
  if (!cachedSession || cachedSession.user.id !== 'usr_123') {
    throw new Error('Test 3 Failed: session cache lookup failed');
  }
  console.log('Test 3 Passed: session cache stores and returns data instantaneously.');

  // 4. Test session invalidation
  await CacheService.invalidateSession(mockToken);
  const invalidated = await CacheService.getCachedSession(mockToken);
  if (invalidated !== null) {
    throw new Error('Test 4 Failed: session was not invalidated');
  }
  console.log('Test 4 Passed: session invalidation deleted cached token.');

  // 5. Test remember pattern
  let computationCount = 0;
  const expensiveFetch = async () => {
    computationCount++;
    return ['Court 1', 'Court 2', 'Court 3'];
  };

  const res1 = await CacheService.remember('test:courts', 60, expensiveFetch);
  const res2 = await CacheService.remember('test:courts', 60, expensiveFetch);

  if (computationCount !== 1 || res1.length !== 3 || res2.length !== 3) {
    throw new Error('Test 5 Failed: remember pattern did not cache result');
  }
  console.log('Test 5 Passed: remember pattern prevented redundant database fetch (fetch called exactly once).');

  // Clean up test keys
  await CacheService.del('test:key1');
  await CacheService.del('test:courts');

  console.log('--- All Cache Tests Passed Successfully! ---');
  process.exit(0);
}

runCacheTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

