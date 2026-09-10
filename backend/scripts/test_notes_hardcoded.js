const { createClient } = require('@supabase/supabase-js');

// NOTE: Diagnostic only. This project already contains this key in root-level test_query.js.
const supabase = createClient(
  'https://akwzymolpecqqdihfkfb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3p5bW9scGVjcXFkaWhma2ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI2MDQ1MywiZXhwIjoyMDc5ODM2NDUzfQ.TntXiDfEUubT8PAtRTsSU44pW-zBZnqDwiCrchawDNY'
);

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
