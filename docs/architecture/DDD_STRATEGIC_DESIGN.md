# DDD战略设计文档

## 1. 业务域分析

### 1.1 核心域（Core Domain）
智能售后工作台的核心竞争力在于：
- **多渠道对话的统一管理和智能分析**
- **客户360度画像的实时构建**
- **AI驱动的自动化决策**

### 1.2 支撑域（Supporting Domain）
- 知识库管理
- 权限与审计
- 通知系统

### 1.3 通用域（Generic Domain）
- 用户认证
- 文件存储
- 日志监控

## 2. 限界上下文识别（Bounded Context）

### 2.1 对话管理上下文（Conversation Context）

**职责**：
- 多渠道消息接入（飞书、企业QQ、微信）
- 对话历史管理
- 消息实时推送
- 对话状态追踪

**领域模型**：
- 聚合根：`Conversation`（对话）
- 实体：`Message`（消息）、`Channel`（渠道）
- 值对象：`MessageContent`（消息内容）、`Participant`（参与者）

**关键业务规则**：
- 一个对话可包含多条消息
- 消息必须关联到对话和发送者
- SLA状态自动计算
- 支持内部备注（对客户不可见）

### 2.2 客户画像上下文（Customer Profile Context）

**职责**：
- 客户基本信息管理
- CRM数据聚合
- SLA合同信息
- 互动历史追踪
- 承诺与服务记录

**领域模型**：
- 聚合根：`CustomerProfile`（客户画像）
- 实体：`Contract`（合同）、`ServiceRecord`（服务记录）、`Commitment`（承诺）
- 值对象：`ContactInfo`（联系方式）、`SLAInfo`（SLA信息）、`Metrics`（业务指标）

**关键业务规则**：
- 客户画像由多个数据源聚合而成
- SLA状态根据合同自动判断
- 承诺进度自动计算
- 风险等级根据多维度评估

### 2.3 需求采集上下文（Requirement Context）

**职责**：
- 从对话中自动识别需求
- 需求卡片管理
- 需求优先级评估
- 需求统计与分析

**领域模型**：
- 聚合根：`Requirement`（需求）
- 值对象：`RequirementStatus`（需求状态）、`Priority`（优先级）
- 领域服务：`RequirementDetector`（需求识别服务）

**关键业务规则**：
- 需求可以手动创建或自动识别
- 需求状态流转：未处理 → 处理中 → 已完成 → 已忽略
- 优先级可以调整
- 支持批量操作

### 2.4 任务与质检上下文（Task & Quality Context）

**职责**：
- 任务创建与分配
- 质量评分
- AI辅助建议
- 任务流转管理

**领域模型**：
- 聚合根：`Task`（任务）、`QualityInspection`（质检）
- 实体：`TaskAction`（任务操作）、`QualityDimension`（质量维度）
- 值对象：`TaskStatus`（任务状态）、`QualityScore`（质量评分）

**关键业务规则**：
- 质检必须关联到对话
- 任务可以由质检自动生成
- 质量评分包含多个维度
- 任务状态机：待处理 → 进行中 → 已完成

### 2.5 AI分析上下文（AI Analysis Context）

**职责**：
- 对话情感分析
- 意图识别
- 解决方案推荐
- 自动化任务生成

**领域模型**：
- 聚合根：`AnalysisResult`（分析结果）
- 实体：`Solution`（解决方案）、`Recommendation`（推荐）
- 值对象：`Sentiment`（情感）、`Intent`（意图）

**关键业务规则**：
- 分析结果需要关联到对话
- 解决方案按可信度排序
- 推荐可以被采纳或忽略

### 2.6 知识库上下文（Knowledge Context）

**职责**：
- 知识文档管理
- 智能搜索
- 知识推荐

**领域模型**：
- 聚合根：`KnowledgeArticle`（知识文章）
- 值对象：`Tag`（标签）、`Category`（分类）

**关键业务规则**：
- 知识可以关联到多个标签
- 支持全文搜索
- 知识访问次数统计

### 2.7 治理上下文（Governance Context）

**职责**：
- 用户权限管理
- 操作审计
- Feature Flag控制
- 监控告警

**领域模型**：
- 聚合根：`User`（用户）、`AuditLog`（审计日志）
- 实体：`Role`（角色）、`Permission`（权限）
- 值对象：`FeatureFlag`（功能开关）

**关键业务规则**：
- RBAC权限模型
- 所有关键操作必须审计
- Feature Flag支持灰度发布

## 3. 上下文映射（Context Mapping）

### 3.1 上下文关系图

```
┌─────────────────────────┐
│  Conversation Context   │
│  (对话管理)              │
└───────┬─────────────────┘
        │
        │ ACL (防腐层)
        ↓
┌─────────────────────────┐      ┌──────────────────────┐
│ Customer Profile Context│◄─────│  CRM System (外部)   │
│ (客户画像)               │      │  (上游伙伴关系)       │
└───────┬─────────────────┘      └──────────────────────┘
        │
        │ Shared Kernel (共享内核: CustomerId)
        │
        ├──────────────────────┬─────────────────────┐
        │                      │                     │
        ↓                      ↓                     ↓
┌─────────────────┐   ┌──────────────────┐  ┌─────────────────┐
│ Requirement     │   │ Task & Quality   │  │  AI Analysis    │
│ Context         │   │ Context          │  │  Context        │
│ (需求采集)       │   │ (任务质检)        │  │  (AI分析)       │
└─────────────────┘   └──────────────────┘  └─────────────────┘
        │                      │                     │
        │                      │                     │
        └──────────────────────┴─────────────────────┘
                               │
                               │ Open Host Service (开放主机服务)
                               ↓
                    ┌──────────────────────┐
                    │  Knowledge Context   │
                    │  (知识库)             │
                    └──────────────────────┘

                    ┌──────────────────────┐
                    │ Governance Context   │
                    │ (治理) - 贯穿所有上下文 │
                    └──────────────────────┘
```

### 3.2 上下文关系说明

| 上下文A | 关系类型 | 上下文B | 说明 |
|---------|----------|---------|------|
| Conversation | ACL防腐层 | Customer Profile | 对话需要客户信息，但不直接依赖客户画像的内部结构 |
| Customer Profile | Partnership伙伴 | CRM System | 上游CRM系统提供数据，客户画像消费并转换 |
| Conversation | Shared Kernel | All Contexts | 共享ConversationId作为核心标识 |
| Requirement | Conformist顺从者 | Conversation | 需求识别完全依赖对话内容 |
| Task | Customer/Supplier | Requirement | 任务可以由需求生成 |
| AI Analysis | Open Host | All Contexts | AI分析对所有上下文提供服务 |
| Knowledge | Published Language | All Contexts | 知识库通过统一的搜索接口对外提供服务 |
| Governance | Separate Ways | All Contexts | 治理独立运行，通过事件总线集成 |

## 4. 聚合设计原则

### 4.1 聚合识别规则

1. **聚合根是事务一致性边界**
   - 一个事务只能修改一个聚合
   - 跨聚合操作使用最终一致性

2. **聚合应该尽量小**
   - 只包含必须保持强一致性的对象
   - 通过ID引用其他聚合

3. **聚合根对外隐藏内部实现**
   - 只暴露必要的行为接口
   - 不暴露内部实体的getter/setter

### 4.2 核心聚合设计

#### Conversation聚合

```
Conversation (聚合根)
├── conversationId: ConversationId (标识)
├── customer: CustomerId (引用)
├── channel: Channel (值对象)
├── status: ConversationStatus (值对象)
├── messages: Message[] (实体集合)
├── sla: SLAStatus (值对象)
└── 行为:
    ├── sendMessage(content, sender)
    ├── addInternalNote(note, author)
    ├── updateStatus(newStatus)
    └── calculateSLAStatus()
```

#### CustomerProfile聚合

```
CustomerProfile (聚合根)
├── customerId: CustomerId (标识)
├── basicInfo: BasicInfo (值对象)
├── contactInfo: ContactInfo (值对象)
├── contracts: Contract[] (实体集合)
├── metrics: Metrics (值对象)
├── insights: Insight[] (实体集合)
└── 行为:
    ├── updateBasicInfo(info)
    ├── refreshFromCRM()
    ├── calculateRiskLevel()
    └── getActiveContract()
```

#### Requirement聚合

```
Requirement (聚合根)
├── requirementId: RequirementId (标识)
├── conversationId: ConversationId (引用)
├── content: string
├── status: RequirementStatus (值对象)
├── priority: Priority (值对象)
├── creator: UserId (引用)
└── 行为:
    ├── process()
    ├── complete()
    ├── ignore(reason)
    └── changePriority(newPriority)
```

#### Task聚合

```
Task (聚合根)
├── taskId: TaskId (标识)
├── conversationId: ConversationId (引用)
├── title: string
├── description: string
├── status: TaskStatus (值对象)
├── assignee: UserId (引用)
├── actions: TaskAction[] (实体集合)
└── 行为:
    ├── assign(userId)
    ├── start()
    ├── complete()
    ├── addAction(action)
    └── calculateProgress()
```

## 5. 领域服务

### 5.1 需求识别服务（RequirementDetector）

**职责**：从对话内容中自动识别需求

```typescript
interface RequirementDetectorService {
  detectFromConversation(conversation: Conversation): Requirement[];
  analyzeKeywords(content: string): boolean;
  extractRequirementContent(message: Message): string;
}
```

### 5.2 质量评分服务（QualityScorer）

**职责**：对对话进行多维度质量评分

```typescript
interface QualityScorerService {
  scoreConversation(conversation: Conversation): QualityInspection;
  calculateDimensionScore(dimension: string, conversation: Conversation): number;
  generateRecommendations(inspection: QualityInspection): Recommendation[];
}
```

### 5.3 客户画像聚合服务（ProfileAggregator）

**职责**：从多个数据源聚合客户信息

```typescript
interface ProfileAggregatorService {
  aggregateFromSources(customerId: CustomerId): CustomerProfile;
  enrichWithCRM(profile: CustomerProfile): CustomerProfile;
  calculateMetrics(profile: CustomerProfile): Metrics;
}
```

## 6. 领域事件

### 6.1 事件设计原则

1. 事件名称使用过去时态（表示已发生）
2. 事件包含足够的上下文信息
3. 事件应该是不可变的
4. 事件ID全局唯一

### 6.2 核心领域事件

#### 对话领域事件

```typescript
// 消息已发送
interface MessageSentEvent {
  eventId: string;
  occurredAt: Date;
  conversationId: string;
  messageId: string;
  content: string;
  sender: string;
}

// 对话已关闭
interface ConversationClosedEvent {
  eventId: string;
  occurredAt: Date;
  conversationId: string;
  closedBy: string;
  reason: string;
}

// SLA已违规
interface SLAViolatedEvent {
  eventId: string;
  occurredAt: Date;
  conversationId: string;
  customerId: string;
  slaType: string;
  expectedTime: Date;
  actualTime: Date;
}
```

#### 需求领域事件

```typescript
// 需求已创建
interface RequirementCreatedEvent {
  eventId: string;
  occurredAt: Date;
  requirementId: string;
  conversationId: string;
  content: string;
  priority: string;
}

// 需求已完成
interface RequirementCompletedEvent {
  eventId: string;
  occurredAt: Date;
  requirementId: string;
  completedBy: string;
  completedAt: Date;
}
```

#### 客户画像事件

```typescript
// 客户画像已刷新
interface ProfileRefreshedEvent {
  eventId: string;
  occurredAt: Date;
  customerId: string;
  changes: string[];
}

// 客户风险等级变更
interface CustomerRiskLevelChangedEvent {
  eventId: string;
  occurredAt: Date;
  customerId: string;
  oldLevel: string;
  newLevel: string;
  reasons: string[];
}
```

## 7. 应用服务设计

应用服务编排领域对象，实现用例流程。

### 7.1 应用服务分层

```
Application Layer (应用层)
├── ConversationApplicationService
│   ├── startConversation(customerId, channel)
│   ├── sendMessage(conversationId, content)
│   ├── closeConversation(conversationId, reason)
│   └── getConversationHistory(conversationId)
├── CustomerProfileApplicationService
│   ├── getCustomerProfile(customerId)
│   ├── refreshProfile(customerId)
│   └── getInteractionHistory(customerId, filters)
├── RequirementApplicationService
│   ├── createRequirement(data)
│   ├── processRequirement(requirementId)
│   └── getRequirementStatistics()
└── TaskApplicationService
    ├── createTask(data)
    ├── assignTask(taskId, assignee)
    └── completeTask(taskId, result)
```

## 8. 技术架构分层

### 8.1 完整分层架构

```
┌─────────────────────────────────────────────────┐
│         Presentation Layer (展示层)              │
│  UI Components, Event Handlers, View Models     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│        Application Layer (应用层)                │
│  Application Services, Use Cases, DTOs          │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│          Domain Layer (领域层)                   │
│  Aggregates, Entities, Value Objects,           │
│  Domain Services, Domain Events                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│      Infrastructure Layer (基础设施层)           │
│  Repositories, API Clients, Event Bus,          │
│  External Services Integration                  │
└─────────────────────────────────────────────────┘
```

### 8.2 依赖规则

1. **依赖方向**：外层依赖内层，内层不依赖外层
2. **领域层独立**：Domain Layer不依赖任何外部框架
3. **接口在内层**：Repository接口定义在Domain Layer
4. **实现在外层**：Repository实现在Infrastructure Layer

## 9. 数据流向

### 9.1 命令流（Command Flow）

```
UI → Application Service → Domain Model → Repository → Database
                                ↓
                          Domain Event
                                ↓
                          Event Handler
```

### 9.2 查询流（Query Flow）

```
UI → Application Service → Repository → Database
            ↓
        View Model → UI
```

### 9.3 事件流（Event Flow）

```
Domain Model → Domain Event → Event Bus → Event Handlers
                                              ↓
                                    ├─→ Send Notification
                                    ├─→ Update Read Model
                                    ├─→ Trigger Workflow
                                    └─→ Call External System
```

## 10. 关键设计决策

### 10.1 CQRS模式

**决策**：对复杂查询场景采用CQRS

- **写模型**：使用聚合保证一致性
- **读模型**：使用扁平化ViewModel优化查询性能
- **同步机制**：通过领域事件更新读模型

### 10.2 最终一致性

**决策**：跨聚合操作使用最终一致性

- **场景**：需求创建后更新客户画像的互动次数
- **实现**：通过领域事件异步更新
- **好处**：解耦、提升性能

### 10.3 事件溯源（可选）

**决策**：核心聚合可以考虑事件溯源

- **适用场景**：需要完整审计追踪的操作
- **候选聚合**：Conversation、CustomerProfile
- **实现方式**：事件存储 + 快照机制

## 11. 实施路线图

### Phase 1: 基础设施（当前阶段）
- ✅ 项目脚手架
- ✅ 分层架构搭建
- ✅ 基础工具库
- 🔄 领域模型定义

### Phase 2: 核心聚合实现（2-3周）
- Conversation聚合完整实现
- CustomerProfile聚合完整实现
- Repository实现
- 领域事件基础设施

### Phase 3: 应用服务（2-3周）
- 应用服务层实现
- DTO定义
- 用例编排

### Phase 4: 基础设施集成（2-3周）
- API客户端实现
- 事件总线实现
- 缓存策略
- 监控埋点

### Phase 5: 次要上下文（3-4周）
- Requirement上下文
- Task上下文
- Knowledge上下文
- AI Analysis上下文

---

**文档版本**：v1.0
**最后更新**：2025-12-13
**作者**：架构团队
**审阅**：技术委员会
