
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { PasswordService } from '../src/services/password';

// Load environment variables
// Try backend/.env.local first, then root .env
const envLocalPath = path.resolve(__dirname, '../.env.local');
const rootEnvPath = path.resolve(__dirname, '../../.env');

// First try loading local env
dotenv.config({ path: envLocalPath });

// Then load root env (won't overwrite existing vars)
dotenv.config({ path: rootEnvPath });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createRegionalTest() {
  console.log('Creating Regional Council User and Notary...');

  const regionName = "محكمة الاستئناف بالقنيطرة";
  const primaryCourt = "المحكمة الابتدائية بالقنيطرة";
  
  // Define password first
  const regionalPassword = 'Password123!';
  const hashedPassword = await PasswordService.hashPassword(regionalPassword);

  // 1. Create Regional Council User
  const regionalEmail = `council_${Date.now()}@kenitra.com`;
  
  console.log(`Creating Regional User: ${regionalEmail}`);
  
  const { data: regionalUser, error: regError } = await supabase.auth.admin.createUser({
    email: regionalEmail,
    password: regionalPassword,
    email_confirm: true,
    user_metadata: {
      full_name: `المجلس الجهوي - ${regionName}`,
      role: 'regional_adoul_council' 
    }
  });

  if (regError) {
    console.error('Error creating regional user:', regError);
    return;
  }
  
  const regId = regionalUser.user.id;
  const { error: regInsertError } = await supabase.from('users').upsert({
    id: regId,
    email: regionalEmail,
    full_name: `المجلس الجهوي - ${regionName}`,
    role: 'regional_adoul_council',
    password_hash: hashedPassword
  });

  if (regInsertError) {
    console.error('Error inserting Regional Council into public.users:', regInsertError);
    return;
  }

  console.log('Regional User Created ID:', regId);

  // 2. Create Notary User in same region
  const notaryEmail = `notary_${Date.now()}@kenitra.com`;
  const notaryName = "الاستاذ احمد العدل القنيطري";

  console.log(`Creating Notary User: ${notaryEmail}`);

  const { data: notaryUser, error: notError } = await supabase.auth.admin.createUser({
    email: notaryEmail,
    password: regionalPassword,
    email_confirm: true,
    user_metadata: {
      full_name: notaryName,
      role: 'notary'
    }
  });

  if (notError) {
    console.error('Error creating notary user:', notError);
    return;
  }

  const notaryId = notaryUser.user.id;

  // Insert into public.users
  const { error: userInsertError } = await supabase.from('users').upsert({
    id: notaryId,
    email: notaryEmail,
    full_name: notaryName,
    role: 'notary',
    password_hash: hashedPassword
  });

  if (userInsertError) {
    console.error('Error inserting notary into public.users:', userInsertError);
    return;
  }
  
  console.log('Notary inserted into public.users');

  // 3. Create Notary Profile
  console.log('Creating Notary Profile...');
  
  // We know user_id is required, and court_type is required.
  // Using 'first_instance' based on shared/courts.ts conventions.
  const { error: profileError } = await supabase.from('notary_profiles').insert({
    user_id: notaryId,
    appointment_decree_number: 'KEN-2024-001',
    office_address: '123 شارع محمد الخامس، القنيطرة',
    appellate_court: regionName,
    primary_court: primaryCourt, // CRITICAL FOR FILTERING
    court_name: primaryCourt,
    phone: '0661123456',
    court_type: 'first_instance' // Adding required field
  });

  if (profileError) {
    console.error('Error creating profile:', profileError);
  } else {
    console.log('Profile created successfully');
  }

  console.log('--- DONE ---');
  console.log(`Login as Regional Council: ${regionalEmail} / ${regionalPassword}`);
  console.log(`Login as Notary (to check): ${notaryEmail} / ${regionalPassword}`);
}

createRegionalTest();
