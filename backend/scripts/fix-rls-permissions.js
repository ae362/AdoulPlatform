#!/usr/bin/env node

/**
 * RLS FIX SCRIPT - Fixes Row-Level Security permission issues
 * 
 * Summary of the Problem:
 * - Your new Supabase database has RLS (Row-Level Security) enabled
 * - RLS policies are blocking the service key from accessing tables
 * - This causes 401/403 "permission denied for table users" errors
 * 
 * Solution: Disable RLS for service role (or adjust policies)
 */

console.log('\n🔐 RLS PERMISSION FIX GUIDE\n');
console.log('=' .repeat(70));

console.log(`

WHAT'S THE PROBLEM?

Your Supabase database has Row-Level Security (RLS) enabled, which is great
for security, but it's blocking your backend service key from accessing tables.

Backend can't access:
  ❌ users            (RLS permission denied)
  ❌ user_sessions    (RLS permission denied)
  ❌ notary_profiles  (RLS permission denied)
  ❌ auth_audit_log   (RLS permission denied)

This causes 401 errors when trying to login.

${'=' .repeat(70)}

SOLUTION 1: Disable RLS for Service Role (RECOMMENDED)
${'=' .repeat(70)}

The service role should bypass RLS. Follow these steps:

1. Open Supabase Dashboard:
   https://app.supabase.com/project/aahusomtdbyyyoahamvv

2. Go to: Authentication → Policies

3. For each table, check the RLS policies:
   - users
   - user_sessions
   - notary_profiles
   - auth_audit_log

4. Make sure service role has permission:
   - Each policy should say: "USING true" for service role
   - Or enable "Enable RLS" toggle OFF (not recommended)

QUICK FIX via SQL:
${'=' .repeat(70)}

Go to SQL Editor in Supabase and run:

-- Disable RLS for auth tables (allow service role)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notary_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log DISABLE ROW LEVEL SECURITY;

-- Then re-enable with proper policies for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies that allow service role and deny regular users
CREATE POLICY "Allow service role access" ON users
  USING (auth.uid() IS NULL OR current_user = 'postgres' OR current_setting('request.jwt.claims')::jsonb->>'role' = 'service_role')
  WITH CHECK (auth.uid() IS NULL OR current_user = 'postgres' OR current_setting('request.jwt.claims')::jsonb->>'role' = 'service_role');

${'=' .repeat(70)}

SOLUTION 2: Fix Via Supabase Dashboard UI
${'=' .repeat(70)}

1. Supabase Dashboard → Your Project
2. Left sidebar → Click table name (e.g., "users")
3. Click 🔐 Lock icon in top right
4. Check "Enable RLS" toggle status
5. If enabled, click "Edit Policies" 
6. Make sure service role has full access

Visual Steps:
  - Go to: https://app.supabase.com/project/aahusomtdbyyyoahamvv/editor
  - Click on "users" table
  - Click the 🔐 icon
  - Review RLS policies
  - Add or modify policy for service_role

${'=' .repeat(70)}

SOLUTION 3: Check Your Service Key Permissions
${'=' .repeat(70)}

Make sure you're using the correct key:

❌ WRONG: Using ANON KEY (anon-key-xyz)
✅ RIGHT: Using SERVICE ROLE KEY (service_role key)

Your current config in .env.local:
  SUPABASE_URL: https://aahusomtdbyyyoahamvv.supabase.co
  SUPABASE_SERVICE_KEY: Should be service_role secret key

Get the right key:
  1. Supabase Dashboard → Project Settings → API
  2. Copy "service_role secret" (not anon key)
  3. Update .env.local with correct key

${'=' .repeat(70)}

HOW TO VERIFY THE FIX
${'=' .repeat(70)}

After making changes:

1. Run the connection test:
   npm run diagnose:connection

2. Should see:
   ✅ Successfully connected to Supabase!
   ✅ Found N users in database

3. Then create a test user:
   npm run create-test-user

4. Then restart backend:
   npm run dev

5. Try logging in with:
   Email: admin@adoul.com
   Password: Admin@12345

${'=' .repeat(70)}

IMPORTANT SECURITY NOTE
${'=' .repeat(70)}

⚠️  If you disable RLS completely, the backend can access everything.
✅ Better: Create specific RLS policies that allow service role access
   while protecting user data from unauthenticated access.

The policies should:
  ✅ Allow service_role (backend) full access
  ✅ Allow authenticated users to read their own data
  ✅ Block anonymous/public access

${'=' .repeat(70)}

NEED HELP?
${'=' .repeat(70)}

If the SQL approach doesn't work:

1. Check table exists in Supabase SQL Editor:
   SELECT * FROM users;

2. Check RLS status:
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';

3. Check existing policies:
   SELECT * FROM pg_policies
   WHERE tablename = 'users';

4. If tables don't exist, run migrations first:
   npm run diagnose:schema

${'=' .repeat(70)}

`);

console.log('\n🚀 To fix this:\n');
console.log('1. Open: https://app.supabase.com/project/aahusomtdbyyyoahamvv/sql/new');
console.log('2. Paste the SQL fix (see above)');
console.log('3. Click "Run"');
console.log('4. Run: npm run diagnose:connection');
console.log('5. Run: npm run create-test-user');
console.log('6. Restart backend: npm run dev\n');
console.log('=' .repeat(70) + '\n');
