-- Demo account seed
-- Email: demo@aftersales.io
-- Password: Demo@1234

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (
    id, email, phone, name, password_hash, password_salt, password_algo, password_iterations, role, status
)
VALUES (
    '7d4d9b3b-3b8a-4d23-9f1f-30f6f4aa4bb2',
    'demo@aftersales.io',
    NULL,
    '演示账号',
    '3b6195e73167ceee8cddd38e49c54e4dd94e107c04621d10e445e7d34889054ac98a1d505d2b4c10ee11d611ee4eea77559f5f759d9a39b8ec9fd29c6c2ad777',
    '4f709cfff7d5aaae128742c7b507e1f5',
    'pbkdf2-sha512',
    120000,
    'admin',
    'active'
)
ON CONFLICT (email) DO UPDATE
SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  password_hash = EXCLUDED.password_hash,
  password_salt = EXCLUDED.password_salt,
  password_algo = EXCLUDED.password_algo,
  password_iterations = EXCLUDED.password_iterations;

-- Test account seed
-- Email: admin@kingsoft.com
-- Password: Admin123456

INSERT INTO users (
    id, email, phone, name, password_hash, password_salt, password_algo, password_iterations, role, status
)
VALUES (
    '3cfe000b-8d7e-4839-ad22-61b2f89f4a83',
    'admin@kingsoft.com',
    NULL,
    '测试账号',
    'a0728e6407ffad0e83cd99d467aaa5ffea54ed6d7335417c7fd4305da4fd75d4a57f4a647e9653daa722cf08460394228f9ec3e9dd0633f61330decc42156908',
    '5dce5e943231b1b196dbb3dee40ccaa0',
    'pbkdf2-sha512',
    120000,
    'admin',
    'active'
)
ON CONFLICT (email) DO UPDATE
SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  password_hash = EXCLUDED.password_hash,
  password_salt = EXCLUDED.password_salt,
  password_algo = EXCLUDED.password_algo,
  password_iterations = EXCLUDED.password_iterations;
