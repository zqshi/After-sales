-- 009-add-requirement-customer-id.sql
-- Add customer_id to requirements

ALTER TABLE requirements
  ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50);
