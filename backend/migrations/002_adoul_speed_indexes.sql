-- 002_adoul_speed_indexes.sql
-- Sovereign Moroccan Notary Platform - High-Performance Indexing Suite
-- Pure additive, idempotent indexes targeting frequent lookup & sort bottlenecks.
-- Does NOT modify any table schemas, constraints, or business logic.

-- 1. Saved Rasms & Drafts Indexes (High volume Notary Gallery lookups)
CREATE INDEX IF NOT EXISTS idx_saved_rasms_notary_created 
  ON saved_rasms(notary_user_id, created_at DESC)
  WHERE notary_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saved_rasms_doc_type 
  ON saved_rasms(document_type)
  WHERE document_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saved_rasms_file_number 
  ON saved_rasms(file_number)
  WHERE file_number IS NOT NULL;

-- 2. Signed Deeds & Verification Indexes (Biometric deed & judge pipeline)
CREATE INDEX IF NOT EXISTS idx_signed_deeds_saved_rasm_id 
  ON signed_deeds(saved_rasm_id)
  WHERE saved_rasm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signed_deeds_created_at 
  ON signed_deeds(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signed_deeds_category 
  ON signed_deeds(category)
  WHERE category IS NOT NULL;

-- 3. Judicial Notifications & Permissions Indexes
CREATE INDEX IF NOT EXISTS idx_judicial_notifications_recipient_created 
  ON judicial_notifications(recipient_id, created_at DESC)
  WHERE recipient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_judicial_notifications_status 
  ON judicial_notifications(status)
  WHERE status IS NOT NULL;

-- 4. Citizen Search & Date Range Filters
CREATE INDEX IF NOT EXISTS idx_marriage_records_inclusion_date 
  ON marriage_records(inclusion_date)
  WHERE inclusion_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_divorce_records_inclusion_date 
  ON divorce_records(inclusion_date)
  WHERE inclusion_date IS NOT NULL;

-- 5. Copy & Extraction Requests Indexes
CREATE INDEX IF NOT EXISTS idx_copy_requests_notary_status 
  ON copy_requests(notary_id, status)
  WHERE notary_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_extraction_requests_status_created 
  ON extraction_requests(status, created_at DESC)
  WHERE status IS NOT NULL;
