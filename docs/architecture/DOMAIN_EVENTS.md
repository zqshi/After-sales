# 领域事件设计文档

## 1. 概述

### 1.1 领域事件的定义

领域事件(Domain Event)是DDD中的核心概念，表示在领域中发生的、业务相关的重要事件。事件是不可变的，代表已经发生的事实。

**核心特征**:
- **不可变性**: 事件一旦发生就不能修改
- **业务语义**: 使用业务语言命名,如`MessageSentEvent`而非`MessageCreated`
- **自包含**: 包含处理事件所需的完整信息
- **时间戳**: 记录事件发生的准确时间
- **溯源性**: 可用于事件溯源和审计

### 1.2 事件驱动架构的优势

1. **解耦**: 聚合之间通过事件通信,避免直接依赖
2. **可扩展**: 新功能可通过订阅现有事件实现,无需修改原有代码
3. **异步处理**: 支持最终一致性,提升系统性能
4. **审计追踪**: 事件流自然形成业务审计日志
5. **业务洞察**: 事件数据可用于分析和报表

## 2. 事件命名规范

### 2.1 命名模式

```
{领域对象}{业务动作}Event
```

**示例**:
- ✅ `MessageSentEvent` (消息已发送)
- ✅ `ConversationClosedEvent` (会话已关闭)
- ✅ `SLAViolatedEvent` (SLA已违反)
- ❌ `MessageCreated` (技术性命名)
- ❌ `CreateMessage` (命令式命名)

### 2.2 时态选择

- **过去式**: 表示已经发生的事件 (推荐)
  - `MessageSentEvent`, `TaskCompletedEvent`
- **现在进行时**: 表示正在发生的状态变化
  - `SLAViolatingEvent` (SLA违规中)

## 3. 事件分类

### 3.1 按作用域分类

#### (1) 聚合内事件
在聚合内部发布和处理,不跨越聚合边界。

**示例**:
```javascript
// 在Message实体内部触发
class Message {
  markAsRead() {
    this.isRead = true;
    this.addDomainEvent(new MessageReadEvent(this.id));
  }
}
```

#### (2) 限界上下文内事件
在同一限界上下文内的不同聚合间传递。

**示例**:
- `ConversationClosedEvent` → 更新相关的任务状态

#### (3) 跨上下文集成事件
跨越限界上下文边界,用于不同领域间的集成。

**示例**:
- `RequirementExtractedEvent` (需求上下文) → 客户画像上下文更新客户需求偏好

### 3.2 按业务流程分类

#### (1) 状态变更事件
表示聚合状态的变化。

**示例**:
- `TaskStatusChangedEvent`
- `ConversationStatusChangedEvent`

#### (2) 业务规则事件
表示业务规则的触发或违反。

**示例**:
- `SLAViolatedEvent` (SLA违反)
- `QualityThresholdExceededEvent` (质量阈值超标)

#### (3) 集成事件
用于与外部系统集成。

**示例**:
- `ProfileSyncRequestedEvent` (请求同步客户资料)
- `NotificationSentEvent` (通知已发送)

## 4. 事件详细定义

### 4.1 对话管理上下文 (Conversation Context)

#### MessageSentEvent
```javascript
/**
 * 消息已发送事件
 * 触发时机: 客服或客户发送消息后
 */
export class MessageSentEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'MessageSent';

    // 业务数据
    this.conversationId = data.conversationId;
    this.messageId = data.messageId;
    this.senderId = data.senderId;
    this.senderType = data.senderType; // 'customer' | 'agent'
    this.content = data.content;
    this.channel = data.channel; // 'chat' | 'email' | 'phone'
    this.timestamp = data.timestamp;
  }
}

// 订阅者示例
// - SLA计算器: 更新响应时间
// - 知识库: 提取常见问题
// - 客户画像: 更新互动频率
```

#### ConversationStartedEvent
```javascript
/**
 * 会话已开始事件
 * 触发时机: 新会话被创建时
 */
export class ConversationStartedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'ConversationStarted';

    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.channel = data.channel;
    this.source = data.source; // 'web' | 'mobile' | 'email'
    this.initialMessage = data.initialMessage;
    this.priority = data.priority; // 'low' | 'medium' | 'high' | 'urgent'
  }
}

// 订阅者:
// - 任务管理: 创建初始任务
// - 客户画像: 记录新互动
// - AI分析: 开始情感分析
```

#### ConversationClosedEvent
```javascript
/**
 * 会话已关闭事件
 * 触发时机: 会话被标记为已解决/已关闭时
 */
export class ConversationClosedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'ConversationClosed';

    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.closedBy = data.closedBy; // 客服ID
    this.resolution = data.resolution; // 'resolved' | 'cancelled' | 'transferred'
    this.duration = data.duration; // 会话持续时间(秒)
    this.messageCount = data.messageCount;
    this.satisfaction = data.satisfaction; // 可选的满意度评分
  }
}

// 订阅者:
// - 任务管理: 关闭相关任务
// - 质量评估: 触发质量评分
// - 知识库: 提取解决方案
// - 报表: 更新统计数据
```

#### SLAViolatedEvent
```javascript
/**
 * SLA违反事件
 * 触发时机: 响应时间或解决时间超过SLA承诺
 */
export class SLAViolatedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'SLAViolated';

    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.violationType = data.violationType; // 'firstResponse' | 'resolution'
    this.expectedTime = data.expectedTime; // 预期时间(分钟)
    this.actualTime = data.actualTime; // 实际时间(分钟)
    this.exceedBy = data.exceedBy; // 超出时间(分钟)
    this.severity = data.severity; // 'minor' | 'major' | 'critical'
  }
}

// 订阅者:
// - 治理监控: 记录违规
// - 通知系统: 发送告警
// - 客户画像: 标记风险客户
```

### 4.2 客户画像上下文 (Customer Profile Context)

#### ProfileUpdatedEvent
```javascript
/**
 * 客户画像已更新事件
 * 触发时机: 客户信息发生变更时
 */
export class ProfileUpdatedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'ProfileUpdated';

    this.customerId = data.customerId;
    this.conversationId = data.conversationId;
    this.updateType = data.updateType; // 'contact' | 'sla' | 'tags' | 'metrics'
    this.changedFields = data.changedFields; // ['email', 'phone']
    this.oldValues = data.oldValues; // { email: 'old@example.com' }
    this.newValues = data.newValues; // { email: 'new@example.com' }
    this.source = data.source; // 'manual' | 'ai_extraction' | 'import'
  }
}

// 订阅者:
// - CRM系统: 同步客户信息
// - 通知系统: 发送变更通知
// - 审计日志: 记录变更历史
```

#### RiskLevelChangedEvent
```javascript
/**
 * 风险等级变更事件
 * 触发时机: 客户风险评分发生变化时
 */
export class RiskLevelChangedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'RiskLevelChanged';

    this.customerId = data.customerId;
    this.conversationId = data.conversationId;
    this.oldRiskLevel = data.oldRiskLevel; // 'low' | 'medium' | 'high'
    this.newRiskLevel = data.newRiskLevel;
    this.riskFactors = data.riskFactors; // ['sla_violation', 'negative_sentiment']
    this.score = data.score; // 风险分数 0-100
  }
}

// 订阅者:
// - 治理监控: 触发风险告警
// - 任务管理: 调整任务优先级
// - 通知系统: 通知客户经理
```

#### SLAStatusChangedEvent
```javascript
/**
 * SLA状态变更事件
 * 触发时机: 客户SLA等级发生变化
 */
export class SLAStatusChangedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'SLAStatusChanged';

    this.customerId = data.customerId;
    this.oldStatus = data.oldStatus; // '银牌' | '金牌' | '钻石'
    this.newStatus = data.newStatus;
    this.effectiveDate = data.effectiveDate;
    this.expiryDate = data.expiryDate;
    this.changeReason = data.changeReason; // 'upgrade' | 'downgrade' | 'renewal'
  }
}

// 订阅者:
// - 对话管理: 调整响应时间目标
// - 通知系统: 通知客户和团队
// - 报表: 更新SLA统计
```

### 4.3 需求管理上下文 (Requirement Context)

#### RequirementExtractedEvent
```javascript
/**
 * 需求已提取事件
 * 触发时机: AI从对话中识别出新需求时
 */
export class RequirementExtractedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'RequirementExtracted';

    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.requirementId = data.requirementId;
    this.category = data.category; // '功能需求' | '性能需求' | '问题反馈'
    this.content = data.content;
    this.priority = data.priority;
    this.confidence = data.confidence; // AI置信度 0-1
    this.sourceMessageIds = data.sourceMessageIds; // 来源消息ID列表
  }
}

// 订阅者:
// - 任务管理: 创建跟进任务
// - 客户画像: 更新需求偏好
// - 产品团队: 收集产品需求
```

#### RequirementStatusChangedEvent
```javascript
/**
 * 需求状态变更事件
 * 触发时机: 需求处理状态发生变化
 */
export class RequirementStatusChangedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'RequirementStatusChanged';

    this.requirementId = data.requirementId;
    this.conversationId = data.conversationId;
    this.oldStatus = data.oldStatus; // 'pending' | 'in_progress' | 'resolved'
    this.newStatus = data.newStatus;
    this.assignedTo = data.assignedTo; // 负责人ID
    this.resolution = data.resolution; // 解决方案描述
    this.estimatedEffort = data.estimatedEffort; // 预计工作量(小时)
  }
}

// 订阅者:
// - 通知系统: 通知客户和团队
// - 报表: 更新需求统计
```

### 4.4 任务与质量上下文 (Task & Quality Context)

#### TaskCreatedEvent
```javascript
/**
 * 任务已创建事件
 * 触发时机: 新任务被创建时
 */
export class TaskCreatedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'TaskCreated';

    this.taskId = data.taskId;
    this.conversationId = data.conversationId;
    this.type = data.type; // 'follow_up' | 'requirement' | 'quality_issue'
    this.title = data.title;
    this.description = data.description;
    this.priority = data.priority;
    this.assignedTo = data.assignedTo;
    this.dueDate = data.dueDate;
    this.estimatedHours = data.estimatedHours;
  }
}

// 订阅者:
// - 通知系统: 通知负责人
// - 报表: 更新任务统计
```

#### TaskCompletedEvent
```javascript
/**
 * 任务已完成事件
 * 触发时机: 任务被标记为完成时
 */
export class TaskCompletedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'TaskCompleted';

    this.taskId = data.taskId;
    this.conversationId = data.conversationId;
    this.completedBy = data.completedBy;
    this.actualHours = data.actualHours; // 实际花费时间
    this.completionNotes = data.completionNotes;
    this.quality = data.quality; // 完成质量评分
  }
}

// 订阅者:
// - 对话管理: 更新会话状态
// - 报表: 更新完成率统计
// - 知识库: 提取解决方案
```

#### QualityIssueDetectedEvent
```javascript
/**
 * 质量问题检测事件
 * 触发时机: 质量评估发现问题时
 */
export class QualityIssueDetectedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'QualityIssueDetected';

    this.conversationId = data.conversationId;
    this.issueType = data.issueType; // 'response_quality' | 'resolution_quality' | 'professionalism'
    this.severity = data.severity; // 'low' | 'medium' | 'high'
    this.score = data.score; // 质量分数 0-100
    this.issues = data.issues; // 具体问题列表
    this.agentId = data.agentId; // 相关客服ID
  }
}

// 订阅者:
// - 任务管理: 创建改进任务
// - 治理监控: 记录质量问题
// - 通知系统: 通知主管
```

### 4.5 AI分析上下文 (AI Analysis Context)

#### SentimentAnalyzedEvent
```javascript
/**
 * 情感分析完成事件
 * 触发时机: AI完成对话情感分析时
 */
export class SentimentAnalyzedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'SentimentAnalyzed';

    this.conversationId = data.conversationId;
    this.messageId = data.messageId;
    this.sentiment = data.sentiment; // 'positive' | 'neutral' | 'negative'
    this.score = data.score; // -1 到 1
    this.confidence = data.confidence; // 0-1
    this.emotions = data.emotions; // ['frustrated', 'angry', 'satisfied']
    this.keywords = data.keywords; // 关键情感词
  }
}

// 订阅者:
// - 客户画像: 更新情感历史
// - 治理监控: 检测负面情绪
// - 对话管理: 调整对话策略
```

#### InsightGeneratedEvent
```javascript
/**
 * 洞察生成事件
 * 触发时机: AI生成新的客户洞察时
 */
export class InsightGeneratedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'InsightGenerated';

    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.insightType = data.insightType; // 'behavior' | 'preference' | 'risk' | 'opportunity'
    this.title = data.title;
    this.description = data.description;
    this.actionable = data.actionable; // 是否可执行
    this.suggestedActions = data.suggestedActions; // 建议行动
    this.confidence = data.confidence;
  }
}

// 订阅者:
// - 客户画像: 添加洞察到档案
// - 任务管理: 创建跟进任务
// - 通知系统: 通知客户经理
```

### 4.6 知识库上下文 (Knowledge Context)

#### KnowledgeArticleCreatedEvent
```javascript
/**
 * 知识文章创建事件
 * 触发时机: 从对话中提取并创建新知识文章时
 */
export class KnowledgeArticleCreatedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'KnowledgeArticleCreated';

    this.articleId = data.articleId;
    this.conversationId = data.conversationId; // 来源对话
    this.category = data.category;
    this.title = data.title;
    this.tags = data.tags;
    this.createdBy = data.createdBy; // 'ai' | userId
    this.source = data.source; // 'conversation' | 'manual'
  }
}

// 订阅者:
// - 通知系统: 通知知识管理员
// - AI分析: 更新推荐模型
```

#### KnowledgeRecommendedEvent
```javascript
/**
 * 知识推荐事件
 * 触发时机: AI为对话推荐相关知识文章时
 */
export class KnowledgeRecommendedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'KnowledgeRecommended';

    this.conversationId = data.conversationId;
    this.articleIds = data.articleIds;
    this.relevanceScores = data.relevanceScores; // 相关性分数
    this.context = data.context; // 推荐上下文
    this.applied = data.applied; // 是否被采纳
  }
}

// 订阅者:
// - 知识库: 更新文章使用统计
// - AI分析: 优化推荐算法
```

### 4.7 治理监控上下文 (Governance Context)

#### ComplianceViolationDetectedEvent
```javascript
/**
 * 合规违规检测事件
 * 触发时机: 检测到合规性违规行为时
 */
export class ComplianceViolationDetectedEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'ComplianceViolationDetected';

    this.conversationId = data.conversationId;
    this.violationType = data.violationType; // 'data_privacy' | 'security' | 'regulatory'
    this.severity = data.severity;
    this.description = data.description;
    this.affectedData = data.affectedData; // 受影响的数据
    this.detectedBy = data.detectedBy; // 'ai' | 'manual'
  }
}

// 订阅者:
// - 通知系统: 紧急告警
// - 审计日志: 记录违规
// - 任务管理: 创建修复任务
```

#### PerformanceAlertEvent
```javascript
/**
 * 性能告警事件
 * 触发时机: 系统性能指标异常时
 */
export class PerformanceAlertEvent {
  constructor(data) {
    this.eventId = generateId();
    this.occurredAt = new Date().toISOString();
    this.eventType = 'PerformanceAlert';

    this.metricName = data.metricName; // 'response_time' | 'resolution_rate' | 'satisfaction'
    this.currentValue = data.currentValue;
    this.threshold = data.threshold;
    this.severity = data.severity;
    this.affectedConversations = data.affectedConversations;
    this.timeWindow = data.timeWindow; // 时间窗口
  }
}

// 订阅者:
// - 通知系统: 发送告警
// - 治理监控: 更新监控面板
```

## 5. 事件基础设施

### 5.1 事件总线设计

```javascript
/**
 * 事件总线 - 发布/订阅模式实现
 */
export class EventBus {
  constructor() {
    this.subscribers = new Map(); // eventType -> Set<handler>
    this.eventStore = []; // 可选: 事件存储
    this.maxStoreSize = 1000;
  }

  /**
   * 订阅事件
   * @param {string} eventType - 事件类型
   * @param {Function} handler - 处理函数
   * @returns {Function} 取消订阅函数
   */
  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    this.subscribers.get(eventType).add(handler);

    // 返回取消订阅函数
    return () => {
      this.subscribers.get(eventType).delete(handler);
    };
  }

  /**
   * 发布事件
   * @param {Object} event - 领域事件
   */
  async publish(event) {
    // 验证事件
    if (!event.eventType || !event.eventId || !event.occurredAt) {
      throw new Error('Invalid event: missing required fields');
    }

    // 存储事件(可选)
    this.storeEvent(event);

    // 获取订阅者
    const handlers = this.subscribers.get(event.eventType);
    if (!handlers || handlers.size === 0) {
      console.warn(`[EventBus] No subscribers for event: ${event.eventType}`);
      return;
    }

    // 异步执行所有处理器
    const promises = Array.from(handlers).map(handler =>
      this.executeHandler(handler, event)
    );

    // 等待所有处理器完成
    const results = await Promise.allSettled(promises);

    // 记录失败
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `[EventBus] Handler failed for ${event.eventType}:`,
          result.reason
        );
      }
    });
  }

  /**
   * 执行单个处理器
   */
  async executeHandler(handler, event) {
    try {
      await handler(event);
    } catch (err) {
      console.error('[EventBus] Handler execution error:', err);
      throw err;
    }
  }

  /**
   * 存储事件(用于审计和重放)
   */
  storeEvent(event) {
    this.eventStore.push({
      ...event,
      storedAt: new Date().toISOString(),
    });

    // 限制存储大小
    if (this.eventStore.length > this.maxStoreSize) {
      this.eventStore.shift();
    }
  }

  /**
   * 获取事件历史
   */
  getEventHistory(filter = {}) {
    let events = [...this.eventStore];

    if (filter.eventType) {
      events = events.filter(e => e.eventType === filter.eventType);
    }

    if (filter.startTime) {
      events = events.filter(e => e.occurredAt >= filter.startTime);
    }

    if (filter.endTime) {
      events = events.filter(e => e.occurredAt <= filter.endTime);
    }

    return events;
  }

  /**
   * 清空订阅者(用于测试)
   */
  clear() {
    this.subscribers.clear();
  }
}

// 导出单例
export const eventBus = new EventBus();
```

### 5.2 事件处理器基类

```javascript
/**
 * 事件处理器基类
 */
export class EventHandler {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.subscriptions = [];
  }

  /**
   * 订阅事件
   * @param {string} eventType
   * @param {Function} handler
   */
  subscribe(eventType, handler) {
    const unsubscribe = this.eventBus.subscribe(
      eventType,
      handler.bind(this)
    );
    this.subscriptions.push(unsubscribe);
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }

  /**
   * 处理事件(子类实现)
   */
  async handle(event) {
    throw new Error('Must implement handle() method');
  }
}
```

### 5.3 事件处理器示例

```javascript
/**
 * SLA违规处理器
 * 当SLA违规时,创建告警任务并通知相关人员
 */
export class SLAViolationHandler extends EventHandler {
  constructor(eventBus, taskService, notificationService) {
    super(eventBus);
    this.taskService = taskService;
    this.notificationService = notificationService;

    // 订阅SLA违规事件
    this.subscribe('SLAViolated', this.handleSLAViolation);
  }

  async handleSLAViolation(event) {
    console.log('[SLAViolationHandler] Processing SLA violation:', event);

    try {
      // 1. 创建告警任务
      const task = await this.taskService.createTask({
        conversationId: event.conversationId,
        type: 'sla_violation',
        title: `SLA违规: ${event.violationType}`,
        description: `超出预期时间 ${event.exceedBy} 分钟`,
        priority: this.mapSeverityToPriority(event.severity),
        dueDate: this.calculateDueDate(event.severity),
      });

      // 2. 发送通知
      await this.notificationService.send({
        type: 'sla_violation',
        recipients: this.getRecipients(event.severity),
        data: {
          conversationId: event.conversationId,
          customerId: event.customerId,
          violationType: event.violationType,
          exceedBy: event.exceedBy,
          taskId: task.id,
        },
      });

      console.log('[SLAViolationHandler] Successfully handled SLA violation');
    } catch (err) {
      console.error('[SLAViolationHandler] Failed to handle event:', err);
      throw err;
    }
  }

  mapSeverityToPriority(severity) {
    const mapping = {
      minor: 'medium',
      major: 'high',
      critical: 'urgent',
    };
    return mapping[severity] || 'medium';
  }

  calculateDueDate(severity) {
    const hours = severity === 'critical' ? 1 : severity === 'major' ? 4 : 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  getRecipients(severity) {
    // 根据严重程度确定通知对象
    if (severity === 'critical') {
      return ['team_lead', 'manager', 'assigned_agent'];
    } else if (severity === 'major') {
      return ['team_lead', 'assigned_agent'];
    } else {
      return ['assigned_agent'];
    }
  }
}
```

```javascript
/**
 * 客户画像更新处理器
 * 监听多个事件来更新客户画像
 */
export class ProfileUpdateHandler extends EventHandler {
  constructor(eventBus, profileRepository) {
    super(eventBus);
    this.profileRepository = profileRepository;

    // 订阅多个相关事件
    this.subscribe('MessageSent', this.handleMessageSent);
    this.subscribe('ConversationClosed', this.handleConversationClosed);
    this.subscribe('SentimentAnalyzed', this.handleSentimentAnalyzed);
    this.subscribe('RequirementExtracted', this.handleRequirementExtracted);
  }

  async handleMessageSent(event) {
    // 更新互动频率
    const profile = await this.profileRepository.getByCustomerId(
      event.customerId
    );

    profile.updateMetrics({
      totalMessages: profile.metrics.totalMessages + 1,
      lastInteractionAt: event.timestamp,
    });

    await this.profileRepository.save(profile);
  }

  async handleConversationClosed(event) {
    // 更新会话统计
    const profile = await this.profileRepository.getByCustomerId(
      event.customerId
    );

    profile.updateMetrics({
      totalConversations: profile.metrics.totalConversations + 1,
      avgDuration: this.calculateAvgDuration(
        profile.metrics.avgDuration,
        event.duration
      ),
    });

    await this.profileRepository.save(profile);
  }

  async handleSentimentAnalyzed(event) {
    // 更新情感历史
    const profile = await this.profileRepository.getByCustomerId(
      event.customerId
    );

    profile.addSentimentRecord({
      timestamp: event.occurredAt,
      sentiment: event.sentiment,
      score: event.score,
    });

    await this.profileRepository.save(profile);
  }

  async handleRequirementExtracted(event) {
    // 添加需求到客户档案
    const profile = await this.profileRepository.getByCustomerId(
      event.customerId
    );

    profile.addRequirement({
      id: event.requirementId,
      category: event.category,
      content: event.content,
      extractedAt: event.occurredAt,
    });

    await this.profileRepository.save(profile);
  }

  calculateAvgDuration(currentAvg, newDuration) {
    // 简化的平均值计算
    return (currentAvg * 0.9 + newDuration * 0.1);
  }
}
```

## 6. 事件溯源(可选高级功能)

### 6.1 事件溯源的优势

事件溯源(Event Sourcing)将聚合的所有状态变更保存为事件序列,而不是仅保存当前状态。

**优势**:
- **完整审计**: 可追溯所有历史变更
- **时间旅行**: 可重建任意时刻的状态
- **调试友好**: 可重放事件序列来复现问题
- **分析价值**: 事件流可用于业务分析

### 6.2 事件溯源实现示例

```javascript
/**
 * 事件溯源聚合基类
 */
export class EventSourcedAggregate {
  constructor() {
    this.uncommittedEvents = [];
    this.version = 0;
  }

  /**
   * 应用事件(修改状态)
   */
  applyEvent(event) {
    // 调用特定事件的处理方法
    const methodName = `apply${event.eventType}`;
    if (typeof this[methodName] === 'function') {
      this[methodName](event);
    }
    this.version++;
  }

  /**
   * 添加领域事件
   */
  addDomainEvent(event) {
    this.applyEvent(event); // 立即应用到当前状态
    this.uncommittedEvents.push(event); // 记录未提交事件
  }

  /**
   * 从事件历史重建聚合
   */
  static fromHistory(events) {
    const aggregate = new this();
    events.forEach(event => aggregate.applyEvent(event));
    return aggregate;
  }

  /**
   * 获取未提交的事件
   */
  getUncommittedEvents() {
    return [...this.uncommittedEvents];
  }

  /**
   * 标记事件为已提交
   */
  markEventsAsCommitted() {
    this.uncommittedEvents = [];
  }
}
```

```javascript
/**
 * 使用事件溯源的Conversation聚合
 */
export class Conversation extends EventSourcedAggregate {
  constructor(id) {
    super();
    this.id = id;
    this.messages = [];
    this.status = 'open';
    this.participants = [];
  }

  // ========== 命令方法 ==========

  sendMessage(senderId, content) {
    // 业务规则验证
    if (this.status === 'closed') {
      throw new Error('Cannot send message to closed conversation');
    }

    // 创建并应用事件
    const event = new MessageSentEvent({
      conversationId: this.id,
      messageId: generateId(),
      senderId,
      content,
      timestamp: new Date().toISOString(),
    });

    this.addDomainEvent(event);
  }

  close(closedBy, resolution) {
    if (this.status === 'closed') {
      throw new Error('Conversation already closed');
    }

    const event = new ConversationClosedEvent({
      conversationId: this.id,
      closedBy,
      resolution,
      duration: this.calculateDuration(),
      messageCount: this.messages.length,
    });

    this.addDomainEvent(event);
  }

  // ========== 事件应用方法 ==========

  applyMessageSentEvent(event) {
    this.messages.push({
      id: event.messageId,
      senderId: event.senderId,
      content: event.content,
      timestamp: event.timestamp,
    });
  }

  applyConversationClosedEvent(event) {
    this.status = 'closed';
    this.closedBy = event.closedBy;
    this.resolution = event.resolution;
  }

  // ========== 辅助方法 ==========

  calculateDuration() {
    if (this.messages.length === 0) return 0;
    const start = new Date(this.messages[0].timestamp);
    const end = new Date();
    return Math.floor((end - start) / 1000); // 秒
  }
}
```

## 7. 测试策略

### 7.1 事件测试

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../EventBus';
import { MessageSentEvent } from '../events/MessageSentEvent';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should publish event to subscribers', async () => {
    const receivedEvents = [];

    eventBus.subscribe('MessageSent', (event) => {
      receivedEvents.push(event);
    });

    const event = new MessageSentEvent({
      conversationId: 'conv-1',
      messageId: 'msg-1',
      senderId: 'user-1',
      content: 'Hello',
    });

    await eventBus.publish(event);

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].conversationId).toBe('conv-1');
  });

  it('should handle multiple subscribers', async () => {
    let count = 0;

    eventBus.subscribe('MessageSent', () => { count++; });
    eventBus.subscribe('MessageSent', () => { count++; });

    const event = new MessageSentEvent({
      conversationId: 'conv-1',
      messageId: 'msg-1',
      senderId: 'user-1',
      content: 'Hello',
    });

    await eventBus.publish(event);

    expect(count).toBe(2);
  });

  it('should unsubscribe correctly', async () => {
    let count = 0;
    const unsubscribe = eventBus.subscribe('MessageSent', () => { count++; });

    unsubscribe();

    const event = new MessageSentEvent({
      conversationId: 'conv-1',
      messageId: 'msg-1',
      senderId: 'user-1',
      content: 'Hello',
    });

    await eventBus.publish(event);

    expect(count).toBe(0);
  });
});
```

### 7.2 事件处理器测试

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SLAViolationHandler } from '../handlers/SLAViolationHandler';
import { SLAViolatedEvent } from '../events/SLAViolatedEvent';

describe('SLAViolationHandler', () => {
  let handler;
  let mockTaskService;
  let mockNotificationService;
  let eventBus;

  beforeEach(() => {
    mockTaskService = {
      createTask: vi.fn().mockResolvedValue({ id: 'task-1' }),
    };

    mockNotificationService = {
      send: vi.fn().mockResolvedValue(true),
    };

    eventBus = new EventBus();

    handler = new SLAViolationHandler(
      eventBus,
      mockTaskService,
      mockNotificationService
    );
  });

  it('should create task on SLA violation', async () => {
    const event = new SLAViolatedEvent({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      violationType: 'firstResponse',
      expectedTime: 5,
      actualTime: 10,
      exceedBy: 5,
      severity: 'major',
    });

    await eventBus.publish(event);

    expect(mockTaskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        type: 'sla_violation',
        priority: 'high',
      })
    );
  });

  it('should send notification on critical SLA violation', async () => {
    const event = new SLAViolatedEvent({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      violationType: 'resolution',
      expectedTime: 120,
      actualTime: 180,
      exceedBy: 60,
      severity: 'critical',
    });

    await eventBus.publish(event);

    expect(mockNotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sla_violation',
        recipients: expect.arrayContaining(['team_lead', 'manager']),
      })
    );
  });
});
```

## 8. 最佳实践

### 8.1 事件设计原则

1. **事件命名**: 使用过去式动词,表示已发生的事实
   - ✅ `MessageSent`, `ConversationClosed`
   - ❌ `SendMessage`, `CloseConversation`

2. **事件粒度**: 保持事件的原子性和内聚性
   - 一个事件代表一个明确的业务事实
   - 避免在一个事件中包含多个不相关的变更

3. **事件不可变**: 事件一旦创建就不能修改
   - 使用`Object.freeze()`确保不可变性
   - 所有字段在构造函数中初始化

4. **自包含性**: 事件应包含处理所需的完整信息
   - 避免事件处理器需要查询额外数据
   - 包含必要的上下文(conversationId, customerId等)

### 8.2 事件处理原则

1. **幂等性**: 事件处理器应该是幂等的
   - 相同事件多次处理应得到相同结果
   - 使用事件ID去重

2. **异步处理**: 事件应该异步处理
   - 不阻塞主业务流程
   - 使用Promise.allSettled处理多个订阅者

3. **错误处理**: 妥善处理失败情况
   - 单个处理器失败不影响其他处理器
   - 记录错误日志
   - 考虑重试机制

4. **顺序性**: 注意事件的顺序依赖
   - 同一聚合的事件应按顺序处理
   - 跨聚合的事件可并行处理

### 8.3 性能优化

1. **批量处理**: 对于高频事件,考虑批量处理
2. **异步发布**: 使用消息队列处理大量事件
3. **事件过滤**: 订阅者可以添加过滤条件
4. **懒加载**: 延迟加载事件处理器

### 8.4 监控与调试

1. **事件日志**: 记录所有发布的事件
2. **性能监控**: 监控事件处理时间
3. **失败告警**: 处理失败时发送告警
4. **事件重放**: 支持重放事件用于调试

## 9. 实施路线图

### Phase 1: 基础设施(第1-2周)
- ✅ 实现EventBus核心功能
- ✅ 创建EventHandler基类
- ✅ 定义所有事件类
- ⏳ 添加事件验证和日志

### Phase 2: 核心事件处理器(第3-4周)
- ⏳ 实现SLAViolationHandler
- ⏳ 实现ProfileUpdateHandler
- ⏳ 实现QualityMonitorHandler
- ⏳ 编写单元测试

### Phase 3: 集成与测试(第5-6周)
- ⏳ 集成到现有聚合
- ⏳ 端到端测试
- ⏳ 性能优化
- ⏳ 监控和告警

### Phase 4: 高级功能(第7-8周,可选)
- ⏳ 事件溯源实现
- ⏳ 事件重放功能
- ⏳ 事件版本管理
- ⏳ 分布式事件总线

## 10. 附录

### 10.1 事件清单

| 上下文 | 事件名称 | 触发时机 | 主要订阅者 |
|--------|----------|----------|------------|
| 对话管理 | MessageSentEvent | 消息发送后 | SLA计算器,知识库,客户画像 |
| 对话管理 | ConversationStartedEvent | 会话创建时 | 任务管理,客户画像,AI分析 |
| 对话管理 | ConversationClosedEvent | 会话关闭时 | 任务管理,质量评估,知识库 |
| 对话管理 | SLAViolatedEvent | SLA违规时 | 治理监控,通知系统,客户画像 |
| 客户画像 | ProfileUpdatedEvent | 画像更新时 | CRM系统,通知系统,审计日志 |
| 客户画像 | RiskLevelChangedEvent | 风险变更时 | 治理监控,任务管理,通知系统 |
| 客户画像 | SLAStatusChangedEvent | SLA等级变更时 | 对话管理,通知系统,报表 |
| 需求管理 | RequirementExtractedEvent | 需求识别时 | 任务管理,客户画像,产品团队 |
| 需求管理 | RequirementStatusChangedEvent | 需求状态变更时 | 通知系统,报表 |
| 任务管理 | TaskCreatedEvent | 任务创建时 | 通知系统,报表 |
| 任务管理 | TaskCompletedEvent | 任务完成时 | 对话管理,报表,知识库 |
| 任务管理 | QualityIssueDetectedEvent | 质量问题检测时 | 任务管理,治理监控,通知系统 |
| AI分析 | SentimentAnalyzedEvent | 情感分析完成时 | 客户画像,治理监控,对话管理 |
| AI分析 | InsightGeneratedEvent | 生成洞察时 | 客户画像,任务管理,通知系统 |
| 知识库 | KnowledgeArticleCreatedEvent | 文章创建时 | 通知系统,AI分析 |
| 知识库 | KnowledgeRecommendedEvent | 推荐知识时 | 知识库,AI分析 |
| 治理监控 | ComplianceViolationDetectedEvent | 合规违规时 | 通知系统,审计日志,任务管理 |
| 治理监控 | PerformanceAlertEvent | 性能告警时 | 通知系统,治理监控 |

### 10.2 事件流图示例

```
用户发送消息流程:

1. MessageSentEvent
   ├─> SLACalculator: 更新响应时间
   ├─> ProfileUpdateHandler: 更新互动次数
   ├─> AIAnalysisService: 触发情感分析
   └─> KnowledgeService: 搜索相关知识

2. SentimentAnalyzedEvent (AI分析完成)
   ├─> ProfileUpdateHandler: 记录情感历史
   └─> RiskDetector: 检测负面情绪风险

3. RiskLevelChangedEvent (风险等级变更)
   ├─> NotificationService: 通知客户经理
   └─> TaskService: 创建跟进任务
```

---

**文档版本**: 1.0
**创建日期**: 2024年
**最后更新**: 2024年
**维护者**: 架构团队
