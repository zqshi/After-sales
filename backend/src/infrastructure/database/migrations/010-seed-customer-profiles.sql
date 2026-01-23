-- 010-seed-customer-profiles.sql
-- Seed additional customer profiles used by mock conversations

INSERT INTO customer_profiles (
    customer_id, name, company, tags, health_score, contact_info, sla_info, metrics
)
VALUES
('cust-003', '王五', '云科技有限公司', ARRAY['重点客户'], 78,
 '{"email": "wangwu@example.com", "phone": "13700137000"}'::jsonb,
 '{"responseTime": 45, "resolutionTime": 180, "serviceLevel": "gold"}'::jsonb,
 '{"totalOrders": 35, "totalRevenue": 260000, "satisfactionScore": 82}'::jsonb
)
ON CONFLICT (customer_id) DO NOTHING;
