#!/usr/bin/env node

/**
 * Diagnostic Script: User Data Check
 * Lists users in the database and checks authentication readiness
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkUsers() {
  console.log('\n👥 USER DATA DIAGNOSTIC\n');
  console.log('='.repeat(60));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Count users
  console.log('\n📊 Checking users in database...\n');

  try {
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error(`❌ Error counting users: ${countError.message}`);
      process.exit(1);
    }

    console.log(`Total users in database: ${count}`);

    if (count === 0) {
      console.log('\n⚠️  NO USERS FOUND!');
      console.log('\nYou need to create at least one test user.');
      console.log('Options:');
      console.log('  1. Use the registration endpoint to create a new user');
      console.log('  2. Run: npm run create-test-user');
      console.log('  3. Manually insert into Supabase dashboard\n');
      return;
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }

  // 2. List all users
  console.log('\n📋 Users in database:\n');
  console.log('-'.repeat(60));

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role, full_name, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`❌ Error fetching users: ${error.message}`);
      return;
    }

    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.full_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.is_active ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      });
    }

    console.log('\n' + '-'.repeat(60));
  } catch (err) {
    console.error(`❌ Error listing users: ${err.message}`);
  }

  // 3. Check sessions
  console.log('\n🔑 Active Sessions:\n');
  console.log('-'.repeat(60));

  try {
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('user_id, session_token, created_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && sessions) {
      if (sessions.length === 0) {
        console.log('No active sessions (this is normal for fresh database)');
      } else {
        console.log(`Found ${sessions.length} recent sessions:\n`);
        sessions.forEach((session, index) => {
          const isExpired = new Date(session.expires_at) < new Date();
          console.log(`${index + 1}. User: ${session.user_id.substring(0, 8)}...`);
          console.log(`   Status: ${isExpired ? '❌ Expired' : '✅ Valid'}`);
          console.log(`   Created: ${new Date(session.created_at).toLocaleString()}`);
        });
      }
    } else if (error) {
      console.log(`⚠️  Cannot read sessions: ${error.message}`);
    }
  } catch (err) {
    console.log(`⚠️  Error checking sessions: ${err.message}`);
  }

  // 4. Recommendations
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 RECOMMENDATIONS:\n');

  if (count > 0) {
    console.log('✅ Users exist in database');
    console.log('\nTry logging in with one of the above credentials.');
    console.log('If login still fails:');
    console.log('  1. Verify password is correct');
    console.log('  2. Check if user.is_active is true');
    console.log('  3. Run: npm run diagnose:connection');
  } else {
    console.log('❌ No users in database!');
    console.log('\nCreate a test user by running:');
    console.log('  npm run create-test-user\n');
  }

  console.log('='.repeat(60) + '\n');
}

checkUsers().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
