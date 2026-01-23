-- 008-add-customer-profile-columns.sql
-- Align customer_profiles columns with current entity

ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS insights JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interactions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS service_records JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commitments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_level VARCHAR(10) DEFAULT 'low';
