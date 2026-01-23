-- 006-add-user-phone.sql
-- Ensure users.phone exists for older databases

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
