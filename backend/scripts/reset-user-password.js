#!/usr/bin/env node

/**
 * USER PASSWORD RESET TOOL
 * Interactive tool to select a user and reset their password
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const readline = require('readline');

const util = require('util');
const scrypt = util.promisify(crypto.scrypt);

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const SEPARATOR = '.';

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  return `${salt}${SEPARATOR}${derivedKey.toString('hex')}`;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function resetPassword() {
  console.log('\n🔐 USER PASSWORD RESET TOOL\n');
  console.log('='.repeat(70));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Step 1: Fetch all users
  console.log('\n📋 Fetching users from database...\n');

  let users = [];
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`❌ Error fetching users: ${error.message}`);
      if (error.code === '42501') {
        console.log('\n⚠️  RLS is still blocking access!');
        console.log('   First run the RLS fix from MIGRATION_FIX.md');
      }
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('❌ No users found in database');
      console.log('\nCreate a test user first:');
      console.log('  npm run create-test-user');
      process.exit(1);
    }

    users = data;
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Display users
  console.log('📊 AVAILABLE USERS:\n');
  users.forEach((user, index) => {
    const status = user.is_active ? '✅' : '❌';
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   Name: ${user.full_name || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${status} ${user.is_active ? 'Active' : 'Inactive'}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}\n`);
  });

  // Step 3: Select user
  console.log('-'.repeat(70));
  let userIndex = -1;
  while (userIndex < 0 || userIndex >= users.length) {
    const input = await question(
      `\nSelect user number (1-${users.length}) or press Ctrl+C to exit: `
    );
    userIndex = parseInt(input) - 1;

    if (isNaN(userIndex) || userIndex < 0 || userIndex >= users.length) {
      console.log('❌ Invalid selection. Try again.');
      userIndex = -1;
    }
  }

  const selectedUser = users[userIndex];
  console.log(`\n✅ Selected: ${selectedUser.email}`);

  // Step 4: Get new password
  console.log('\n' + '-'.repeat(70));
  console.log('\n🔑 NEW PASSWORD:\n');

  let newPassword = '';
  let confirmPassword = '';
  let passwordValid = false;

  while (!passwordValid) {
    newPassword = await question('Enter new password (min 8 characters): ');

    if (newPassword.length < 8) {
      console.log('❌ Password must be at least 8 characters');
      continue;
    }

    confirmPassword = await question('Confirm password: ');

    if (newPassword !== confirmPassword) {
      console.log('❌ Passwords do not match');
      continue;
    }

    passwordValid = true;
  }

  // Step 5: Confirm reset
  console.log('\n' + '-'.repeat(70));
  console.log(`\n📋 CONFIRMATION:\n`);
  console.log(`Email: ${selectedUser.email}`);
  console.log(`New Password: ${'•'.repeat(newPassword.length)}`);

  const confirm = await question('\nProceed with password reset? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('❌ Reset cancelled');
    rl.close();
    process.exit(0);
  }

  // Step 6: Hash and update password
  console.log('\n⏳ Updating password...\n');

  const passwordHash = hashPassword(newPassword);

  try {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', selectedUser.id);

    if (error) {
      console.error(`❌ Error updating password: ${error.message}`);
      if (error.code === '42501') {
        console.log('\n⚠️  RLS is blocking updates!');
      }
      process.exit(1);
    }

    console.log('✅ Password reset successfully!\n');
    console.log('='.repeat(70));
    console.log(`\n📝 LOGIN CREDENTIALS:\n`);
    console.log(`Email: ${selectedUser.email}`);
    console.log(`Password: ${newPassword}`);
    console.log('\nNext steps:');
    console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('2. Come back to login page');
    console.log('3. Enter the new credentials above');
    console.log('4. Click Login\n');
    console.log('='.repeat(70) + '\n');
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }

  rl.close();
}

resetPassword().catch(err => {
  console.error('❌ Fatal error:', err);
  rl.close();
  process.exit(1);
});
