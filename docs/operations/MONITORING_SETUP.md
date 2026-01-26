# 监控配置文档

> **文档版本**: 1.0
> **最后更新**: 2026-01-26

## 监控架构

```
应用 → Prometheus → Grafana → 告警
     → Loki → Grafana → 日志查询
     → Jaeger → 分布式追踪
```

## Prometheus配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:3000']

  - job_name: 'agentscope'
    static_configs:
      - targets: ['localhost:8000']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
```

## 关键指标

### 应用指标
- HTTP请求数、延迟、错误率
- 数据库查询性能
- Agent响应时间
- 队列长度

### 系统指标
- CPU、内存、磁盘使用率
- 网络流量
- 容器资源使用

### 业务指标
- 活跃对话数
- 任务完成率
- 质检评分
- 用户满意度

## Grafana仪表板

### 系统概览
- 请求QPS
- 响应时间P50/P95/P99
- 错误率
- 资源使用率

### 业务监控
- 对话创建趋势
- Agent使用统计
- 任务状态分布
- 质检评分趋势

## 告警规则

```yaml
# alerts.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "High response time detected"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "Database is down"
```

## 日志聚合（Loki）

```yaml
# loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h
```

## 分布式追踪（Jaeger）

```typescript
// 集成OpenTelemetry
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new NodeTracerProvider();
const exporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();
```

## 健康检查

```typescript
// /health endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      agentscope: await checkAgentScope(),
    },
  };

  const allHealthy = Object.values(health.checks).every(c => c === 'ok');
  res.status(allHealthy ? 200 : 503).json(health);
});
```

## 联系方式
- 运维团队: ops@company.com
- 告警通知: #alerts (Slack)
