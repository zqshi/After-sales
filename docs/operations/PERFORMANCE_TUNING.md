# 性能调优手册

> **文档版本**: 1.0
> **最后更新**: 2026-01-26

## 性能基准

### 目标指标
- API响应时间 P95 < 500ms
- 数据库查询 P95 < 100ms
- Agent响应时间 P95 < 2s
- 并发用户数 > 1000
- QPS > 500

## Backend优化

### 1. 数据库查询优化

```typescript
// ❌ N+1查询问题
const conversations = await conversationRepo.findAll();
for (const conv of conversations) {
  conv.messages = await messageRepo.findByConversationId(conv.id);
}

// ✅ 使用JOIN一次查询
const conversations = await conversationRepo
  .createQueryBuilder('conv')
  .leftJoinAndSelect('conv.messages', 'msg')
  .getMany();
```

### 2. 添加索引

```sql
-- 常用查询字段添加索引
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- 复合索引
CREATE INDEX idx_conversations_customer_status 
ON conversations(customer_id, status);
```

### 3. 连接池优化

```typescript
const dataSource = new DataSource({
  type: 'postgres',
  extra: {
    max: 20,  // 根据负载调整
    min: 5,
    idleTimeoutMillis: 30000,
  },
});
```

### 4. 缓存策略

```typescript
// 缓存热点数据
const getCustomerProfile = async (customerId: string) => {
  const cacheKey = `customer:${customerId}`;

  // 先查缓存
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 查数据库
  const profile = await customerRepo.findById(customerId);

  // 写入缓存（5分钟过期）
  await redis.setex(cacheKey, 300, JSON.stringify(profile));

  return profile;
};
```

### 5. 异步处理

```typescript
// 使用队列处理耗时任务
import Bull from 'bull';

const qualityInspectionQueue = new Bull('quality-inspection', {
  redis: { host: 'localhost', port: 6379 },
});

// 异步触发质检
qualityInspectionQueue.add({
  conversationId: 'conv-001',
});

// 处理队列
qualityInspectionQueue.process(async (job) => {
  await performQualityInspection(job.data.conversationId);
});
```

## 前端优化

### 1. 代码分割

```typescript
// 路由懒加载
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Conversations = lazy(() => import('./pages/Conversations'));
```

### 2. 虚拟滚动

```typescript
// 大列表使用虚拟滚动
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={conversations.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <ConversationItem data={conversations[index]} />
    </div>
  )}
</FixedSizeList>
```

### 3. 防抖节流

```typescript
// 搜索输入防抖
const debouncedSearch = debounce((query: string) => {
  searchConversations(query);
}, 300);
```

## 数据库优化

### 1. 查询优化

```sql
-- 使用EXPLAIN分析查询
EXPLAIN ANALYZE
SELECT * FROM conversations
WHERE customer_id = 'customer-001'
AND status = 'open';

-- 避免SELECT *
SELECT id, customer_id, status, created_at
FROM conversations
WHERE customer_id = 'customer-001';
```

### 2. 分区表

```sql
-- 按时间分区
CREATE TABLE conversations_2026_01 PARTITION OF conversations
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### 3. 物化视图

```sql
-- 创建物化视图加速统计查询
CREATE MATERIALIZED VIEW conversation_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_conversations,
  AVG(EXTRACT(EPOCH FROM (closed_at - created_at))) as avg_duration
FROM conversations
WHERE closed_at IS NOT NULL
GROUP BY DATE(created_at);

-- 定期刷新
REFRESH MATERIALIZED VIEW conversation_stats;
```

## Redis优化

### 1. 数据结构选择

```typescript
// 使用Hash存储对象
await redis.hset('customer:001', {
  name: 'John',
  email: 'john@example.com',
});

// 使用Sorted Set存储排行榜
await redis.zadd('leaderboard', 100, 'user1');
```

### 2. 过期策略

```typescript
// 设置合理的过期时间
await redis.setex('session:abc', 3600, sessionData);  // 1小时
await redis.setex('cache:data', 300, cacheData);      // 5分钟
```

## 网络优化

### 1. HTTP/2

```nginx
# 启用HTTP/2
listen 443 ssl http2;
```

### 2. Gzip压缩

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### 3. CDN加速

```typescript
// 静态资源使用CDN
const CDN_URL = 'https://cdn.example.com';
<img src={`${CDN_URL}/images/logo.png`} />
```

## 监控与分析

### 1. 性能监控

```typescript
// 记录慢查询
const startTime = Date.now();
const result = await query();
const duration = Date.now() - startTime;

if (duration > 1000) {
  logger.warn('Slow query detected', { duration, query });
}
```

### 2. APM工具

- New Relic
- Datadog
- Elastic APM

## 性能测试

### 压力测试

```bash
# 使用Apache Bench
ab -n 10000 -c 100 http://localhost:3000/api/conversations

# 使用k6
k6 run --vus 100 --duration 30s load-test.js
```

### 基准测试

```typescript
// 使用benchmark.js
import Benchmark from 'benchmark';

const suite = new Benchmark.Suite;

suite
  .add('Method A', () => {
    // 测试代码A
  })
  .add('Method B', () => {
    // 测试代码B
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run();
```

## 优化检查清单

- [ ] 数据库查询已优化
- [ ] 索引已添加
- [ ] 缓存策略已实施
- [ ] 异步处理已使用
- [ ] 前端代码已分割
- [ ] 静态资源已压缩
- [ ] CDN已配置
- [ ] 监控已启用
- [ ] 性能测试已通过

## 联系方式
- 性能优化团队: performance@company.com
