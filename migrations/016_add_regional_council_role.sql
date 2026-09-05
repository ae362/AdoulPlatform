-- Add the Regional Adoul Council role to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'regional_adoul_council';
