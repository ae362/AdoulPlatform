const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- DB Check ---');
  const { data: notifs, error } = await supabase.from('judicial_notifications').select('*');
  if (error) console.error(error);
  else console.log('Notifications count:', notifs?.length);

  const { data: profiles } = await supabase.from('notary_profiles').select('*');
  console.log('Profiles count:', profiles?.length);
  
  if (notifs && notifs.length > 0) {
    console.log('Sample Notification Notary ID:', notifs[0].notary_id);
    console.log('Sample Notification Status:', notifs[0].status);
  }
}

check();
