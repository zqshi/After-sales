-- 004-update-requirement-status.sql
-- Align requirement status values with domain model

ALTER TABLE requirements DROP CONSTRAINT IF EXISTS chk_requirement_status;

ALTER TABLE requirements
  ADD CONSTRAINT chk_requirement_status
  CHECK (status IN ('pending', 'approved', 'resolved', 'ignored', 'cancelled'));
