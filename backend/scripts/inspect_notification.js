const { createClient } = require('@supabase/supabase-js');

const requestNumber = process.argv[2];
if (!requestNumber) {
  console.error('Usage: node scripts/inspect_notification.js <REQUEST_NUMBER>');
  process.exit(1);
}

const supabase = createClient(
  'https://akwzymolpecqqdihfkfb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3p5bW9scGVjcXFkaWhma2ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI2MDQ1MywiZXhwIjoyMDc5ODM2NDUzfQ.TntXiDfEUubT8PAtRTsSU44pW-zBZnqDwiCrchawDNY'
);

const summarize = (value) => {
  if (value == null) return 'null';
  if (typeof value === 'string') return `string(len=${value.length})`;
  if (Array.isArray(value)) return `array(len=${value.length})`;
  if (typeof value === 'object') return `object(keys=${Object.keys(value).length})`;
  return typeof value;
};

async function main() {
  const { data, error } = await supabase
    .from('judicial_notifications')
    .select('*')
    .eq('request_number', requestNumber)
    .single();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  const interestingKeys = [
    'id',
    'request_number',
    'certificate_type',
    'created_at',
    'notary_name',
    'involved_names',
    'reason_for_movement',
    'notes',
    'attachments',
    'internal_notes',
    'conditions',
  ];

  console.log('--- Notification ---');
  for (const k of interestingKeys) {
    console.log(`${k}: ${summarize(data[k])}`);
  }

  console.log('\n--- notes preview ---');
  console.log((data.notes || '').slice(0, 400));

  console.log('\n--- attachments ---');
  console.log(data.attachments);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
