-- Migration 035: Add Judge Authorization Fields to Daily Ledger
ALTER TABLE daily_ledger 
ADD COLUMN IF NOT EXISTS judge_auth_number TEXT,
ADD COLUMN IF NOT EXISTS judge_auth_date DATE;
