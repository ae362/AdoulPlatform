import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function run() {
  const { data: users, error } = await supabase.from('users').select('id, full_name, email').limit(20);
  if (error) console.error(error);
  console.log(JSON.stringify(users, null, 2));
}
run();
