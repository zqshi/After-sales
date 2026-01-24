# DDD架构改进 - 快速启动指南

## 🚀 立即开始

### Docker 一键启动（推荐）

```bash
./start-all.sh
```

或直接使用 Docker Compose：

```bash
docker compose up -d --build
```

---

## 📚 使用改进后的功能

### 使用智能对话分配

```typescript
import { ConversationAssignmentPolicyService } from '@domain/conversation/services/ConversationAssignmentPolicyService';

const service = new ConversationAssignmentPolicyService();

// 构建分配上下文
const context = {
  conversationId: 'conv-123',
  customerId: 'cust-456',
  customerTier: 'VIP',
  customerRiskLevel: 'low',
  conversationPriority: 'high',
  slaStatus: 'normal',
  channel: 'feishu',
};

// 候选客服列表
const candidates = [
  {
    agentId: 'agent-1',
    agentName: '张三',
    skillMatch: 0.9,
    workload: 60,
    averageQuality: 88,
    customerFamiliarity: 0.7,
    isOnline: true,
    averageResponseTime: 45,
  },
  // 更多候选...
];

// 选择最佳客服
const result = service.selectBestAgent(context, candidates);

console.log(`Selected Agent: ${result.selectedAgentId}`);
console.log(`Reason: ${result.reason}`);
console.log(`Score: ${result.score}`);
```

### 使用丰富的值对象方法

```typescript
import { Priority } from '@domain/requirement/value-objects/Priority';

const priority = Priority.create('medium');

// 业务判断
if (priority.isUrgent()) {
  // 执行紧急流程
}

// 优先级比较
const otherPriority = Priority.create('high');
if (priority.isHigherThan(otherPriority)) {
  // ...
}

// 优先级升级
const upgraded = priority.escalate(); // medium → high
```

### 使用领域模型的业务规则

```typescript
// ❌ 不要在Application层判断
if (priority === 'urgent' || priority === 'high') {
  // ...
}

// ✅ 使用领域模型的方法
const requirement = await requirementRepository.findById(id);
if (requirement.shouldAutoCreateTask()) {
  // 自动创建Task
}

if (requirement.needsCustomerCommunication()) {
  // 创建Conversation
}
```

---

## 🔍 监控和维护

### 检查死信队列

```typescript
import { OutboxEventBus } from './infrastructure/events/OutboxEventBus';

const outboxEventBus = new OutboxEventBus(AppDataSource);

// 获取死信事件
const deadLetterEvents = await outboxEventBus.getDeadLetterEvents();

if (deadLetterEvents.length > 0) {
  console.error(`⚠️ ${deadLetterEvents.length} events in dead letter queue!`);
  // 发送告警
}

// 手动重试
for (const event of deadLetterEvents) {
  await outboxEventBus.retryDeadLetterEvent(event.id);
}
```

### 定期清理已发布事件

添加到cron job或定时任务：

```typescript
// 每天清理30天前的已发布事件
const deletedCount = await outboxEventBus.cleanupPublishedEvents(30);
console.log(`Cleaned up ${deletedCount} published events`);
```

---

## 📖 参考文档

1. **Context Map**: `/backend/docs/architecture/ContextMap.md`
   - 限界上下文划分
   - 上下文映射关系
   - 集成策略

2. **改进总结**: `/DDD_IMPROVEMENT_SUMMARY.md`
   - 已完成改进项
   - 架构评分变化
   - 关键文件清单

3. **计划文档**: `/Users/zqs/.claude/plans/composed-leaping-turing.md`
   - DDD顶层架构设计
   - 改进路线图

---

## ⚠️ 注意事项

### 向后兼容性

1. **DomainEventEntity保留**: 继续用于事件溯源
2. **OutboxEventEntity新增**: 用于Outbox模式
3. **两者并存**: Repository同时保存两种事件

### 性能调优

1. **OutboxProcessor轮询间隔**: 默认5秒，可调整
2. **批次大小**: 默认100条，可根据负载调整
3. **并发处理**: 默认10个并发，可调整

### 测试建议

1. **单元测试**: 测试领域模型的业务方法
2. **集成测试**: 测试Outbox模式的事务性
3. **性能测试**: 测试OutboxProcessor的吞吐量

---

## 🎯 下一步

1. ✅ 运行迁移
2. ✅ 启动OutboxProcessor
3. ✅ 订阅事件处理器
4. ✅ 监控死信队列
5. ⏳ 实现SAGA协调器（下阶段）
6. ⏳ 补充防腐层（下阶段）

---

**有问题？** 查看 `DDD_IMPROVEMENT_SUMMARY.md` 获取详细信息。
