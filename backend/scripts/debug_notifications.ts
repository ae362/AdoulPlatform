import { supabase } from '../src/services/supabase';

async function checkNotifications() {
  console.log('--- Checking judicial_notifications ---');
  const { data, error } = await supabase
    .from('judicial_notifications')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Count:', data?.length);
  console.log('Sample data:', JSON.stringify(data, null, 2));

  console.log('--- Checking notary_profiles ---');
  const { data: profiles, error: pError } = await supabase
    .from('notary_profiles')
    .select('*')
    .limit(5);
  
  if (pError) {
    console.error('Error:', pError);
    return;
  }
  console.log('Profiles Count:', profiles?.length);
  // console.log('Sample profiles:', JSON.stringify(profiles, null, 2));
}

checkNotifications();
