-- 003-create-users.sql
-- 用户与认证体系

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    password_salt VARCHAR(100) NOT NULL,
    password_algo VARCHAR(50) NOT NULL DEFAULT 'pbkdf2-sha512',
    password_iterations INTEGER NOT NULL DEFAULT 120000,
    role VARCHAR(20) NOT NULL DEFAULT 'agent',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_user_status CHECK (status IN ('active', 'disabled', 'locked'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMENT ON TABLE users IS '用户账号表';
COMMENT ON COLUMN users.role IS '角色: agent, admin, manager';
COMMENT ON COLUMN users.status IS '状态: active, disabled, locked';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
ON CONFLICT (email) DO NOTHING;
