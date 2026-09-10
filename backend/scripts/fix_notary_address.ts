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

async function fixAddress() {
  console.log('Fixing notary address for Saeed Al-Ghayathi...');
  
  // Update the profile based on the user name (id 123456 logic usually suggests a specific role)
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('email', 'notary@example.com');

  const userId = users?.[0]?.id;

  if (userId) {
    const { error } = await supabase
      .from('notary_profiles')
      .update({ 
        office_address: 'المحكمة الابتدائية بشفشاون - قسم قضاء الأسرة',
        appellate_court: 'محكمة الاستئناف بتطوان',
        primary_court: 'المحكمة الابتدائية بشفشاون'
      })
      .eq('user_id', userId);

    if (error) console.error('Error updating:', error);
    else console.log('Successfully updated profile for:', users[0].full_name);
  } else {
    console.log('User not found.');
  }
}

fixAddress();
