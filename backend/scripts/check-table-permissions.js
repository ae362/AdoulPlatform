#!/usr/bin/env node

/**
 * DATABASE TABLE PERMISSION CHECKER
 * Checks all tables for RLS and permission issues
 * Identifies exactly which tables are blocked
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkAllTables() {
  console.log('\n🔍 DATABASE TABLE PERMISSION CHECKER\n');
  console.log('='.repeat(80));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Step 1: Get all tables from information_schema
  console.log('\n📊 STEP 1: Fetching all database tables...\n');

  let allTables = [];
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'migrations');

    if (error) {
      // Fallback: try direct query
      console.log('⚠️  Could not fetch tables list, using fallback method...\n');
      allTables = [
        'users',
        'user_sessions',
        'notary_profiles',
        'auth_audit_log',
        'saved_rasms',
        'documents',
        'permissions',
        'judicial_fees',
        'contracts',
        'audit_logs',
      ];
    } else if (data) {
      allTables = data.map(row => row.table_name);
    }
  } catch (err) {
    console.log('⚠️  Using fallback table list...\n');
    allTables = [
      'users',
      'user_sessions',
      'notary_profiles',
      'auth_audit_log',
      'saved_rasms',
      'documents',
      'permissions',
      'judicial_fees',
      'contracts',
      'audit_logs',
    ];
  }

  console.log(`Found ${allTables.length} tables to check\n`);
  console.log('-'.repeat(80));

  // Step 2: Test each table
  console.log('\n📋 TESTING TABLE PERMISSIONS:\n');

  const results = {
    accessible: [],
    blocked_rls: [],
    other_errors: [],
  };

  for (const tableName of allTables) {
    process.stdout.write(`Testing ${tableName}... `);

    try {
      const { data, error, status } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (error && error.code === '42501') {
        console.log('❌ RLS BLOCKED');
        results.blocked_rls.push(tableName);
      } else if (error && error.code === '42P01') {
        console.log('⚠️  TABLE NOT FOUND');
      } else if (error) {
        console.log(`⚠️  ERROR: ${error.code}`);
        results.other_errors.push({ table: tableName, error: error.message });
      } else {
        console.log('✅ OK');
        results.accessible.push(tableName);
      }
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      results.other_errors.push({ table: tableName, error: err.message });
    }
  }

  // Step 3: Summary Report
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY REPORT:\n');

  console.log(`✅ ACCESSIBLE TABLES (${results.accessible.length}):`);
  if (results.accessible.length > 0) {
    results.accessible.forEach(table => {
      console.log(`   ✓ ${table}`);
    });
  } else {
    console.log('   (none)');
  }

  console.log(`\n❌ BLOCKED BY RLS (${results.blocked_rls.length}):`);
  if (results.blocked_rls.length > 0) {
    results.blocked_rls.forEach(table => {
      console.log(`   ✗ ${table}`);
    });
  } else {
    console.log('   (none - all tables accessible!)');
  }

  console.log(`\n⚠️  OTHER ERRORS (${results.other_errors.length}):`);
  if (results.other_errors.length > 0) {
    results.other_errors.forEach(item => {
      console.log(`   ✗ ${item.table}: ${item.error}`);
    });
  } else {
    console.log('   (none)');
  }

  // Step 4: Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('\n🔧 RECOMMENDED ACTIONS:\n');

  if (results.blocked_rls.length === 0) {
    console.log('✅ All tables are accessible!');
    console.log('\nYour RLS configuration is correct.');
    console.log('No further action needed.');
  } else {
    console.log(
      `❌ ${results.blocked_rls.length} table(s) are blocked by RLS!\n`
    );
    console.log('FIX: Go to Supabase SQL Editor and run:\n');
    console.log('-'.repeat(80));

    // Generate SQL to disable RLS on blocked tables
    console.log('\n-- Disable RLS on blocked tables:');
    results.blocked_rls.forEach(table => {
      console.log(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
    });

    console.log('\n-- OR create service_role policies:');
    results.blocked_rls.forEach(table => {
      console.log(
        `CREATE POLICY "service_role_access" ON ${table} FOR ALL USING (true) WITH CHECK (true);`
      );
    });

    console.log('\n' + '-'.repeat(80));

    console.log('\nSteps:');
    console.log('1. Copy one of the SQL blocks above');
    console.log(
      '2. Go to https://app.supabase.com/project/aahusomtdbyyyoahamvv/sql/new'
    );
    console.log('3. Paste and click ▶️ Run');
    console.log('4. Restart backend: npm run dev');
    console.log('5. Run this script again to verify: npm run check:tables');
  }

  // Step 5: Generate SQL Fix File
  if (results.blocked_rls.length > 0) {
    const fs = require('fs');
    const sqlFix = `-- SQL FIX for blocked tables (${new Date().toISOString()})
-- Generated by: npm run check:tables

${results.blocked_rls.map(table => `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`).join('\n')}
`;

    const filename = `rls-fix-${Date.now()}.sql`;
    try {
      fs.writeFileSync(filename, sqlFix, 'utf-8');
      console.log(`\n📄 SQL fix saved to: ${filename}`);
    } catch (err) {
      console.log(`\n⚠️  Could not save SQL file: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

checkAllTables().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
