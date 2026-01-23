-- 013-create-roles.sql
-- Role-based access control roles

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(200),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_key ON roles(key);

COMMENT ON TABLE roles IS 'RBAC角色表';
COMMENT ON COLUMN roles.key IS '角色标识，用于用户角色字段关联';
COMMENT ON COLUMN roles.permissions IS '角色权限列表';

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO roles (key, name, description, permissions, is_system, status)
VALUES
  (
    'admin',
    '管理员',
    '全局管理与配置',
    '[
      "customers.read",
      "customers.write",
      "requirements.read",
      "requirements.write",
      "requirements.delete",
      "tasks.read",
      "tasks.write",
      "tasks.assign",
      "tasks.complete",
      "knowledge.read",
      "knowledge.write",
      "conversations.read",
      "conversations.write",
      "im.read",
      "im.write",
      "ai.use",
      "audit.read",
      "audit.write",
      "monitoring.read",
      "monitoring.write",
      "session.read",
      "session.write"
    ]'::jsonb,
    TRUE,
    'active'
  ),
  (
    'manager',
    '主管',
    '运营与任务管理',
    '[
      "customers.read",
      "requirements.read",
      "requirements.write",
      "tasks.read",
      "tasks.write",
      "tasks.assign",
      "tasks.complete",
      "knowledge.read",
      "conversations.read",
      "conversations.write",
      "im.read",
      "im.write",
      "ai.use",
      "audit.read",
      "monitoring.read",
      "session.read"
    ]'::jsonb,
    TRUE,
    'active'
  ),
  (
    'agent',
    '客服',
    '一线客服',
    '[
      "customers.read",
      "requirements.read",
      "requirements.write",
      "tasks.read",
      "tasks.write",
      "knowledge.read",
      "conversations.read",
      "conversations.write",
      "im.read",
      "im.write",
      "ai.use",
      "session.read"
    ]'::jsonb,
    TRUE,
    'active'
  )
ON CONFLICT (key) DO NOTHING;
