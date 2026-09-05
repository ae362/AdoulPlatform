-- Migration: Sync DB with FeesAgent.tsx
-- Description: Add JSONB columns for complex data, unified status columns, and a unified attachments table.

-- 1. Unified Attachments Table (The "Vault")
-- This replaces/augments specific document tables to allow storing "Original Deed", "Certificates", "IDs" for ANY record type.
CREATE TABLE IF NOT EXISTS deed_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL, -- The ID of the marriage, property, etc. record
    record_type TEXT NOT NULL, -- 'marriage', 'divorce', 'property', 'inheritance', 'other'
    category TEXT NOT NULL, -- 'original_deed', 'supporting_document', 'identity_card', 'certificate', 'other'
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb, -- For extra info like "face/back" for IDs, or specific certificate type
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deed_attachments_record ON deed_attachments(record_id, record_type);

-- 2. Audit Log (For "AuditEntry" tracking)
CREATE TABLE IF NOT EXISTS deed_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL,
    record_type TEXT NOT NULL,
    notary_id UUID, -- Optional link to notary table
    notary_name TEXT,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'include', 'send'
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deed_audit_record ON deed_audit_logs(record_id, record_type);

-- 3. Update PROPERTY_FEES
-- Add JSONB columns to store the full structured data from FeesAgent
ALTER TABLE property_fees
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft', -- 'draft', 'official_ready', 'included', 'sent'
    ADD COLUMN IF NOT EXISTS parties_data JSONB DEFAULT '[]'::jsonb, -- Stores the full 'sellers' and 'buyers' arrays
    ADD COLUMN IF NOT EXISTS property_data JSONB DEFAULT '{}'::jsonb, -- Stores the full 'PropertyDetails' object
    ADD COLUMN IF NOT EXISTS finance_data JSONB DEFAULT '{}'::jsonb, -- Stores 'FinanceDetails'
    ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb; -- Stores 'DocumentMeta'

-- 4. Update MARRIAGE_RECORDS
ALTER TABLE marriage_records
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS husband_data JSONB DEFAULT '{}'::jsonb, -- Extra fields not in main columns
    ADD COLUMN IF NOT EXISTS wife_data JSONB DEFAULT '{}'::jsonb, -- Extra fields not in main columns
    ADD COLUMN IF NOT EXISTS finance_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;

-- 5. Update DIVORCE_RECORDS
ALTER TABLE divorce_records
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS husband_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS wife_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS finance_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;

-- 6. Update INHERITANCE_FEES
ALTER TABLE inheritance_fees
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS deceased_data JSONB DEFAULT '{}'::jsonb, -- Full 'Party' object for deceased
    ADD COLUMN IF NOT EXISTS heirs_data JSONB DEFAULT '[]'::jsonb, -- Array of 'Party' objects
    ADD COLUMN IF NOT EXISTS finance_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;

-- 7. Update OTHER_DOCUMENT_FEES
ALTER TABLE other_document_fees
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS parties_data JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS finance_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;

-- 8. Create a Unified View (Optional but helpful for the "Registry Table")
-- This view combines key columns from all tables to make querying the "Registry" easier
CREATE OR REPLACE VIEW unified_registry_view AS
SELECT
    id,
    'marriage' as record_type,
    registry_number,
    registry_book_type,
    inclusion_date,
    status,
    husband_name || ' و ' || wife_name as parties_summary,
    created_at
FROM marriage_records
UNION ALL
SELECT
    id,
    'divorce' as record_type,
    divorce_registry_number as registry_number,
    divorce_registry_book_type as registry_book_type,
    inclusion_date,
    status,
    husband_name || ' و ' || wife_name as parties_summary,
    created_at
FROM divorce_records
UNION ALL
SELECT
    id,
    'property' as record_type,
    registry_number,
    registry_book_type,
    inclusion_date,
    status,
    parties_names as parties_summary,
    created_at
FROM property_fees
UNION ALL
SELECT
    id,
    'inheritance' as record_type,
    registry_number,
    registry_book_type,
    inclusion_date,
    status,
    deceased_name as parties_summary,
    created_at
FROM inheritance_fees;
