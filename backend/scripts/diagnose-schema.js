#!/usr/bin/env node

/**
 * Diagnostic Script: Database Schema Check
 * Verifies all required tables and their schema exist in the new database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const REQUIRED_TABLES = [
  'users',
  'user_sessions',
  'notary_profiles',
  'auth_audit_log',
  'saved_rasms',
  'documents',
  'permissions',
];

async function checkSchema() {
  console.log('\n📊 DATABASE SCHEMA DIAGNOSTIC\n');
  console.log('='.repeat(60));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n🔍 Checking for required tables...\n');

  const tableStatus = {};
  let allTablesExist = true;

  for (const table of REQUIRED_TABLES) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (error && error.code === '42P01') {
        console.log(`❌ ${table} - TABLE NOT FOUND`);
        tableStatus[table] = 'missing';
        allTablesExist = false;
      } else if (error) {
        console.log(`⚠️  ${table} - ERROR: ${error.message}`);
        tableStatus[table] = 'error';
      } else {
        console.log(`✅ ${table} - EXISTS (${count || 0} rows)`);
        tableStatus[table] = 'exists';
      }
    } catch (err) {
      console.log(`❌ ${table} - CONNECTION ERROR: ${err.message}`);
      tableStatus[table] = 'error';
      allTablesExist = false;
    }
  }

  // Critical tables check for auth
  console.log('\n🔐 Auth Critical Tables:');
  console.log('-'.repeat(60));

  const criticalTables = ['users', 'user_sessions'];
  let authReady = true;

  for (const table of criticalTables) {
    if (tableStatus[table] === 'missing') {
      console.log(`❌ ${table} - MISSING (CRITICAL FOR AUTH)`);
      authReady = false;
    } else if (tableStatus[table] === 'exists') {
      console.log(`✅ ${table} - OK`);
    } else {
      console.log(`⚠️  ${table} - ISSUE`);
      authReady = false;
    }
  }

  // Check users table schema
  console.log('\n📋 Users Table Schema:');
  console.log('-'.repeat(60));

  if (tableStatus['users'] === 'exists') {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      if (!error && data && data.length > 0) {
        const sampleUser = data[0];
        const requiredFields = ['id', 'email', 'password_hash', 'role', 'full_name', 'is_active'];
        
        for (const field of requiredFields) {
          if (field in sampleUser) {
            console.log(`  ✅ ${field}`);
          } else {
            console.log(`  ❌ ${field} - MISSING`);
            authReady = false;
          }
        }

        console.log(`\n  Sample user data:`);
        console.log(`  - Email: ${sampleUser.email}`);
        console.log(`  - Role: ${sampleUser.role}`);
        console.log(`  - Active: ${sampleUser.is_active}`);
      } else if (!error) {
        console.log('  ⚠️  No users in database');
        console.log('  Note: This is OK for new databases, but you need to create a test user');
      } else {
        console.log(`  ⚠️  Cannot read users table: ${error.message}`);
      }
    } catch (err) {
      console.log(`  ❌ Error reading users table: ${err.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 SUMMARY:\n');

  if (allTablesExist && authReady) {
    console.log('✅ All critical tables exist!');
    console.log('✅ Authentication setup is ready!');
    console.log('\nNext steps: Verify user data exists in the users table.');
  } else if (!allTablesExist) {
    console.log('❌ CRITICAL: Some required tables are missing!');
    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('   1. Run database migrations in Supabase dashboard');
    console.log('   2. Or copy tables from old database to new one');
    console.log('   3. Or import SQL migration files');
  } else if (!authReady) {
    console.log('❌ Authentication tables have issues');
    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('   Please check the auth tables structure in Supabase dashboard');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

checkSchema().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
