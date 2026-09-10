#!/usr/bin/env node

/**
 * Master Diagnostic Script - Runs All Diagnostics in Sequence
 * This is the main entry point for complete system diagnostics
 */

const { spawn } = require('child_process');
const path = require('path');

const diagnostics = [
  { name: 'Connection Check', script: 'diagnose-supabase-connection.js' },
  { name: 'Schema Check', script: 'diagnose-schema.js' },
  { name: 'User Check', script: 'diagnose-users.js' },
  { name: 'Endpoint Check', script: 'diagnose-endpoints.js' },
];

async function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const script = spawn('node', [scriptName], {
      cwd: __dirname,
      stdio: 'inherit',
    });

    script.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Don't reject, just continue to next diagnostic
        resolve();
      }
    });

    script.on('error', (err) => {
      console.error(`Error running script: ${err.message}`);
      resolve();
    });
  });
}

async function runAllDiagnostics() {
  console.clear();
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(10) + '🔍 COMPLETE SYSTEM DIAGNOSTIC' + ' '.repeat(18) + '║');
  console.log('║' + ' '.repeat(12) + 'Supabase Migration Verification' + ' '.repeat(15) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  for (let i = 0; i < diagnostics.length; i++) {
    const diagnostic = diagnostics[i];
    console.log(`\n\n${'═'.repeat(60)}`);
    console.log(`\n[${i + 1}/${diagnostics.length}] Running ${diagnostic.name}...\n`);
    console.log(`${'═'.repeat(60)}`);

    await runScript(diagnostic.script);

    if (i < diagnostics.length - 1) {
      console.log('\n\nPress Enter to continue to next diagnostic...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log('\n\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(20) + '✨ DIAGNOSTICS COMPLETE' + ' '.repeat(13) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  console.log('\n📋 NEXT STEPS:\n');
  console.log('1️⃣  If all checks passed:');
  console.log('    → Your Supabase migration is complete!');
  console.log('    → Try logging in with existing user credentials\n');

  console.log('2️⃣  If tables are missing:');
  console.log('    → Run database migrations');
  console.log('    → Check backend/migrations/ folder\n');

  console.log('3️⃣  If no users exist:');
  console.log('    → Create a test user: npm run create-test-user');
  console.log('    → Then try logging in\n');

  console.log('4️⃣  If backend is unreachable:');
  console.log('    → Start backend: cd backend && npm run dev\n');

  console.log('5️⃣  For detailed help:');
  console.log('    → Check DIAGNOSTIC_GUIDE.md in backend folder\n');

  console.log('=' .repeat(60) + '\n');
}

runAllDiagnostics().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
