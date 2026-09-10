-- 001_performance_indexes.sql
-- Sovereign Moroccan Notary Platform - Enterprise Performance & Query Indexing
-- Idempotent indexes for high-traffic tables across citizen search and notary indexing workflows.

-- 1. Marriage Records Indexes
CREATE INDEX IF NOT EXISTS idx_marriage_records_husband_cin 
  ON marriage_records(husband_cin) 
  WHERE husband_cin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marriage_records_wife_cin 
  ON marriage_records(wife_cin) 
  WHERE wife_cin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marriage_records_created_at 
  ON marriage_records(created_at DESC);

-- 2. Divorce Records Indexes
CREATE INDEX IF NOT EXISTS idx_divorce_records_husband_cin 
  ON divorce_records(husband_cin) 
  WHERE husband_cin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_divorce_records_wife_cin 
  ON divorce_records(wife_cin) 
  WHERE wife_cin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_divorce_records_created_at 
  ON divorce_records(created_at DESC);

-- 3. Property & Inheritance Fees Indexes
CREATE INDEX IF NOT EXISTS idx_property_fees_created_at 
  ON property_fees(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inheritance_fees_created_at 
  ON inheritance_fees(created_at DESC);

-- 4. Notary Profiles Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_notary_profiles_user_id 
  ON notary_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_notary_profiles_decree 
  ON notary_profiles(appointment_decree_number) 
  WHERE appointment_decree_number IS NOT NULL;

-- 5. Digital Deeds & Verification Indexes
CREATE INDEX IF NOT EXISTS idx_deeds_file_number 
  ON deeds(file_number) 
  WHERE file_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deeds_status_created 
  ON deeds(status, created_at DESC);

