-- ==================================================
-- 为Conversation表添加mode字段（可选方案）
-- 如果使用metadata存储则不需要此迁移
-- ==================================================

-- 添加mode字段
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'agent_auto';

-- 添加约束
ALTER TABLE conversations
ADD CONSTRAINT chk_conversation_mode
CHECK (mode IN ('agent_auto', 'agent_supervised', 'human_first'));

-- 添加索引（如果需要按模式查询）
CREATE INDEX IF NOT EXISTS idx_conversations_mode ON conversations(mode);

-- 注释
COMMENT ON COLUMN conversations.mode IS 'Agent处理模式：agent_auto=自动处理, agent_supervised=监督模式, human_first=人工优先';
