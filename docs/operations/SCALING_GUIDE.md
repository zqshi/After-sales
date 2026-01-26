# 扩缩容指南

> **文档版本**: 1.0
> **最后更新**: 2026-01-26

## 扩缩容策略

### 水平扩展（Horizontal Scaling）

**Backend服务**
```bash
# Docker Compose
docker-compose up --scale backend=3

# Kubernetes
kubectl scale deployment backend --replicas=3
```

**AgentScope服务**
```bash
kubectl scale deployment agentscope --replicas=2
```

### 垂直扩展（Vertical Scaling）

```yaml
# 增加资源限制
resources:
  limits:
    memory: "1Gi"  # 从512Mi增加到1Gi
    cpu: "1000m"   # 从500m增加到1000m
  requests:
    memory: "512Mi"
    cpu: "500m"
```

## 自动扩缩容（HPA）

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 数据库扩展

### 读写分离
```typescript
// 主库写入
const master = new DataSource({
  type: 'postgres',
  host: 'master.db.internal',
  replication: {
    master: {
      host: 'master.db.internal',
      port: 5432,
    },
    slaves: [
      { host: 'slave1.db.internal', port: 5432 },
      { host: 'slave2.db.internal', port: 5432 },
    ],
  },
});
```

### 连接池优化
```typescript
const dataSource = new DataSource({
  type: 'postgres',
  extra: {
    max: 20,  // 最大连接数
    min: 5,   // 最小连接数
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});
```

## 缓存策略

### Redis集群
```bash
# Redis Cluster配置
redis-cli --cluster create \
  10.0.1.1:6379 \
  10.0.1.2:6379 \
  10.0.1.3:6379 \
  --cluster-replicas 1
```

### 应用层缓存
```typescript
// 多级缓存
const cache = {
  // L1: 内存缓存（快速）
  memory: new LRUCache({ max: 1000 }),

  // L2: Redis缓存（共享）
  redis: redisClient,

  async get(key: string) {
    // 先查内存
    let value = this.memory.get(key);
    if (value) return value;

    // 再查Redis
    value = await this.redis.get(key);
    if (value) {
      this.memory.set(key, value);
      return value;
    }

    return null;
  },
};
```

## 负载均衡

### Nginx配置
```nginx
upstream backend {
    least_conn;  # 最少连接算法
    server backend1:3000 weight=3;
    server backend2:3000 weight=2;
    server backend3:3000 weight=1;

    keepalive 32;
}
```

## 扩容检查清单

- [ ] 监控指标正常
- [ ] 数据库连接池充足
- [ ] 缓存命中率正常
- [ ] 负载均衡配置正确
- [ ] 健康检查通过
- [ ] 日志正常输出
- [ ] 告警规则已更新

## 缩容注意事项

1. 检查当前负载
2. 逐步减少实例
3. 观察服务稳定性
4. 保留最小副本数（至少2个）

## 联系方式
- 运维团队: ops@company.com
