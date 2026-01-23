-- 007-align-users-schema.sql
-- Align legacy users table with current auth schema

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_salt VARCHAR(100),
  ADD COLUMN IF NOT EXISTS password_algo VARCHAR(50) DEFAULT 'pbkdf2-sha512',
  ADD COLUMN IF NOT EXISTS password_iterations INTEGER DEFAULT 120000,
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

UPDATE users
SET
  password_salt = COALESCE(password_salt, ''),
  password_algo = COALESCE(password_algo, 'pbkdf2-sha512'),
  password_iterations = COALESCE(password_iterations, 120000),
  role = COALESCE(role, 'agent'),
  status = COALESCE(status, CASE WHEN is_active THEN 'active' ELSE 'disabled' END),
  metadata = COALESCE(metadata, '{}'::jsonb);
