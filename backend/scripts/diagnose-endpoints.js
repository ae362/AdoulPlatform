#!/usr/bin/env node

/**
 * Diagnostic Script: API Endpoint Testing
 * Tests the authentication endpoints directly
 */

require('dotenv').config({ path: '.env.local' });
const http = require('http');

const API_BASE = process.env.VITE_BACKEND_ORIGIN || 'http://localhost:4000';

async function makeRequest(path, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testEndpoints() {
  console.log('\n🧪 API ENDPOINT DIAGNOSTIC\n');
  console.log('='.repeat(60));
  console.log(`\nTesting API at: ${API_BASE}\n`);

  // 1. Check if backend is running
  console.log('📌 STEP 1: Backend Connection');
  console.log('-'.repeat(60));

  try {
    const response = await makeRequest('/', 'GET');
    console.log(`✅ Backend is running (Status: ${response.status})`);
  } catch (err) {
    console.error(`❌ Cannot reach backend: ${err.message}`);
    console.log('\n⚠️  Make sure:');
    console.log('   1. Backend is running: npm run dev');
    console.log('   2. Backend is on port 4000');
    console.log('   3. VITE_BACKEND_ORIGIN is set correctly\n');
    process.exit(1);
  }

  // 2. Test auth endpoint structure
  console.log('\n🔐 STEP 2: Testing Auth Login Endpoint');
  console.log('-'.repeat(60));

  const testCredentials = {
    email: 'test@example.com',
    password: 'test12345',
    rememberMe: false,
  };

  try {
    console.log(`\nAttempting login with:
  Email: ${testCredentials.email}
  Password: ${testCredentials.password}
`);

    const response = await makeRequest('/trpc/auth.login', 'POST', testCredentials);

    console.log(`Status: ${response.status}`);

    if (response.status === 401 || response.status === 400) {
      console.log('⚠️  Got 401/400 response (expected if user doesn\'t exist)\n');
      console.log('Response body:');
      try {
        const jsonBody = JSON.parse(response.body);
        console.log(JSON.stringify(jsonBody, null, 2));
      } catch (e) {
        console.log(response.body);
      }
    } else if (response.status === 200) {
      console.log('✅ Login endpoint returned 200\n');
      try {
        const jsonBody = JSON.parse(response.body);
        console.log('Response:');
        console.log(JSON.stringify(jsonBody, null, 2));
      } catch (e) {
        console.log(response.body);
      }
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}\n`);
      console.log('Response:');
      console.log(response.body);
    }
  } catch (err) {
    console.error(`❌ Error testing endpoint: ${err.message}`);
  }

  // 3. Check Supabase connection from backend perspective
  console.log('\n💾 STEP 3: Supabase Connection Status');
  console.log('-'.repeat(60));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Supabase credentials not found in .env.local');
  } else {
    console.log(`✅ Supabase URL configured: ${supabaseUrl}`);
    console.log(`✅ Supabase Service Key configured`);
    console.log('\nNote: Actual connection test would require running the Schema diagnostic');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📝 SUMMARY:\n');
  console.log('If you got 401 errors:');
  console.log('  → User might not exist in database');
  console.log('  → Check with: npm run diagnose:schema\n');
  console.log('If backend is unreachable:');
  console.log('  → Start backend: cd backend && npm run dev\n');

  console.log('='.repeat(60) + '\n');
}

testEndpoints().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
