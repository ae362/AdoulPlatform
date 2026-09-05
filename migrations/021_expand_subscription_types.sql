-- Remove check constraint on subscription_type to allow more types
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_payments_subscription_type_check') THEN 
        ALTER TABLE subscription_payments DROP CONSTRAINT subscription_payments_subscription_type_check;
    END IF;
END $$;

-- Add comment to document new types
COMMENT ON COLUMN subscription_payments.subscription_type IS 'Allowed values: annual, affiliation, notebook, register, badge, stamps, ...';

-- Allow period_year to be null if it's not applicable (e.g. one-time affiliation)
ALTER TABLE subscription_payments ALTER COLUMN period_year DROP NOT NULL;

-- Allow due_date to be null 
ALTER TABLE subscription_payments ALTER COLUMN due_date DROP NOT NULL;
