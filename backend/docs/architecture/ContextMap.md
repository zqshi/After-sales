# Context Map - 智能售后工作台限界上下文映射

## 文档概述

本文档定义了智能售后工作台系统中各个限界上下文（Bounded Context）之间的关系和交互模式，遵循DDD（领域驱动设计）战略设计原则。

**更新时间**: 2026-01-14
**版本**: v1.0

---

## 一、限界上下文清单

### 1.1 核心域（Core Domain）

#### Conversation Context（对话上下文）
- **职责**: 管理客户与客服的对话生命周期
- **聚合根**: Conversation, Message
- **核心价值**: AI辅助对话、智能分配、客户等级管理
- **团队**: 核心团队
- **代码路径**: `/backend/src/domain/conversation/`

#### Customer Context（客户上下文）
- **职责**: 管理客户360°画像、风险评估、互动历史
- **聚合根**: CustomerProfile
- **核心价值**: 客户洞察、风险预警、个性化服务
- **团队**: 核心团队
- **代码路径**: `/backend/src/domain/customer/`

### 1.2 支撑域（Supporting Subdomain）

#### Task Context（任务上下文）
- **职责**: 管理工单/任务生命周期
- **聚合根**: Task
- **核心价值**: 任务跟踪、质量评分、协同管理
- **团队**: 支撑团队A
- **代码路径**: `/backend/src/domain/task/`

#### Requirement Context（需求上下文）
- **职责**: 需求采集、优先级评估、需求跟踪
- **聚合根**: Requirement
- **核心价值**: 需求管理、自动化流转
- **团队**: 支撑团队A
- **代码路径**: `/backend/src/domain/requirement/`

#### Quality Context（质检上下文）
- **职责**: 质量评分、违规检测、质检报告
- **聚合根**: QualityInspection（待实现）
- **核心价值**: 质量管控、服务改进
- **团队**: 支撑团队B
- **代码路径**: `/backend/src/domain/quality/`（待创建）

### 1.3 通用域（Generic Subdomain）

#### Knowledge Context（知识库上下文）
- **职责**: 知识管理、语义检索、智能推荐
- **聚合根**: KnowledgeItem
- **核心价值**: 知识沉淀、辅助决策
- **团队**: 支撑团队B
- **代码路径**: `/backend/src/domain/knowledge/`
- **建议**: 考虑集成第三方知识库SaaS（如语雀、Notion API）

#### AI Analysis Context（AI分析上下文）
- **职责**: 情感分析、意图识别、回复生成
- **聚合根**: AIAnalysis（待实现）
- **核心价值**: AI辅助决策
- **团队**: AI团队
- **代码路径**: `/backend/src/domain/ai-analysis/`（待创建）

#### System Context（系统管理上下文）
- **职责**: 用户管理、权限控制、日志审计
- **聚合根**: User, Role（待实现）
- **核心价值**: 系统支撑
- **团队**: 平台团队
- **代码路径**: `/backend/src/domain/system/`（待创建）

---

## 二、上下文映射关系

### 2.1 关系图

```
┌────────────────────────────────────────────────────────────────────┐
│                        Context Map Overview                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Conversation Context] ──OHS──→ [Customer Context]                │
│         U                              D                           │
│         │                                                           │
│         │ (1) ConversationCreatedEvent                             │
│         │     → 更新InteractionHistory                             │
│         │                                                           │
│         │ (2) MessageSentEvent                                     │
│         │     → 更新LastInteractionAt                              │
│         │                                                           │
│         ▼                                                           │
│  [Requirement Context] ──Conformist──→ [Task Context]              │
│         U                                  D                        │
│         │                                                           │
│         │ (3) RequirementCreatedEvent                              │
│         │     → 自动创建Task (高优先级需求)                         │
│         │                                                           │
│         │ (4) RequirementStatusChangedEvent                        │
│         │     → 更新Task状态                                        │
│         │                                                           │
│         ▼                                                           │
│  [Task Context] ──Published Language──→ [Conversation Context]     │
│         U                                      D                    │
│         │                                                           │
│         │ (5) TaskCompletedEvent                                   │
│         │     → 检查所有Task是否完成                                │
│         │     → 触发ConversationReadyToCloseEvent                  │
│         │                                                           │
│         ▼                                                           │
│  [Quality Context] ──Separate Ways── [Conversation Context]        │
│                                                                     │
│         │ 无直接依赖，通过Application层协调                         │
│         │ ConversationClosedEvent → 触发质检流程                   │
│                                                                     │
│  [Knowledge Context] ──ACL──→ [Conversation Context]               │
│         U                          D                                │
│         │                                                           │
│         │ 防腐层: KnowledgeAdapter                                 │
│         │ Conversation查询Knowledge推荐                             │
│         │ 不直接依赖Knowledge领域模型                               │
│                                                                     │
│  [AI Analysis Context] ──Shared Kernel── [Conversation Context]    │
│                                                                     │
│         │ 共享：Sentiment值对象、Intent值对象                       │
│         │ Conversation使用AI分析结果                                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

**图例**:
- `U (Upstream)`: 上游，提供服务的一方
- `D (Downstream)`: 下游，消费服务的一方
- `OHS (Open Host Service)`: 开放主机服务
- `ACL (Anti-Corruption Layer)`: 防腐层
- `Conformist`: 遵奉者模式
- `Separate Ways`: 各行其道
- `Shared Kernel`: 共享内核

---

## 三、关系模式详解

### 3.1 Open Host Service（开放主机服务）

#### Conversation Context → Customer Context

**关系类型**: OHS + Published Language

**职责**:
- Conversation作为上游，对外发布领域事件
- Customer作为下游，订阅事件并更新互动历史

**已发布的事件**:
```typescript
// 1. 对话创建事件
ConversationCreatedEvent {
  conversationId: string;
  customerId: string;
  channel: string;
  createdAt: Date;
}

// 2. 消息发送事件
MessageSentEvent {
  conversationId: string;
  messageId: string;
  customerId: string;
  content: string;
  senderType: 'customer' | 'agent';
  sentAt: Date;
}

// 3. 对话关闭事件
ConversationClosedEvent {
  conversationId: string;
  customerId: string;
  closedAt: Date;
  duration: number;
}
```

**Customer的订阅处理**:
```typescript
// backend/src/application/event-handlers/ConversationEventsHandler.ts
class ConversationEventsHandler {
  async handleConversationCreated(event: ConversationCreatedEvent) {
    const customer = await this.customerRepo.findById(event.customerId);
    customer.addInteraction({
      type: 'conversation',
      conversationId: event.conversationId,
      occurredAt: event.createdAt,
    });
    await this.customerRepo.save(customer);
  }
}
```

**防腐层**: 暂无（两个上下文模型兼容）

---

### 3.2 Conformist（遵奉者模式）

#### Requirement Context → Task Context

**关系类型**: Conformist

**职责**:
- Requirement作为上游，发布需求创建事件
- Task作为下游，遵循Requirement的模型和规则

**事件流转**:
```typescript
// 需求创建 → 任务自动生成
RequirementCreatedEvent {
  requirementId: string;
  customerId: string;
  conversationId?: string;
  title: string;
  category: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  source: 'manual' | 'conversation' | 'ticket';
}

// Task订阅处理
class RequirementCreatedEventHandler {
  async handle(event: RequirementCreatedEvent) {
    // 规则: 高优先级需求自动创建Task
    if (event.priority === 'urgent' || event.priority === 'high') {
      await this.createTaskUseCase.execute({
        title: `处理需求: ${event.title}`,
        requirementId: event.requirementId,
        conversationId: event.conversationId,
        priority: event.priority,
      });
    }
  }
}
```

**遵奉规则**:
- Task的priority遵循Requirement的priority枚举
- Task的生命周期受Requirement状态影响

**改进建议**:
- 当前直接使用字符串，建议引入共享的Priority值对象

---

### 3.3 Published Language（发布语言）

#### Task Context → Conversation Context

**关系类型**: Published Language

**职责**:
- Task发布TaskCompletedEvent
- Conversation订阅并检查是否所有Task完成

**事件流转**:
```typescript
// Task完成事件
TaskCompletedEvent {
  taskId: string;
  conversationId: string;
  requirementId?: string;
  completedAt: Date;
  qualityScore: number;
}

// Conversation订阅处理
class TaskCompletedEventHandler {
  async handle(event: TaskCompletedEvent) {
    // 获取该对话的所有Task
    const allTasks = await this.taskRepo.findByConversationId(
      event.conversationId
    );

    // 检查是否全部完成
    const allCompleted = allTasks.every(t => t.status === 'completed');

    if (allCompleted) {
      const conversation = await this.conversationRepo.findById(
        event.conversationId
      );

      // 发布对话可关闭事件
      conversation.markReadyToClose();
      await this.conversationRepo.save(conversation);
    }
  }
}
```

**发布语言规范**:
- 所有事件使用ISO 8601格式的时间戳
- 使用UUID作为ID
- 事件命名使用过去式（xxxEvent）

---

### 3.4 Anti-Corruption Layer（防腐层）

#### Knowledge Context → Conversation Context

**关系类型**: ACL + Customer/Supplier

**职责**:
- Knowledge提供知识检索服务
- Conversation通过防腐层调用，避免直接依赖Knowledge模型

**防腐层设计**:

```typescript
// backend/src/domain/conversation/anti-corruption/KnowledgeAdapter.ts
export interface KnowledgeRecommendation {
  title: string;
  summary: string;
  relevanceScore: number;
  knowledgeId: string;
}

export class KnowledgeAdapter {
  constructor(
    private readonly knowledgeRepo: IKnowledgeRepository
  ) {}

  /**
   * 为对话推荐知识
   *
   * 隔离Knowledge Context的复杂模型
   */
  async recommendForConversation(
    conversationId: string,
    query: string
  ): Promise<KnowledgeRecommendation[]> {
    // 调用Knowledge Context的查询接口
    const knowledgeItems = await this.knowledgeRepo.search(query, { limit: 5 });

    // 转换为Conversation Context的模型
    return knowledgeItems.map(item => ({
      title: item.title,
      summary: this.extractSummary(item.content),
      relevanceScore: this.calculateRelevance(item, query),
      knowledgeId: item.id,
    }));
  }

  private extractSummary(content: string): string {
    // 截取前200字符作为摘要
    return content.substring(0, 200) + '...';
  }

  private calculateRelevance(item: any, query: string): number {
    // 简单相关性计算
    const titleMatch = item.title.toLowerCase().includes(query.toLowerCase());
    const contentMatch = item.content.toLowerCase().includes(query.toLowerCase());

    return (titleMatch ? 0.6 : 0) + (contentMatch ? 0.4 : 0);
  }
}
```

**防腐层价值**:
1. **隔离变化**: Knowledge模型变化不影响Conversation
2. **简化模型**: Conversation只看到KnowledgeRecommendation，不需要了解KnowledgeItem的完整结构
3. **技术隔离**: 如果未来Knowledge换成第三方SaaS，只需修改Adapter

**使用示例**:
```typescript
// backend/src/application/use-cases/GetConversationWithRecommendationsUseCase.ts
class GetConversationWithRecommendationsUseCase {
  constructor(
    private readonly conversationRepo: IConversationRepository,
    private readonly knowledgeAdapter: KnowledgeAdapter
  ) {}

  async execute(request: { conversationId: string }) {
    const conversation = await this.conversationRepo.findById(request.conversationId);

    // 通过防腐层获取推荐
    const recommendations = await this.knowledgeAdapter.recommendForConversation(
      conversation.id,
      conversation.getLatestMessage().content
    );

    return {
      conversation,
      recommendations,
    };
  }
}
```

---

### 3.5 Separate Ways（各行其道）

#### Quality Context ↔ Conversation Context

**关系类型**: Separate Ways

**职责**:
- 两个上下文独立演进
- 不直接依赖对方的领域模型
- 通过Application层协调

**交互模式**:
```typescript
// Application层协调（非领域层）
class ConversationClosedEventHandler {
  async handle(event: ConversationClosedEvent) {
    // 异步触发质检流程
    await this.qualityInspectionService.inspectConversation({
      conversationId: event.conversationId,
      customerId: event.customerId,
      closedAt: event.closedAt,
    });
  }
}
```

**为什么选择Separate Ways**:
1. Quality和Conversation的业务规则完全独立
2. 质检可以独立演进，不影响对话流程
3. 未来可能外包给第三方质检服务

---

### 3.6 Shared Kernel（共享内核）

#### AI Analysis Context ↔ Conversation Context

**关系类型**: Shared Kernel

**职责**:
- 共享部分领域模型（Sentiment、Intent等值对象）
- 两个团队需要协调变更

**共享的值对象**:
```typescript
// backend/src/domain/shared/Sentiment.ts
export class Sentiment extends ValueObject<{
  value: 'positive' | 'neutral' | 'negative';
  score: number; // 0-1
}> {
  isNegative(): boolean {
    return this.props.value === 'negative';
  }

  isHighRisk(): boolean {
    return this.props.value === 'negative' && this.props.score < 0.3;
  }
}
```

**共享风险**:
- Sentiment变更需要AI Analysis和Conversation团队共同评审
- 建议：限制共享内核的大小，只共享稳定的核心概念

**管理原则**:
1. 共享内核放在 `/backend/src/domain/shared/`
2. 变更需要双方团队批准
3. 定期评审，考虑是否应该解耦

---

## 四、集成策略

### 4.1 事件驱动集成（首选）

**适用场景**: 跨上下文的异步协作

**技术实现**:
- 使用Outbox模式确保事件最终一致性
- OutboxEventBus + OutboxProcessor
- 事件持久化到 `outbox_events` 表

**优势**:
- 解耦：上下文之间松耦合
- 可靠：事件持久化，支持重试
- 可扩展：易于添加新的订阅者

**示例**:
```typescript
// 发布方（Requirement Context）
requirement.create(...);
const events = requirement.getUncommittedEvents(); // RequirementCreatedEvent
await requirementRepo.save(requirement); // 保存到outbox_events表

// 订阅方（Task Context）
eventBus.subscribe('RequirementCreatedEvent', async (event) => {
  // 处理事件
});
```

### 4.2 防腐层集成（推荐）

**适用场景**: 需要查询外部上下文数据

**技术实现**:
- 创建Adapter隔离外部模型
- 使用简化的DTO传递数据

**优势**:
- 隔离变化：外部模型变化不影响内部
- 简化模型：只暴露必要的数据

**示例**: 见3.4节的KnowledgeAdapter

### 4.3 直接API调用（谨慎使用）

**适用场景**: 同步查询，对一致性要求高

**技术实现**:
- Application层直接调用Use Case
- 不跨越领域边界

**风险**:
- 耦合度高
- 同步调用可能影响性能

**建议**: 尽量使用事件驱动或防腐层

---

## 五、上下文边界保护

### 5.1 边界规则

1. **Domain层规则**:
   - ✅ 允许：依赖同上下文内的其他Domain对象
   - ✅ 允许：依赖 `/domain/shared/` 中的共享内核
   - ❌ 禁止：依赖其他上下文的Domain对象
   - ❌ 禁止：依赖Application或Infrastructure层

2. **Application层规则**:
   - ✅ 允许：协调多个上下文的Use Case
   - ✅ 允许：使用防腐层Adapter
   - ✅ 允许：订阅外部上下文的事件
   - ❌ 禁止：直接调用外部上下文的Domain对象

3. **Infrastructure层规则**:
   - ✅ 允许：实现Repository接口
   - ✅ 允许：实现EventBus、Adapter等基础设施
   - ❌ 禁止：包含业务逻辑

### 5.2 依赖检查工具

**建议集成**:
```bash
# 使用dependency-cruiser检查依赖违规
npm install --save-dev dependency-cruiser

# 配置规则
# .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'domain-no-cross-context',
      from: { path: 'src/domain/conversation' },
      to: { path: 'src/domain/customer' },
      comment: 'Conversation不能直接依赖Customer Domain'
    }
  ]
};
```

---

## 六、演进路线图

### 6.1 当前状态

| 关系 | 实现状态 | 防腐层 | 评分 |
|-----|---------|--------|------|
| Conversation → Customer | ✅ 事件驱动 | ❌ 无 | 80% |
| Requirement → Task | ✅ 事件驱动 | ❌ 无 | 85% |
| Task → Conversation | ✅ 事件驱动 | ❌ 无 | 85% |
| Knowledge → Conversation | ⚠️ 直接依赖 | ❌ 无 | 50% |
| Quality → Conversation | ⚠️ 未实现 | ❌ 无 | 20% |

### 6.2 改进计划

#### Phase 1（1周内）- P0优先级
1. ✅ 实现Outbox模式
2. [ ] 创建KnowledgeAdapter防腐层
3. [ ] 补充CustomerAdapter防腐层

#### Phase 2（1月内）- P1优先级
4. [ ] 实现Quality Context
5. [ ] 添加CustomerRiskEscalatedEvent订阅
6. [ ] 完善SAGA协调器

#### Phase 3（季度内）- P2优先级
7. [ ] 添加Context间依赖检查CI
8. [ ] 实现AI Analysis Context
9. [ ] 评估Knowledge Context外包可能性

---

## 七、附录

### 7.1 关键文件路径

```
backend/src/
├── domain/
│   ├── conversation/
│   │   ├── models/Conversation.ts
│   │   ├── events/*.ts
│   │   ├── repositories/IConversationRepository.ts
│   │   └── anti-corruption/
│   │       └── KnowledgeAdapter.ts (待创建)
│   ├── customer/
│   │   ├── models/CustomerProfile.ts
│   │   └── events/*.ts
│   ├── task/
│   │   ├── models/Task.ts
│   │   └── events/*.ts
│   ├── requirement/
│   │   ├── models/Requirement.ts
│   │   └── events/*.ts
│   └── shared/
│       ├── Sentiment.ts (待创建)
│       └── Intent.ts (待创建)
├── application/
│   └── event-handlers/
│       ├── RequirementCreatedEventHandler.ts
│       ├── TaskCompletedEventHandler.ts
│       └── ConversationEventsHandler.ts (待创建)
└── infrastructure/
    └── events/
        ├── OutboxEventBus.ts ✅
        └── OutboxProcessor.ts ✅
```

### 7.2 参考资料

- 《实现领域驱动设计》- Vaughn Vernon，第3章「上下文映射」
- 《领域驱动设计》- Eric Evans，第14章「维护模型的完整性」
- DDD Reference: http://domainlanguage.com/ddd/reference/

---

**维护者**: DDD架构团队
**审阅周期**: 每季度
**下次评审**: 2026-04-14
