import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function run() {
  const { data: users } = await supabase.from('users').select('id, full_name, email').eq('email', 'notary@example.com');
  console.log('Search results (notary@example.com):', users);
  
  if (users?.[0]) {
    const { error: updateError } = await supabase.from('notary_profiles').update({ 
      office_address: 'المحكمة الابتدائية بشفشاون - قسم قضاء الأسرة',
      primary_court: 'المحكمة الابتدائية بشفشاون',
      appellate_court: 'محكمة الاستئناف بتطوان'
    }).eq('user_id', users[0].id);
    if (updateError) console.error('Update error:', updateError);
    else console.log('Fixed address for test user:', users[0].full_name);
  } else {
    console.log('Test user not found');
  }
}
run();
