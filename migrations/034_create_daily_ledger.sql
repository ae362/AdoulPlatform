-- Migration 034: Create Daily Ledger Table
CREATE TABLE IF NOT EXISTS daily_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number SERIAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    entry_time TEXT NOT NULL,
    family_name TEXT NOT NULL,
    personal_name TEXT NOT NULL,
    id_card TEXT,
    certificate_type TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'Original' or 'Copy'
    amount_received DECIMAL(12, 2) NOT NULL,
    receipt_number TEXT UNIQUE NOT NULL,
    copy_type TEXT, -- 'Normal', 'Executive', 'Conform'
    image_url TEXT,
    questions_responses JSONB DEFAULT '{}'::jsonb,
    is_correction BOOLEAN DEFAULT FALSE,
    original_id UUID REFERENCES daily_ledger(id),
    notes TEXT,
    user_id UUID -- Track which notary/clerk created it
);

-- Index for performance
CREATE INDEX idx_daily_ledger_date ON daily_ledger(created_at);
CREATE INDEX idx_daily_ledger_receipt ON daily_ledger(receipt_number);
