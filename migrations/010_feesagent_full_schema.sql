-- Comprehensive Migration: Sync Supabase DB with FeesAgentState (All Deed Types)
-- This script creates a dedicated table for every رسم عدلي (deed type) and adds JSONB columns for all nested/complex fields in FeesAgentState.
-- It also includes the unified attachments table, audit log, and registry view.

-- 1. Unified Attachments Table (Vault)
CREATE TABLE IF NOT EXISTS deed_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL,
    record_type TEXT NOT NULL,
    category TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deed_attachments_record ON deed_attachments(record_id, record_type);

-- 2. Audit Log Table
CREATE TABLE IF NOT EXISTS deed_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL,
    record_type TEXT NOT NULL,
    notary_id UUID,
    notary_name TEXT,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deed_audit_record ON deed_audit_logs(record_id, record_type);

-- 3. Deed Tables (One for Each رسم عدلي)
-- Each table includes all relevant JSONB columns for nested objects/arrays in FeesAgentState

-- Marriage
CREATE TABLE IF NOT EXISTS marriage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    husband_data JSONB DEFAULT '{}'::jsonb,
    wife_data JSONB DEFAULT '{}'::jsonb,
    marriage_details JSONB DEFAULT '{}'::jsonb, -- includes dowryAmount, dowryAdvance, dowryDeferred, dowryPaymentMethod, hasOtherDowryItems, otherDowryItems, hasAssetManagementAgreement, hasSpecialConditions, specialConditionsOwner, specialConditionsText, authorizationNumber, authorizationDate, authorizationCourt, hijriDate, registryBookType, registryNumber, registryPage, registryCount, mixedMarriageForeignParty, husbandConvertedToIslam, isMinorParty, conversionCertificate
    meta_data JSONB DEFAULT '{}'::jsonb,
    certificates JSONB DEFAULT '[]'::jsonb,
    witnesses JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '[]'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Divorce
CREATE TABLE IF NOT EXISTS divorce_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    husband_data JSONB DEFAULT '{}'::jsonb,
    wife_data JSONB DEFAULT '{}'::jsonb,
    divorce_certification JSONB DEFAULT '{}'::jsonb, -- includes all nested fields from divorceCertification
    meta_data JSONB DEFAULT '{}'::jsonb,
    certificates JSONB DEFAULT '[]'::jsonb,
    witnesses JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '[]'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inheritance
CREATE TABLE IF NOT EXISTS inheritance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    deceased_data JSONB DEFAULT '{}'::jsonb,
    heirs_data JSONB DEFAULT '[]'::jsonb,
    inheritance_deeds JSONB DEFAULT '[]'::jsonb,
    applicants JSONB DEFAULT '[]'::jsonb,
    applicant JSONB DEFAULT '{}'::jsonb,
    inheritance_description TEXT,
    certificates JSONB DEFAULT '[]'::jsonb,
    witnesses JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '[]'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition
CREATE TABLE IF NOT EXISTS partition_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    partition_divisions JSONB DEFAULT '[]'::jsonb,
    beneficiaries JSONB DEFAULT '[]'::jsonb,
    common_facilities JSONB DEFAULT '{}'::jsonb,
    properties JSONB DEFAULT '[]'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proxy (Tawkil)
CREATE TABLE IF NOT EXISTS proxy_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    agency_mode TEXT,
    tawkil_scope JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,
    certificates JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '[]'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property
CREATE TABLE IF NOT EXISTS property_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    sellers_data JSONB DEFAULT '[]'::jsonb,
    buyers_data JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '[]'::jsonb,
    certificates JSONB DEFAULT '[]'::jsonb,
    common_facilities JSONB DEFAULT '{}'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift/Charity
CREATE TABLE IF NOT EXISTS gift_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    donors_data JSONB DEFAULT '[]'::jsonb,
    beneficiaries_data JSONB DEFAULT '[]'::jsonb,
    property_data JSONB DEFAULT '{}'::jsonb,
    certificates JSONB DEFAULT '[]'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mortgage
CREATE TABLE IF NOT EXISTS mortgage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    debtors_data JSONB DEFAULT '[]'::jsonb,
    creditors_data JSONB DEFAULT '[]'::jsonb,
    property_data JSONB DEFAULT '{}'::jsonb,
    loan_details_data JSONB DEFAULT '{}'::jsonb,
    certificates JSONB DEFAULT '[]'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ownership (ملكية / حيازة)
CREATE TABLE IF NOT EXISTS ownership_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    owners_data JSONB DEFAULT '[]'::jsonb,
    applicants JSONB DEFAULT '[]'::jsonb,
    applicant JSONB DEFAULT '{}'::jsonb,
    inheritance_deeds JSONB DEFAULT '[]'::jsonb,
    witnesses_data JSONB DEFAULT '[]'::jsonb,
    property_data JSONB DEFAULT '{}'::jsonb,
    certificates JSONB DEFAULT '[]'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Corporate (شخص معنوي)
CREATE TABLE IF NOT EXISTS corporate_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    entity_type TEXT,
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    founders_data JSONB DEFAULT '[]'::jsonb,
    entity_info_data JSONB DEFAULT '{}'::jsonb,
    certificates JSONB DEFAULT '[]'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Other Documents (رسم آخر)
CREATE TABLE IF NOT EXISTS other_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    registry_book_type TEXT,
    registry_number TEXT,
    registry_page TEXT,
    registry_count TEXT,
    inclusion_date DATE,
    inclusion_hijri TEXT,
    parties_data JSONB DEFAULT '[]'::jsonb,
    document_details JSONB DEFAULT '{}'::jsonb,
    applicants JSONB DEFAULT '[]'::jsonb,
    applicant JSONB DEFAULT '{}'::jsonb,
    certificates JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '[]'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,
    post_registration JSONB DEFAULT '{}'::jsonb,
    validation_alerts JSONB DEFAULT '[]'::jsonb,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    law2590 BOOLEAN DEFAULT FALSE,
    ownership_criteria JSONB DEFAULT '{}'::jsonb,
    draft TEXT,
    is_draft_saved BOOLEAN DEFAULT FALSE,
    legal_entity_setup_step INTEGER,
    legal_entity_transaction_type TEXT,
    legal_entity_seller_status TEXT,
    is_entering_natural_party_first BOOLEAN DEFAULT FALSE,
    is_entering_natural_party_second BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all required columns exist in existing tables
ALTER TABLE marriage_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE marriage_records ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE divorce_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE divorce_records ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE inheritance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE inheritance_records ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE partition_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE partition_records ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE proxy_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE proxy_records ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE property_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE property_records ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE mortgage_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE mortgage_records ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ownership_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE ownership_records ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ownership_records ADD COLUMN IF NOT EXISTS applicants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ownership_records ADD COLUMN IF NOT EXISTS applicant JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ownership_records ADD COLUMN IF NOT EXISTS inheritance_deeds JSONB DEFAULT '[]'::jsonb;
ALTER TABLE corporate_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE corporate_records ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;

-- 4. Unified Registry View
CREATE OR REPLACE VIEW unified_registry_view AS
SELECT id, 'marriage' as record_type, registry_number::TEXT as registry_number, registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM marriage_records
UNION ALL
SELECT id, 'divorce' as record_type, divorce_registry_number::TEXT as registry_number, divorce_registry_book_type as registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM divorce_records
UNION ALL
SELECT id, 'inheritance' as record_type, registry_number::TEXT as registry_number, registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM inheritance_records
UNION ALL
SELECT id, 'partition' as record_type, registry_number::TEXT as registry_number, registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM partition_records
UNION ALL
SELECT id, 'proxy' as record_type, registry_number::TEXT as registry_number, registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM proxy_records
UNION ALL
SELECT id, 'property' as record_type, registry_number::TEXT as registry_number, registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM property_records
UNION ALL
SELECT id, 'gift' as record_type, registry_number::TEXT as registry_number, registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM gift_records
UNION ALL
SELECT id, 'mortgage' as record_type, registry_number::TEXT as registry_number, registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM mortgage_records
UNION ALL
SELECT id, 'ownership' as record_type, registry_number::TEXT as registry_number, registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM ownership_records
UNION ALL
SELECT id, 'corporate' as record_type, registry_number::TEXT as registry_number, registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM corporate_records
UNION ALL
SELECT id, 'other' as record_type, registry_number::TEXT as registry_number, registry_book_type, inclusion_date::TEXT as inclusion_date, COALESCE(status, 'draft') as status, COALESCE(meta_data, '{}'::jsonb) as meta_data, created_at FROM other_records;
