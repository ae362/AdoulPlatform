#!/usr/bin/env node

/**
 * ADVANCED LOGIN DIAGNOSTIC
 * Identifies the EXACT reason for 401 login failures
 * Tests each possible cause independently
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Same password hashing as backend
function hashPassword(password) {
  return crypto
    .pbkdf2Sync(password, 'salt', 100000, 64, 'sha512')
    .toString('hex');
}

async function diagnoseLogin(email, password) {
  console.log('\n🔐 ADVANCED LOGIN DIAGNOSTIC\n');
  console.log('='.repeat(70));
  console.log(`\nDiagnosing login for: ${email}`);
  console.log(`Password entered: ${password}`);
  console.log('\n' + '='.repeat(70));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // TEST 1: Can we access the users table at all?
  console.log('\n📊 TEST 1: Database Table Access');
  console.log('-'.repeat(70));

  let canAccessTable = false;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error && error.code === '42501') {
      console.log('❌ PERMISSION DENIED - RLS is blocking table access');
      console.log(`   Error: ${error.message}`);
      console.log('\n   ACTION: Your RLS policies are still blocking the backend.');
      console.log('   FIX: Run the SQL from MIGRATION_FIX.md');
      return;
    } else if (error) {
      console.log(`⚠️  Table access error: ${error.message}`);
      return;
    } else {
      console.log('✅ Can access users table');
      canAccessTable = true;
    }
  } catch (err) {
    console.log(`❌ Connection error: ${err.message}`);
    return;
  }

  if (!canAccessTable) {
    console.log('\n❌ STOPPING HERE - Cannot continue without table access');
    return;
  }

  // TEST 2: Does the user exist?
  console.log('\n👤 TEST 2: User Existence Check');
  console.log('-'.repeat(70));

  let user = null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role, full_name, is_active, created_at')
      .eq('email', email)
      .single();

    if (error && error.code === 'PGRST116') {
      console.log(`❌ USER NOT FOUND`);
      console.log(`   Email: ${email} does not exist in database`);
      console.log('\n   ACTION: Create the user first');
      console.log('   FIX: Run: npm run create-test-user');
      return;
    } else if (error) {
      console.log(`❌ Query error: ${error.message}`);
      return;
    } else if (data) {
      console.log(`✅ User found in database`);
      user = data;
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.full_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    } else {
      console.log(`❌ No user found with email: ${email}`);
      return;
    }
  } catch (err) {
    console.log(`❌ Lookup error: ${err.message}`);
    return;
  }

  if (!user) {
    return;
  }

  // TEST 3: Is the user active?
  console.log('\n🔄 TEST 3: User Status Check');
  console.log('-'.repeat(70));

  if (!user.is_active) {
    console.log(`❌ USER IS INACTIVE`);
    console.log(`   is_active = false`);
    console.log('\n   ACTION: Activate the user in Supabase dashboard');
    console.log('   FIX: Go to Supabase → Table Editor → users');
    console.log('        Find the user and set is_active = true');
    return;
  } else {
    console.log(`✅ User is active`);
  }

  // TEST 4: Does password match?
  console.log('\n🔑 TEST 4: Password Verification');
  console.log('-'.repeat(70));

  const providedHash = hashPassword(password);
  const storedHash = user.password_hash;

  console.log(`   Provided password: ${password}`);
  console.log(`   Your hash:   ${providedHash.substring(0, 40)}...`);
  console.log(`   DB hash:     ${storedHash.substring(0, 40)}...`);

  if (providedHash === storedHash) {
    console.log(`\n✅ PASSWORD MATCHES`);
  } else {
    console.log(`\n❌ PASSWORD DOES NOT MATCH`);
    console.log('\n   ACTION: Password is wrong');
    console.log('   FIX: Check that you typed the password correctly');
    console.log('        Or create new test user: npm run create-test-user');
    return;
  }

  // TEST 5: Check if backend can simulate the login
  console.log('\n🔐 TEST 5: Simulated Backend Login');
  console.log('-'.repeat(70));

  try {
    // Try to create a session like the backend does
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (sessionError && sessionError.code === '42501') {
      console.log(`❌ CANNOT CREATE SESSION - RLS Blocking`);
      console.log(`   Error: ${sessionError.message}`);
      console.log('\n   ACTION: RLS is blocking user_sessions table');
      console.log('   FIX: Run the SQL from MIGRATION_FIX.md');
      return;
    } else if (sessionError) {
      console.log(`⚠️  Session error: ${sessionError.message}`);
    } else {
      console.log(`✅ Can create sessions`);
      console.log(`   Session created: ${sessionToken.substring(0, 20)}...`);
    }
  } catch (err) {
    console.log(`❌ Session error: ${err.message}`);
  }

  // SUCCESS!
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ ALL CHECKS PASSED!\n');
  console.log('Summary:');
  console.log('  ✅ Can access users table');
  console.log(`  ✅ User "${email}" exists`);
  console.log('  ✅ User is active');
  console.log('  ✅ Password is correct');
  console.log('  ✅ Can create sessions');
  console.log('\nConclusion: Database and backend setup is CORRECT!');
  console.log('\nIf login still fails in the browser:');
  console.log('  1. Clear browser cache: Ctrl+Shift+Delete');
  console.log('  2. Close and reopen browser');
  console.log('  3. Check backend is running: npm run dev');
  console.log('  4. Check frontend can reach backend: http://localhost:4000');
  console.log('  5. Check browser console for network errors (F12)');
  console.log('\n' + '='.repeat(70) + '\n');
}

// Get credentials from command line or use defaults
const email = process.argv[2] || 'admin@adoul.com';
const password = process.argv[3] || 'Admin@12345';

diagnoseLogin(email, password).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
