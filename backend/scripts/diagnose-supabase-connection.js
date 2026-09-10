#!/usr/bin/env node

/**
 * Diagnostic Script: Supabase Connection & Environment Variables
 * Tests if the backend can connect to Supabase with current environment variables
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function diagnose() {
  console.log('\n🔍 SUPABASE CONNECTION DIAGNOSTIC\n');
  console.log('=' .repeat(60));

  // 1. Check environment variables
  console.log('\n📋 STEP 1: Environment Variables Check');
  console.log('-'.repeat(60));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL is not set in .env.local');
  } else {
    console.log(`✅ SUPABASE_URL: ${supabaseUrl}`);
  }

  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_KEY is not set in .env.local');
  } else {
    console.log(`✅ SUPABASE_SERVICE_KEY: ${supabaseServiceKey.substring(0, 50)}...`);
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('\n❌ Missing critical environment variables. Please check your .env.local file.');
    process.exit(1);
  }

  // 2. Test connection
  console.log('\n🔌 STEP 2: Connection Test');
  console.log('-'.repeat(60));

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try a simple query to verify connection
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error(`❌ Connection Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      
      if (error.code === '42P01') {
        console.log('\n⚠️  Issue: The "users" table does not exist in the new database!');
        console.log('   This suggests the database tables were not migrated.');
      }
    } else {
      console.log('✅ Successfully connected to Supabase!');
      console.log(`   Found ${Array.isArray(data) ? data.length : '...'} users in database`);
    }
  } catch (err) {
    console.error(`❌ Connection Failed: ${err.message}`);
  }

  // 3. Test with anon key if available
  console.log('\n🔑 STEP 3: Testing ANON Key (if available)');
  console.log('-'.repeat(60));

  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (supabaseAnonKey) {
    try {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await anonClient
        .from('users')
        .select('id')
        .limit(1);

      if (!error) {
        console.log('✅ ANON key works (not recommended for server operations)');
      } else {
        console.log(`⚠️  ANON key has permission issues: ${error.message}`);
      }
    } catch (err) {
      console.log(`⚠️  ANON key test failed: ${err.message}`);
    }
  } else {
    console.log('ℹ️  SUPABASE_ANON_KEY not set');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Diagnostic complete!\n');
}

diagnose().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
