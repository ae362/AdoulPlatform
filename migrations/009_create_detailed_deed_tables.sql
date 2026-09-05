-- Migration: Create specific tables for every deed type
-- Description: Creates dedicated tables for Sales, Gifts, Mortgages, Proxies, etc. to cover all 'DocumentType' values.

-- 1. Sales Records (بيع وشراء)
CREATE TABLE IF NOT EXISTS sales_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft', -- 'draft', 'official_ready', 'included', 'sent'
    
    -- Registry Info
    registry_book_type TEXT,
    registry_number INTEGER,
    registry_count INTEGER,
    registry_page INTEGER,
    inclusion_date DATE,
    inclusion_hijri TEXT,

    -- Data Payloads
    sellers_data JSONB DEFAULT '[]'::jsonb,
    buyers_data JSONB DEFAULT '[]'::jsonb,
    property_data JSONB DEFAULT '{}'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Gift & Charity Records (هبة / صدقة)
CREATE TABLE IF NOT EXISTS gift_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    gift_type TEXT, -- 'hiba', 'sadaqa'
    
    registry_book_type TEXT,
    registry_number INTEGER,
    registry_count INTEGER,
    registry_page INTEGER,
    inclusion_date DATE,
    inclusion_hijri TEXT,

    donors_data JSONB DEFAULT '[]'::jsonb, -- Wahib
    beneficiaries_data JSONB DEFAULT '[]'::jsonb, -- Mawhoub lahu
    property_data JSONB DEFAULT '{}'::jsonb,
    finance_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mortgage Records (رهن)
CREATE TABLE IF NOT EXISTS mortgage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    
    registry_book_type TEXT,
    registry_number INTEGER,
    registry_count INTEGER,
    registry_page INTEGER,
    inclusion_date DATE,
    inclusion_hijri TEXT,

    debtors_data JSONB DEFAULT '[]'::jsonb, -- Rahin
    creditors_data JSONB DEFAULT '[]'::jsonb, -- Murtaqin
    property_data JSONB DEFAULT '{}'::jsonb,
    loan_details_data JSONB DEFAULT '{}'::jsonb, -- Amount, duration, etc.
    meta_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Partition Records (مقاسمة)
CREATE TABLE IF NOT EXISTS partition_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    
    registry_book_type TEXT,
    registry_number INTEGER,
    registry_count INTEGER,
    registry_page INTEGER,
    inclusion_date DATE,
    inclusion_hijri TEXT,

    coparceners_data JSONB DEFAULT '[]'::jsonb, -- Partners sharing the property
    properties_data JSONB DEFAULT '[]'::jsonb, -- List of properties being divided
    division_details_data JSONB DEFAULT '{}'::jsonb, -- Who gets what
    meta_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Proxy Records (توكيل رسمي)
CREATE TABLE IF NOT EXISTS proxy_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    
    registry_book_type TEXT,
    registry_number INTEGER,
    registry_count INTEGER,
    registry_page INTEGER,
    inclusion_date DATE,
    inclusion_hijri TEXT,

    principals_data JSONB DEFAULT '[]'::jsonb, -- Muwakkil
    agents_data JSONB DEFAULT '[]'::jsonb, -- Wakil
    mandate_details_data JSONB DEFAULT '{}'::jsonb, -- Powers granted
    meta_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ownership Proof Records (ملكية / حيازة)
CREATE TABLE IF NOT EXISTS ownership_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    record_type TEXT, -- 'melkia', 'hiyaza'
    
    registry_book_type TEXT,
    registry_number INTEGER,
    registry_count INTEGER,
    registry_page INTEGER,
    inclusion_date DATE,
    inclusion_hijri TEXT,

    owners_data JSONB DEFAULT '[]'::jsonb,
    witnesses_data JSONB DEFAULT '[]'::jsonb, -- Lafif witnesses
    property_data JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Corporate Records (تأسيس شركات / جمعيات)
CREATE TABLE IF NOT EXISTS corporate_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'draft',
    entity_type TEXT, -- 'company', 'association', 'cooperative'
    
    registry_book_type TEXT,
    registry_number INTEGER,
    registry_count INTEGER,
    registry_page INTEGER,
    inclusion_date DATE,
    inclusion_hijri TEXT,

    founders_data JSONB DEFAULT '[]'::jsonb,
    entity_info_data JSONB DEFAULT '{}'::jsonb, -- Name, capital, HQ
    meta_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Update Unified View to include new tables
CREATE OR REPLACE VIEW unified_registry_view AS
SELECT id, 'marriage' as record_type, registry_number, registry_book_type, inclusion_date, status, husband_name || ' و ' || wife_name as parties_summary, created_at FROM marriage_records
UNION ALL
SELECT id, 'divorce' as record_type, divorce_registry_number, divorce_registry_book_type, inclusion_date, status, husband_name || ' و ' || wife_name as parties_summary, created_at FROM divorce_records
UNION ALL
SELECT id, 'inheritance' as record_type, registry_number, registry_book_type, inclusion_date, status, deceased_name as parties_summary, created_at FROM inheritance_fees
UNION ALL
SELECT id, 'sales' as record_type, registry_number, registry_book_type, inclusion_date, status, 'بيع وشراء' as parties_summary, created_at FROM sales_records
UNION ALL
SELECT id, 'gift' as record_type, registry_number, registry_book_type, inclusion_date, status, 'هبة / صدقة' as parties_summary, created_at FROM gift_records
UNION ALL
SELECT id, 'mortgage' as record_type, registry_number, registry_book_type, inclusion_date, status, 'رهن' as parties_summary, created_at FROM mortgage_records
UNION ALL
SELECT id, 'partition' as record_type, registry_number, registry_book_type, inclusion_date, status, 'مقاسمة' as parties_summary, created_at FROM partition_records
UNION ALL
SELECT id, 'proxy' as record_type, registry_number, registry_book_type, inclusion_date, status, 'توكيل' as parties_summary, created_at FROM proxy_records
UNION ALL
SELECT id, 'ownership' as record_type, registry_number, registry_book_type, inclusion_date, status, 'ملكية / حيازة' as parties_summary, created_at FROM ownership_records
UNION ALL
SELECT id, 'corporate' as record_type, registry_number, registry_book_type, inclusion_date, status, 'شخص معنوي' as parties_summary, created_at FROM corporate_records;
