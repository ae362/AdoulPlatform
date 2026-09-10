const { createClient } = require('@supabase/supabase-js');

// Reads credentials from environment when available.
// If you need to hardcode for local diagnostics, set SUPABASE_URL and SUPABASE_SERVICE_KEY.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('judicial_notifications')
    .select('id, request_number, certificate_type, created_at, involved_names, notes')
    .eq('certificate_type', 'طلب إذن بالزواج')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`Found: ${data.length}`);
  for (const n of data) {
    const notes = n.notes || '';
    const preview = notes.replace(/\s+/g, ' ').slice(0, 140);
    console.log(
      `- ${n.request_number} | ${new Date(n.created_at).toISOString()} | notes.len=${notes.length} | involved=${n.involved_names || ''}`
    );
    console.log(`  preview: ${preview}${notes.length > 140 ? '…' : ''}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
