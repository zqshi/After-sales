-- 001-init-database.sql
-- 智能售后工作台 - 数据库初始化脚本
-- 创建日期: 2024-12-14

-- ==================================================
-- 1. 创建对话表（Conversations）
-- ==================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(50) NOT NULL,
    agent_id VARCHAR(50),
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    sla_status VARCHAR(20) DEFAULT 'normal',
    sla_deadline TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_conversation_status CHECK (status IN ('open', 'pending', 'closed')),
    CONSTRAINT chk_conversation_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT chk_sla_status CHECK (sla_status IN ('normal', 'warning', 'violated'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_sla_status ON conversations(sla_status);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);

-- 注释
COMMENT ON TABLE conversations IS '对话表 - 存储所有客户对话记录';
COMMENT ON COLUMN conversations.id IS '对话唯一标识';
COMMENT ON COLUMN conversations.customer_id IS '客户ID';
COMMENT ON COLUMN conversations.agent_id IS '客服ID';
COMMENT ON COLUMN conversations.channel IS '渠道: chat, email, phone, feishu';
COMMENT ON COLUMN conversations.status IS '状态: open(进行中), pending(待处理), closed(已关闭)';
COMMENT ON COLUMN conversations.priority IS '优先级: low, normal, high, urgent';
COMMENT ON COLUMN conversations.sla_status IS 'SLA状态: normal, warning, violated';
COMMENT ON COLUMN conversations.sla_deadline IS 'SLA截止时间';
COMMENT ON COLUMN conversations.metadata IS '扩展元数据（JSON格式）';

-- ==================================================
-- 2. 创建消息表（Messages）
-- ==================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id VARCHAR(50) NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_message_sender_type CHECK (sender_type IN ('agent', 'customer', 'system'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- 注释
COMMENT ON TABLE messages IS '消息表 - 存储对话中的所有消息';
COMMENT ON COLUMN messages.conversation_id IS '所属对话ID';
COMMENT ON COLUMN messages.sender_id IS '发送者ID（客服/客户）';
COMMENT ON COLUMN messages.sender_type IS '发送者类型: agent, customer, system';
COMMENT ON COLUMN messages.content IS '消息内容';
COMMENT ON COLUMN messages.content_type IS '内容类型: text, image, file, card';

-- ==================================================
-- 3. 创建客户画像表（Customer Profiles）
-- ==================================================

CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    health_score INTEGER DEFAULT 0,
    contact_info JSONB DEFAULT '{}'::jsonb,
    sla_info JSONB DEFAULT '{}'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_health_score CHECK (health_score >= 0 AND health_score <= 100)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_customer_profiles_customer_id ON customer_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_company ON customer_profiles(company);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_health_score ON customer_profiles(health_score);

-- 注释
COMMENT ON TABLE customer_profiles IS '客户画像表 - 存储客户详细信息';
COMMENT ON COLUMN customer_profiles.customer_id IS '客户ID（业务主键）';
COMMENT ON COLUMN customer_profiles.health_score IS '客户健康度评分（0-100）';
COMMENT ON COLUMN customer_profiles.contact_info IS '联系信息（email, phone等）';
COMMENT ON COLUMN customer_profiles.sla_info IS 'SLA承诺信息';
COMMENT ON COLUMN customer_profiles.metrics IS '客户指标（订单数、消费金额等）';

-- ==================================================
-- 4. 创建需求表（Requirements）
-- ==================================================

CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    source VARCHAR(50),
    created_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_requirement_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_requirement_status CHECK (status IN ('pending', 'approved', 'rejected', 'implemented'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_requirements_conversation ON requirements(conversation_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_category ON requirements(category);
CREATE INDEX IF NOT EXISTS idx_requirements_priority ON requirements(priority);

-- 注释
COMMENT ON TABLE requirements IS '需求表 - 存储客户需求';
COMMENT ON COLUMN requirements.conversation_id IS '关联的对话ID（可为空）';
COMMENT ON COLUMN requirements.category IS '需求分类: feature, bug, improvement, question';
COMMENT ON COLUMN requirements.status IS '状态: pending, approved, rejected, implemented';
COMMENT ON COLUMN requirements.source IS '来源: conversation, manual, api';

-- ==================================================
-- 5. 创建任务表（Tasks）
-- ==================================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assignee_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    quality_score INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_task_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT chk_task_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT chk_quality_score CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_conversation ON tasks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- 注释
COMMENT ON TABLE tasks IS '任务表 - 存储工作任务';
COMMENT ON COLUMN tasks.status IS '状态: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN tasks.quality_score IS '质检评分（0-100）';
COMMENT ON COLUMN tasks.estimated_hours IS '预估工时';
COMMENT ON COLUMN tasks.actual_hours IS '实际工时';

-- ==================================================
-- 6. 创建领域事件表（Domain Events）
-- ==================================================

CREATE TABLE IF NOT EXISTS domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL,
    CONSTRAINT chk_event_version CHECK (version > 0)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate ON domain_events(aggregate_id, version);
CREATE INDEX IF NOT EXISTS idx_domain_events_type ON domain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_occurred ON domain_events(occurred_at DESC);

-- 注释
COMMENT ON TABLE domain_events IS '领域事件表 - 事件溯源';
COMMENT ON COLUMN domain_events.aggregate_id IS '聚合根ID';
COMMENT ON COLUMN domain_events.aggregate_type IS '聚合根类型: Conversation, CustomerProfile等';
COMMENT ON COLUMN domain_events.event_type IS '事件类型: MessageSent, ConversationClosed等';
COMMENT ON COLUMN domain_events.event_data IS '事件数据（JSON格式）';
COMMENT ON COLUMN domain_events.version IS '事件版本号（用于并发控制）';

-- ==================================================
-- 7. 创建触发器（自动更新 updated_at）
-- ==================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建触发器
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_profiles_updated_at BEFORE UPDATE ON customer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- 8. 插入测试数据（可选）
-- ==================================================

-- 客户画像测试数据
INSERT INTO customer_profiles (customer_id, name, company, tags, health_score, contact_info, sla_info, metrics) VALUES
('cust-001', '张三', '科技有限公司', ARRAY['金牌客户', 'VIP'], 85,
 '{"email": "zhangsan@example.com", "phone": "13800138000"}'::jsonb,
 '{"responseTime": 30, "resolutionTime": 120}'::jsonb,
 '{"totalOrders": 50, "totalRevenue": 500000}'::jsonb),

('cust-002', '李四', '互联网公司', ARRAY['普通客户'], 60,
 '{"email": "lisi@example.com", "phone": "13900139000"}'::jsonb,
 '{"responseTime": 60, "resolutionTime": 240}'::jsonb,
 '{"totalOrders": 20, "totalRevenue": 100000}'::jsonb);

-- 对话测试数据
INSERT INTO conversations (id, customer_id, agent_id, channel, status, priority) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'cust-001', 'agent-001', 'chat', 'open', 'high'),
('550e8400-e29b-41d4-a716-446655440002', 'cust-002', 'agent-002', 'email', 'closed', 'normal');

-- 消息测试数据
INSERT INTO messages (conversation_id, sender_id, sender_type, content) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'cust-001', 'customer', '你好，我遇到了一个问题'),
('550e8400-e29b-41d4-a716-446655440001', 'agent-001', 'agent', '您好！很高兴为您服务，请问有什么可以帮您的？');

-- ==================================================
-- 完成初始化
-- ==================================================

-- 显示统计信息
DO $$
BEGIN
    RAISE NOTICE '数据库初始化完成！';
    RAISE NOTICE '表统计:';
    RAISE NOTICE '- conversations: % 条记录', (SELECT COUNT(*) FROM conversations);
    RAISE NOTICE '- messages: % 条记录', (SELECT COUNT(*) FROM messages);
    RAISE NOTICE '- customer_profiles: % 条记录', (SELECT COUNT(*) FROM customer_profiles);
    RAISE NOTICE '- requirements: % 条记录', (SELECT COUNT(*) FROM requirements);
    RAISE NOTICE '- tasks: % 条记录', (SELECT COUNT(*) FROM tasks);
    RAISE NOTICE '- domain_events: % 条记录', (SELECT COUNT(*) FROM domain_events);
END $$;
