#!/usr/bin/env node

/**
 * USER MANAGEMENT TOOL
 * Interactive tool to manage users (list, reset password, activate/deactivate)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const readline = require('readline');

function hashPassword(password) {
  return crypto
    .pbkdf2Sync(password, 'salt', 100000, 64, 'sha512')
    .toString('hex');
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

async function showMenu() {
  console.clear();
  console.log('\n🔐 USER MANAGEMENT TOOL\n');
  console.log('='.repeat(70));
  console.log('\nOptions:');
  console.log('  1. List all users');
  console.log('  2. View user details');
  console.log('  3. Reset user password');
  console.log('  4. Activate/Deactivate user');
  console.log('  5. Delete user');
  console.log('  6. Exit\n');

  const choice = await question('Select option (1-6): ');
  return choice;
}

async function listUsers(supabase) {
  console.log('\n📋 ALL USERS:\n');
  console.log('-'.repeat(70));

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return null;
    }

    if (!users || users.length === 0) {
      console.log('No users found');
      return null;
    }

    users.forEach((user, index) => {
      const status = user.is_active ? '✅ Active' : '❌ Inactive';
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.full_name || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${status}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}\n`);
    });

    return users;
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    return null;
  }
}

async function viewUserDetails(supabase) {
  const email = await question('\nEnter user email: ');

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    console.log('\n📊 USER DETAILS:\n');
    console.log('-'.repeat(70));
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.full_name || 'N/A'}`);
    console.log(`Role: ${user.role}`);
    console.log(`Active: ${user.is_active ? '✅ Yes' : '❌ No'}`);
    console.log(`Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log(`Updated: ${new Date(user.updated_at).toLocaleString()}`);
    console.log('-'.repeat(70));
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

async function resetPassword(supabase) {
  const email = await question('\nEnter user email: ');

  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (fetchError) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    const newPassword = await question('Enter new password (min 8 chars): ');

    if (newPassword.length < 8) {
      console.log('❌ Password must be at least 8 characters');
      return;
    }

    const confirm = await question('Confirm password: ');
    if (newPassword !== confirm) {
      console.log('❌ Passwords do not match');
      return;
    }

    const passwordHash = hashPassword(newPassword);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Error: ${updateError.message}`);
      return;
    }

    console.log(`\n✅ Password reset for ${email}`);
    console.log(`   New password: ${newPassword}`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

async function toggleUserStatus(supabase) {
  const email = await question('\nEnter user email: ');

  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, is_active')
      .eq('email', email)
      .single();

    if (fetchError) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    const newStatus = !user.is_active;
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_active: newStatus })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Error: ${updateError.message}`);
      return;
    }

    const action = newStatus ? 'activated' : 'deactivated';
    console.log(`\n✅ User ${action}: ${email}`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

async function deleteUser(supabase) {
  const email = await question('\nEnter user email to delete: ');

  const confirm = await question(
    `⚠️  This will permanently delete ${email}. Type "yes" to confirm: `
  );

  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Delete cancelled');
    return;
  }

  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (fetchError) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      console.error(`❌ Error: ${deleteError.message}`);
      return;
    }

    console.log(`\n✅ User deleted: ${email}`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let running = true;
  while (running) {
    const choice = await showMenu();

    switch (choice) {
      case '1':
        await listUsers(supabase);
        break;
      case '2':
        await viewUserDetails(supabase);
        break;
      case '3':
        await resetPassword(supabase);
        break;
      case '4':
        await toggleUserStatus(supabase);
        break;
      case '5':
        await deleteUser(supabase);
        break;
      case '6':
        running = false;
        break;
      default:
        console.log('❌ Invalid option');
    }

    if (running) {
      await question('Press Enter to continue...');
    }
  }

  console.log('\n👋 Goodbye!\n');
  rl.close();
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  rl.close();
  process.exit(1);
});
