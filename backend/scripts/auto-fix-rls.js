#!/usr/bin/env node

/**
 * AUTOMATIC RLS FIX FOR ALL TABLES
 * Disables RLS on all tables to allow service_role access
 * This is a batch fix that handles all tables at once
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function autoFixRLS() {
  console.log('\n🔧 AUTOMATIC RLS FIX - ALL TABLES\n');
  console.log('='.repeat(80));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  console.log(`\n⚠️  This script will:\n`);
  console.log('1. Check all database tables');
  console.log('2. Identify RLS-blocked tables');
  console.log('3. Generate SQL commands to disable RLS');
  console.log('4. Show the SQL commands you need to run\n');

  console.log('⚠️  IMPORTANT:\n');
  console.log('- You must manually run the SQL in Supabase dashboard');
  console.log('- Go to: https://app.supabase.com/project/aahusomtdbyyyoahamvv/sql/new');
  console.log('- Copy-paste the SQL commands from this script');
  console.log('- Click ▶️ Run button\n');

  const proceed = await question(
    'Do you understand and want to continue? (yes/no): '
  );

  if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
    console.log('❌ Cancelled');
    rl.close();
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get all tables
  console.log('\n📊 Checking all database tables...\n');

  const commonTables = [
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
    'notifications',
    'judicial_notifications',
    'judicial_mobility',
    'marriage_continuity',
    'possession_proof',
    'long_term_lease',
    'debt_acknowledgment',
    'debt_discharge',
    'work_certificates',
    'messaging_threads',
    'messaging_messages',
  ];

  const blockedTables = [];

  // Test each table
  for (const tableName of commonTables) {
    process.stdout.write(`  ${tableName}... `);

    try {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (error && error.code === '42501') {
        console.log('❌ RLS BLOCKED');
        blockedTables.push(tableName);
      } else if (error && error.code === '42P01') {
        console.log('⚠️  (table not found)');
      } else if (error) {
        console.log(`⚠️  (${error.code})`);
      } else {
        console.log('✅ OK');
      }
    } catch (err) {
      console.log('⚠️  (error)');
    }
  }

  // Report findings
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 RESULTS:\n');

  if (blockedTables.length === 0) {
    console.log('✅ All tables are accessible! No RLS issues found.');
    console.log('\nYour database is ready to use.');
    rl.close();
    process.exit(0);
  }

  console.log(`❌ Found ${blockedTables.length} blocked table(s):\n`);
  blockedTables.forEach(table => {
    console.log(`   • ${table}`);
  });

  // Generate SQL fix
  console.log('\n' + '='.repeat(80));
  console.log('\n🔧 SQL FIX COMMANDS:\n');
  console.log('Copy ALL of this SQL and run in Supabase:\n');
  console.log('-'.repeat(80) + '\n');

  console.log(
    blockedTables.map(table => `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`).join('\n')
  );

  console.log('\n' + '-'.repeat(80) + '\n');

  // Save to file
  const fs = require('fs');
  const sqlContent = blockedTables
    .map(table => `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`)
    .join('\n');

  const filename = `rls-fix-${Date.now()}.sql`;
  try {
    fs.writeFileSync(filename, sqlContent, 'utf-8');
    console.log(`📄 SQL also saved to: ${filename}\n`);
  } catch (err) {
    console.log(`\n⚠️  Could not save file: ${err.message}\n`);
  }

  // Instructions
  console.log('📍 NEXT STEPS:\n');
  console.log('1. Go to: https://app.supabase.com/project/aahusomtdbyyyoahamvv/sql/new');
  console.log('2. Click "New Query"');
  console.log('3. Paste the SQL above (from the dashed lines)');
  console.log('4. Click the blue ▶️ "Run" button');
  console.log('5. Wait for "Success" message');
  console.log('6. Come back to terminal and press Enter');
  console.log('7. Restart backend: npm run dev');
  console.log('8. Run verification: npm run check:tables\n');

  await question('Press Enter when you have completed the SQL fix in Supabase...');

  // Verify fix
  console.log('\n⏳ Verifying fix...\n');

  let allFixed = true;
  for (const tableName of blockedTables) {
    process.stdout.write(`  ${tableName}... `);

    try {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (error && error.code === '42501') {
        console.log('❌ Still blocked');
        allFixed = false;
      } else if (error) {
        console.log(`⚠️  (${error.code})`);
      } else {
        console.log('✅ Fixed!');
      }
    } catch (err) {
      console.log('❌ Error');
      allFixed = false;
    }
  }

  console.log('\n' + '='.repeat(80));

  if (allFixed) {
    console.log(
      '\n✅ SUCCESS! All tables are now accessible!\n'
    );
    console.log('Next steps:');
    console.log('  1. Restart backend: npm run dev');
    console.log('  2. Open http://localhost:3000');
    console.log('  3. Try logging in\n');
  } else {
    console.log('\n⚠️  Some tables are still blocked!');
    console.log('\nPossible issues:');
    console.log('  • SQL commands did not run successfully');
    console.log('  • Check Supabase error messages');
    console.log('  • Try running the SQL again\n');
  }

  console.log('='.repeat(80) + '\n');
  rl.close();
}

autoFixRLS().catch(err => {
  console.error('❌ Fatal error:', err);
  rl.close();
  process.exit(1);
});
