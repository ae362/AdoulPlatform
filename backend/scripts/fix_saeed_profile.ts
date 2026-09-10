import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function run() {
  const { data: users } = await supabase.from('users').select('id, full_name, email').ilike('full_name', '%سعيد الغياثي%');
  console.log('Search results:', users);
  
  if (users?.[0]) {
    const { error: updateError } = await supabase.from('notary_profiles').update({ 
      office_address: 'المحكمة الابتدائية بشفشاون - قسم قضاء الأسرة' 
    }).eq('user_id', users[0].id);
    if (updateError) console.error('Update error:', updateError);
    else console.log('Fixed address for:', users[0].full_name);
  } else {
    console.log('User not found');
  }
}
run();
