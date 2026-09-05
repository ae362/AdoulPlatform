
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { config as loadEnv } from 'dotenv';

// Load env vars manually
const cwd = process.cwd();
loadEnv({ path: path.join(cwd, '.env') });
loadEnv({ path: path.join(cwd, '.env.local'), override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('--- Debugging Toggle Payment Logic ---');

  // 0. Check existing types
  const { data: types, error: typesError } = await supabase
    .from('subscription_payments')
    .select('subscription_type')
    .limit(10);
  
  if (types) {
      console.log("Existing Types in DB:", types.map(t => t.subscription_type));
  } else {
      console.log("No existing types found or error:", typesError);
  }

  // 1. Get a notary
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('role', 'notary')
    .limit(1);

  if (userError || !users?.length) {
    console.error('Failed to find notary:', userError);
    return;
  }

  const notary = users[0];
  console.log('Testing with Notary:', notary.full_name, notary.id);

  const testType = 'annual';
  const testYear = 2026;
  
  // 2. Check existing
  const { data: existing, error: fetchError } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('user_id', notary.id)
    .eq('subscription_type', testType)
    .eq('period_year', testYear);
    
  console.log('Existing records:', existing);

  if (fetchError) {
      console.error("Fetch Error", fetchError);
  }

  // 3. Attempt Insert (Simulate "Mark as Paid")
  const payload = {
       user_id: notary.id,
       subscription_type: testType,
       period_year: testYear,
       amount: 2000,
       currency: 'MAD',
       due_date: '2026-12-31',
       paid_at: new Date().toISOString()
  };

  console.log('Attempting Insert with payload:', payload);

  const { data: insertData, error: insertError } = await supabase
      .from('subscription_payments')
      .insert(payload)
      .select();

  if (insertError) {
      console.error('INSERT FAILED:', insertError);
  } else {
      console.log('INSERT SUCCESS:', insertData);
      
      // Cleanup
      console.log('Cleaning up...');
      await supabase.from('subscription_payments').delete().eq('id', insertData[0].id);
  }
}

run().catch(console.error);
