import { supabase } from '../src/services/supabase';

async function createJudicialNotificationsTable() {
  try {
    console.log('🚀 Creating judicial_notifications table...');

    // First, try to create the table by attempting an insert which will show us the schema issues
    // If the table doesn't exist, we'll get an error we can work with
    
    const testInsert = await supabase
      .from('judicial_notifications')
      .insert({
        request_number: 'TEST-' + Date.now(),
        notary_name: 'Test',
        jurisdiction: 'Test',
        target_court: 'Test',
        certificate_type: 'Test',
        reason_for_movement: 'Test',
        requested_duration: 1,
        duration_unit: 'يوم',
        status: 'قيد_المعالجة',
      })
      .select();

    if (testInsert.error) {
      if (testInsert.error.code === 'PGRST204') {
        console.error('❌ Table does not exist. Error:', testInsert.error.message);
        console.log('\n📋 You need to create this table in Supabase dashboard:');
        console.log(`
          CREATE TABLE IF NOT EXISTS public.judicial_notifications (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            request_number varchar UNIQUE NOT NULL,
            notary_id uuid,
            notary_name varchar NOT NULL,
            jurisdiction varchar NOT NULL,
            target_court varchar NOT NULL,
            certificate_type varchar NOT NULL,
            reason_for_movement text,
            requested_duration integer,
            duration_unit varchar DEFAULT 'يوم',
            status varchar DEFAULT 'قيد_المعالجة',
            decision_type varchar,
            decision_reasoning text,
            conditions jsonb,
            processing_time_hours integer,
            document_number varchar,
            is_document_generated boolean DEFAULT false,
            created_at timestamp with time zone DEFAULT now(),
            decided_at timestamp with time zone,
            notes text,
            attachments text,
            notary_professional_number varchar,
            notary_office_number varchar
          );

          CREATE INDEX IF NOT EXISTS idx_judicial_notifications_request_number 
            ON public.judicial_notifications(request_number);
          CREATE INDEX IF NOT EXISTS idx_judicial_notifications_status 
            ON public.judicial_notifications(status);
          CREATE INDEX IF NOT EXISTS idx_judicial_notifications_created_at 
            ON public.judicial_notifications(created_at);
        `);
      } else {
        console.error('❌ Error:', testInsert.error.message);
      }
      return;
    }

    console.log('✅ judicial_notifications table exists and is writable!');
    
    // Clean up test record
    if (testInsert.data && testInsert.data[0]) {
      await supabase
        .from('judicial_notifications')
        .delete()
        .eq('id', testInsert.data[0].id);
      console.log('✅ Cleanup complete');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
createJudicialNotificationsTable().catch(console.error);

