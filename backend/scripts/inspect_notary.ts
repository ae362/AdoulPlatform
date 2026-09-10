
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const rootEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envLocalPath });
dotenv.config({ path: rootEnvPath });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectNotary() {
  console.log('Searching for Taoufik...');
  
  // 1. Find User by Name part
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, notary_profiles(*)')
    .ilike('full_name', '%توفيق الحليمي%');

  if (error) {
    console.error('Error finding user:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('No user found with name like "توفيق الحليمي"');
    console.log('Listing all users to see if spelling differs...');
    const { data: allUsers } = await supabase.from('users').select('full_name').limit(20);
    console.log(allUsers?.map(u => u.full_name));
    return;
  }

  console.log('Found User(s):');
  console.log(JSON.stringify(users, null, 2));

  // Check strict equality against court strings
  const targetCourt = "المحكمة الابتدائية بشفشاون";
  users.forEach(u => {
      const p = Array.isArray(u.notary_profiles) ? u.notary_profiles[0] : u.notary_profiles;
      if (p) {
          console.log(`\nChecking Profile for ${u.full_name}:`);
          console.log(`DB Primary Court: '${p.primary_court}'`);
          console.log(`Target Court:     '${targetCourt}'`);
          console.log(`Match? ${p.primary_court === targetCourt}`);
          console.log(`Includes? ${p.primary_court?.includes(targetCourt)}`);
          
          console.log(`DB Appellate Court: '${p.appellate_court}'`);
      } else {
          console.log(`\nUser ${u.full_name} has NO notary_profile! This is why he is hidden.`);
      }
  });
}

inspectNotary();
