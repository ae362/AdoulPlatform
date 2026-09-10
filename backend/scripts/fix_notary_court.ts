
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
// Assumes running from 'backend' directory
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixNotaryCourt() {
  const targetName = "توفيق الحليمي";
  console.log(`Searching for notary: ${targetName}`);

  // 1. Get the user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, full_name, notary_profiles(*)')
    .ilike('full_name', targetName);

  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }

  if (!users || users.length === 0) {
    console.error('User not found.');
    return;
  }

  const user = users[0];
  console.log('User object:', JSON.stringify(user, null, 2));

  let profile = null;
  if (user.notary_profiles) {
      // Check if it's an array or object
      if (Array.isArray(user.notary_profiles)) {
          profile = user.notary_profiles[0];
      } else {
          profile = user.notary_profiles;
      }
  }

  if (!profile) {
      console.error('Notary profile not found for user.');
      return;
  }

  console.log(`Found user: ${user.full_name}`);
  console.log(`Current State:`);
  console.log(`- Primary Court: '${profile.primary_court}'`);
  console.log(`- Appellate Court: '${profile.appellate_court}'`);

  // 2. Define correct values
  const correctPrimaryCourt = "المحكمة الابتدائية بشفشاون";
  const correctAnswerCourt = "محكمة الاستئناف بتطوان";

  // 3. Update the profile
  const { error: updateError } = await supabase
    .from('notary_profiles')
    .update({
      primary_court: correctPrimaryCourt,
      appellate_court: correctAnswerCourt
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error('Error updating profile:', updateError);
  } else {
    console.log('Successfully updated notary profile.');
    
    // Verify
    const { data: updatedUsers } = await supabase
        .from('notary_profiles')
        .select('*')
        .eq('id', profile.id);
        
    if (updatedUsers && updatedUsers.length > 0) {
        const updated = updatedUsers[0];
        console.log(`New State:`);
        console.log(`- Primary Court: '${updated.primary_court}'`);
        console.log(`- Appellate Court: '${updated.appellate_court}'`);
    }
  }
}

fixNotaryCourt();
