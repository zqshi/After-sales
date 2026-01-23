-- 011-create-monitoring-alerts.sql
-- Monitoring alerts table

CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    source VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_level ON monitoring_alerts(level);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created ON monitoring_alerts(created_at DESC);

CREATE TRIGGER update_monitoring_alerts_updated_at BEFORE UPDATE ON monitoring_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE monitoring_alerts IS '监控告警事件';
