-- 011-seed-admin-credentials.sql
-- Seed demo admin credentials for演示

INSERT INTO users (
    id, email, phone, name, password_hash, password_salt, password_algo, password_iterations, role, status
)
VALUES (
    '2c8ce8e0-7f2f-4c56-9f5d-7fd0df4a6d91',
    'admin@kingsoft.com',
    NULL,
    '演示管理员',
    '3751fbad0d4e9c5a4be787bb6083f24542dff41f8510c141fde7a17ceb25d9f85c8015dd6790a4e6875443ba8d446274f12dbb4168a79891e0b5df8156da44ab',
    'b3629d6560b66a2e3760fab6910c33a6',
    'pbkdf2-sha512',
    120000,
    'admin',
    'active'
)
ON CONFLICT (email) DO NOTHING;
