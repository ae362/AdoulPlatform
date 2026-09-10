
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { PasswordService } from '../src/services/password';

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const rootEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envLocalPath });
dotenv.config({ path: rootEnvPath });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTetouanAccount() {
  console.log('Fixing Tetouan Regional Council Account...');

  const targetEmail = 'regional@council.gov.ma';
  const targetPassword = 'Password@2025'; // As requested
  const regionName = "محكمة الاستئناف بتطوان";
  const fullName = `المجلس الجهوي - ${regionName}`;
  
  // 1. Find the user in Auth system
  // We can't search by email directly in admin API easily without listUsers loop usually, 
  // but let's try to just upsert it or see if we can get ID from public.users if it exists there.
  
  let userId: string | null = null;

  // Try to find in public.users first
  const { data: publicUser } = await supabase.from('users').select('id').eq('email', targetEmail).single();
  
  if (publicUser) {
    console.log('Found user in public.users:', publicUser.id);
    userId = publicUser.id;
    
    // Verify existence in Auth
    try {
        const { data: authUser, error: getError } = await supabase.auth.admin.getUserById(userId);
        if (getError || !authUser) {
            console.log('User exists in DB but NOT in Auth (Zombie record). cleaning up...');
            await supabase.from('users').delete().eq('id', userId);
            userId = null; // Reset to force creation
        }
    } catch (e) {
        console.log('Error verifying auth user, assuming zombie:', e);
         await supabase.from('users').delete().eq('id', userId);
         userId = null;
    }
  } else {
    console.log('User not found in public.users. this account must exist in Auth or we create it.');
  }

  // If we don't have ID, we might need to list users to find the auth ID, or just try to create it and catch "already exists".
  // If we try to create, we get the ID back even if it fails? No.
  
  if (!userId) {
     // Check if account exists by trying to sign in? No, we have admin key.
     // Let's use listUsers to find the ID.
     const { data: { users }, error } = await supabase.auth.admin.listUsers();
     if (error) {
         console.error('Error listing users:', error);
         return;
     }
     const found = users.find(u => u.email === targetEmail);
     if (found) {
         userId = found.id;
         console.log('Found user in Auth system:', userId);
     }
  }

  const hashedPassword = await PasswordService.hashPassword(targetPassword);

  if (!userId) {
    console.log('User does not exist in Auth. Creating new...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            role: 'regional_adoul_council'
        }
    });
    
    if (createError) {
        console.error('Error creating user:', createError);
        return;
    }
    userId = newUser.user.id;
    console.log('Created new user with ID:', userId);
  } else {
    console.log('Updating existing Auth user...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: targetPassword,
        user_metadata: {
            full_name: fullName,
            role: 'regional_adoul_council'
        }
    });
    
    if (updateError) {
        console.error('Error updating auth user:', updateError);
    } else {
        console.log('Auth user updated.');
    }
  }

  // 2. Update public.users
  console.log('Updating public.users table...');
  const { error: dbError } = await supabase.from('users').upsert({
    id: userId,
    email: targetEmail,
    full_name: fullName,
    role: 'regional_adoul_council',
    password_hash: hashedPassword
  });

  if (dbError) {
    console.error('Error updating public.users:', dbError);
  } else {
    console.log('public.users updated successfully.');
  }
  
  console.log('--- FIX COMPLETE ---');
  console.log(`Email: ${targetEmail}`);
  console.log(`Region: ${regionName}`);
  console.log(`Password: ${targetPassword}`);
}

fixTetouanAccount();
