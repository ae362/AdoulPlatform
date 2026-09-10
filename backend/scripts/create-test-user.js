#!/usr/bin/env node

/**
 * Utility Script: Create Test User
 * Creates a test user in the new Supabase database for authentication testing
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Simple password hashing (same as in the backend)
function hashPassword(password) {
  return crypto
    .pbkdf2Sync(password, 'salt', 100000, 64, 'sha512')
    .toString('hex');
}

async function createTestUser() {
  console.log('\n✨ CREATE TEST USER\n');
  console.log('='.repeat(60));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const testUser = {
    email: 'admin@adoul.com',
    password: 'Admin@12345',
    full_name: 'Admin User',
    role: 'government_authority',
  };

  console.log('\n📝 Creating test user with credentials:\n');
  console.log(`Email: ${testUser.email}`);
  console.log(`Password: ${testUser.password}`);
  console.log(`Name: ${testUser.full_name}`);
  console.log(`Role: ${testUser.role}`);

  try {
    // Check if user already exists
    console.log('\n🔍 Checking if user already exists...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', testUser.email)
      .single();

    if (existingUser) {
      console.log('⚠️  User already exists with ID:', existingUser.id);
      console.log('\nYou can now login with:');
      console.log(`  Email: ${testUser.email}`);
      console.log(`  Password: ${testUser.password}`);
      return;
    }

    // Hash the password
    const passwordHash = hashPassword(testUser.password);

    // Create user
    console.log('\n💾 Creating user in database...');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: testUser.email,
        password_hash: passwordHash,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: true,
      })
      .select('id, email')
      .single();

    if (createError) {
      console.error(`❌ Error creating user: ${createError.message}`);
      console.error(`Code: ${createError.code}`);
      
      if (createError.code === '42P01') {
        console.log('\n⚠️  The "users" table does not exist!');
        console.log('You must run database migrations first.');
      }
      process.exit(1);
    }

    console.log('✅ User created successfully!\n');
    console.log(`User ID: ${newUser.id}`);
    console.log(`Email: ${newUser.email}`);

    // Try to create notary profile if notary role
    if (testUser.role === 'notary') {
      console.log('\n📋 Creating notary profile...');
      const { error: profileError } = await supabase
        .from('notary_profiles')
        .insert({
          user_id: newUser.id,
          appointment_decree_number: 'TEST-001',
          appointment_date: new Date().toISOString().split('T')[0],
          court_type: 'first_instance',
          court_name: 'Test Court',
        });

      if (!profileError) {
        console.log('✅ Notary profile created');
      } else {
        console.log(`⚠️  Could not create notary profile: ${profileError.message}`);
      }
    }

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }

  // 3. Provide login instructions
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test user created successfully!\n');
  console.log('🔐 LOGIN CREDENTIALS:\n');
  console.log(`  📧 Email: ${testUser.email}`);
  console.log(`  🔑 Password: ${testUser.password}`);
  console.log('\nTry logging in with these credentials in the application.\n');

  console.log('Or test via curl:\n');
  console.log(`curl -X POST http://localhost:4000/trpc/auth.login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"${testUser.email}","password":"${testUser.password}"}'`);

  console.log('\n' + '='.repeat(60) + '\n');
}

createTestUser().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
