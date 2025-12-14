# 分层架构设计文档

## 1. 架构总览

### 1.1 四层架构

```
┌──────────────────────────────────────────────────────────┐
│                  Presentation Layer                       │
│                      (展示层)                              │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ UI Views   │  │ Controllers  │  │ View Models     │  │
│  │ Components │  │ Event        │  │ DTOs (Out)      │  │
│  │            │  │ Handlers     │  │                 │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────┘
                          ↓ ↑
┌──────────────────────────────────────────────────────────┐
│                  Application Layer                        │
│                     (应用层)                               │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Application│  │ Use Cases    │  │ DTOs (In)       │  │
│  │ Services   │  │ Workflows    │  │ Commands        │  │
│  │            │  │              │  │ Queries         │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────┘
                          ↓ ↑
┌──────────────────────────────────────────────────────────┐
│                    Domain Layer                           │
│                     (领域层)                               │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Aggregates │  │ Domain       │  │ Domain Events   │  │
│  │ Entities   │  │ Services     │  │ Specifications  │  │
│  │ Value      │  │ Repositories │  │ Factories       │  │
│  │ Objects    │  │ (Interfaces) │  │                 │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────┘
                          ↓ ↑
┌──────────────────────────────────────────────────────────┐
│                Infrastructure Layer                       │
│                   (基础设施层)                             │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Repository │  │ API Clients  │  │ Event Bus       │  │
│  │ Impl       │  │ External     │  │ Message Queue   │  │
│  │            │  │ Services     │  │ Cache           │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 1.2 依赖规则

1. **单向依赖**：外层只能依赖内层，内层不能依赖外层
2. **领域层隔离**：Domain Layer完全独立，不依赖任何框架
3. **接口在内实现在外**：Repository接口定义在Domain，实现在Infrastructure

## 2. 展示层（Presentation Layer）

### 2.1 职责

- 处理用户交互
- 展示数据
- 调用应用层服务
- 不包含业务逻辑

### 2.2 目录结构

```
assets/js/presentation/
├── conversation/
│   ├── ConversationView.js          # 对话视图
│   ├── ConversationController.js    # 对话控制器
│   ├── MessageListComponent.js      # 消息列表组件
│   └── viewmodels/
│       └── ConversationViewModel.js # 视图模型
├── customer/
│   ├── ProfileView.js               # 客户画像视图
│   ├── ProfileController.js         # 画像控制器
│   └── viewmodels/
│       └── ProfileViewModel.js
├── requirement/
│   ├── RequirementView.js
│   ├── RequirementController.js
│   └── viewmodels/
│       └── RequirementViewModel.js
├── task/
│   ├── TaskView.js
│   ├── TaskController.js
│   └── viewmodels/
│       └── TaskViewModel.js
└── shared/
    ├── components/                  # 共享UI组件
    │   ├── Button.js
    │   ├── Modal.js
    │   ├── Notification.js
    │   └── LoadingSpinner.js
    └── formatters/                  # 数据格式化工具
        ├── DateFormatter.js
        ├── CurrencyFormatter.js
        └── StatusFormatter.js
```

### 2.3 视图模型（ViewModel）

**目的**：将领域模型转换为UI友好的格式

```javascript
// ConversationViewModel.js
export class ConversationViewModel {
  constructor(conversation) {
    this.id = conversation.conversationId;
    this.customerName = conversation.getCustomerName();
    this.channelIcon = this.mapChannelIcon(conversation.channel);
    this.statusLabel = this.mapStatusLabel(conversation.status);
    this.statusColor = this.mapStatusColor(conversation.status);
    this.slaIndicator = this.mapSLAIndicator(conversation.sla);
    this.messageCount = conversation.messages.length;
    this.lastMessageTime = this.formatTime(conversation.getLastMessageTime());
  }

  mapChannelIcon(channel) {
    const iconMap = {
      feishu: 'fa-comments',
      qq: 'fa-qq',
      wechat: 'fa-wechat',
    };
    return iconMap[channel] || 'fa-comment';
  }

  // ... 其他映射方法
}
```

### 2.4 控制器（Controller）

**目的**：协调用户交互和应用层调用

```javascript
// ConversationController.js
import { ConversationApplicationService } from '../../application/conversation/ConversationApplicationService.js';
import { ConversationViewModel } from './viewmodels/ConversationViewModel.js';

export class ConversationController {
  constructor(applicationService, view) {
    this.applicationService = applicationService;
    this.view = view;
  }

  async loadConversations() {
    try {
      this.view.showLoading();
      const conversations = await this.applicationService.getAllConversations();
      const viewModels = conversations.map(c => new ConversationViewModel(c));
      this.view.renderConversations(viewModels);
    } catch (error) {
      this.view.showError('加载对话失败');
    } finally {
      this.view.hideLoading();
    }
  }

  async sendMessage(conversationId, content) {
    const command = { conversationId, content, sender: this.getCurrentUser() };
    await this.applicationService.sendMessage(command);
  }
}
```

## 3. 应用层（Application Layer）

### 3.1 职责

- 编排领域对象执行业务流程
- 事务控制
- 权限检查
- 调用基础设施服务

### 3.2 目录结构

```
assets/js/application/
├── conversation/
│   ├── ConversationApplicationService.js
│   ├── commands/
│   │   ├── SendMessageCommand.js
│   │   ├── CloseConversationCommand.js
│   │   └── AddInternalNoteCommand.js
│   ├── queries/
│   │   ├── GetConversationQuery.js
│   │   └── GetConversationHistoryQuery.js
│   └── dtos/
│       ├── ConversationDTO.js
│       └── MessageDTO.js
├── customer/
│   ├── CustomerProfileApplicationService.js
│   ├── commands/
│   │   └── RefreshProfileCommand.js
│   ├── queries/
│   │   ├── GetProfileQuery.js
│   │   └── GetInteractionHistoryQuery.js
│   └── dtos/
│       └── ProfileDTO.js
├── requirement/
│   ├── RequirementApplicationService.js
│   ├── commands/
│   │   ├── CreateRequirementCommand.js
│   │   ├── ProcessRequirementCommand.js
│   │   └── IgnoreRequirementCommand.js
│   └── queries/
│       └── GetRequirementStatisticsQuery.js
└── task/
    ├── TaskApplicationService.js
    ├── commands/
    │   ├── CreateTaskCommand.js
    │   ├── AssignTaskCommand.js
    │   └── CompleteTaskCommand.js
    └── queries/
        └── GetTaskListQuery.js
```

### 3.3 应用服务示例

```javascript
// ConversationApplicationService.js
import { ConversationRepository } from '../../domain/conversation/ConversationRepository.js';
import { CustomerProfileRepository } from '../../domain/customer/CustomerProfileRepository.js';
import { DomainEventPublisher } from '../../domain/shared/DomainEventPublisher.js';

export class ConversationApplicationService {
  constructor(conversationRepo, profileRepo, eventPublisher) {
    this.conversationRepo = conversationRepo;
    this.profileRepo = profileRepo;
    this.eventPublisher = eventPublisher;
  }

  /**
   * 发送消息用例
   */
  async sendMessage(command) {
    // 1. 验证权限
    this.checkPermission(command.sender, 'send_message');

    // 2. 加载聚合
    const conversation = await this.conversationRepo.getById(command.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // 3. 执行领域逻辑
    conversation.sendMessage(command.content, command.sender);

    // 4. 保存聚合
    await this.conversationRepo.save(conversation);

    // 5. 发布领域事件
    const events = conversation.getDomainEvents();
    events.forEach(event => this.eventPublisher.publish(event));

    // 6. 清除事件
    conversation.clearDomainEvents();

    return { success: true, messageId: conversation.getLastMessageId() };
  }

  /**
   * 获取对话列表查询
   */
  async getAllConversations(query) {
    const conversations = await this.conversationRepo.findAll(query);
    return conversations.map(c => this.toDTO(c));
  }

  toDTO(conversation) {
    return {
      id: conversation.conversationId,
      customerId: conversation.customerId,
      channel: conversation.channel,
      status: conversation.status,
      messageCount: conversation.getMessageCount(),
      lastMessageTime: conversation.getLastMessageTime(),
    };
  }

  checkPermission(userId, action) {
    // 权限检查逻辑
  }
}
```

### 3.4 命令（Command）和查询（Query）

**命令**：修改状态的操作

```javascript
// SendMessageCommand.js
export class SendMessageCommand {
  constructor(data) {
    this.conversationId = data.conversationId;
    this.content = data.content;
    this.sender = data.sender;
    this.timestamp = new Date();
  }

  validate() {
    if (!this.conversationId) throw new Error('ConversationId is required');
    if (!this.content) throw new Error('Content is required');
    if (!this.sender) throw new Error('Sender is required');
  }
}
```

**查询**：只读操作

```javascript
// GetConversationQuery.js
export class GetConversationQuery {
  constructor(data) {
    this.conversationId = data.conversationId;
    this.includeMessages = data.includeMessages || true;
  }
}
```

## 4. 领域层（Domain Layer）

### 4.1 职责

- 核心业务逻辑
- 业务规则验证
- 领域模型定义
- 不依赖外部框架

### 4.2 目录结构

```
assets/js/domain/
├── conversation/
│   ├── models/
│   │   ├── Conversation.js          # 聚合根
│   │   ├── Message.js               # 实体
│   │   ├── Channel.js               # 值对象
│   │   ├── ConversationStatus.js    # 值对象
│   │   └── SLAStatus.js             # 值对象
│   ├── services/
│   │   └── SLACalculator.js         # 领域服务
│   ├── repositories/
│   │   └── ConversationRepository.js # 仓储接口
│   ├── events/
│   │   ├── MessageSentEvent.js
│   │   ├── ConversationClosedEvent.js
│   │   └── SLAViolatedEvent.js
│   └── specifications/
│       └── ConversationIsActiveSpec.js
├── customer/
│   ├── models/
│   │   ├── CustomerProfile.js       # 聚合根
│   │   ├── Contract.js              # 实体
│   │   ├── ServiceRecord.js         # 实体
│   │   ├── ContactInfo.js           # 值对象
│   │   ├── SLAInfo.js               # 值对象
│   │   └── Metrics.js               # 值对象
│   ├── services/
│   │   ├── RiskCalculator.js        # 领域服务
│   │   └── ProfileAggregator.js     # 领域服务
│   ├── repositories/
│   │   └── CustomerProfileRepository.js
│   └── events/
│       ├── ProfileRefreshedEvent.js
│       └── RiskLevelChangedEvent.js
├── requirement/
│   ├── models/
│   │   ├── Requirement.js           # 聚合根
│   │   ├── RequirementStatus.js     # 值对象
│   │   └── Priority.js              # 值对象
│   ├── services/
│   │   └── RequirementDetector.js   # 领域服务
│   ├── repositories/
│   │   └── RequirementRepository.js
│   └── events/
│       ├── RequirementCreatedEvent.js
│       └── RequirementCompletedEvent.js
├── task/
│   ├── models/
│   │   ├── Task.js                  # 聚合根
│   │   ├── QualityInspection.js     # 聚合根
│   │   ├── TaskAction.js            # 实体
│   │   ├── TaskStatus.js            # 值对象
│   │   └── QualityScore.js          # 值对象
│   ├── services/
│   │   └── QualityScorer.js         # 领域服务
│   ├── repositories/
│   │   ├── TaskRepository.js
│   │   └── QualityInspectionRepository.js
│   └── events/
│       ├── TaskCreatedEvent.js
│       └── TaskCompletedEvent.js
└── shared/
    ├── Entity.js                    # 基础实体类
    ├── ValueObject.js               # 基础值对象类
    ├── AggregateRoot.js             # 基础聚合根类
    ├── DomainEvent.js               # 基础领域事件类
    └── DomainEventPublisher.js      # 事件发布器
```

### 4.3 聚合根基类

```javascript
// AggregateRoot.js
export class AggregateRoot {
  constructor() {
    this._domainEvents = [];
  }

  addDomainEvent(event) {
    this._domainEvents.push(event);
  }

  getDomainEvents() {
    return [...this._domainEvents];
  }

  clearDomainEvents() {
    this._domainEvents = [];
  }
}
```

### 4.4 聚合示例

```javascript
// Conversation.js
import { AggregateRoot } from '../shared/AggregateRoot.js';
import { Message } from './Message.js';
import { MessageSentEvent } from './events/MessageSentEvent.js';
import { ConversationClosedEvent } from './events/ConversationClosedEvent.js';

export class Conversation extends AggregateRoot {
  constructor(data) {
    super();
    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.channel = data.channel;
    this.status = data.status;
    this.messages = data.messages || [];
    this.sla = data.sla;
    this.createdAt = data.createdAt || new Date();
  }

  /**
   * 发送消息
   * @param {string} content - 消息内容
   * @param {string} sender - 发送者
   */
  sendMessage(content, sender) {
    // 业务规则验证
    if (!this.isActive()) {
      throw new Error('Cannot send message to closed conversation');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    // 创建消息实体
    const message = new Message({
      messageId: this.generateMessageId(),
      conversationId: this.conversationId,
      content,
      sender,
      timestamp: new Date(),
    });

    // 修改聚合状态
    this.messages.push(message);

    // 发布领域事件
    this.addDomainEvent(new MessageSentEvent({
      conversationId: this.conversationId,
      messageId: message.messageId,
      content,
      sender,
      timestamp: message.timestamp,
    }));

    // 重新计算SLA状态
    this.recalculateSLA();
  }

  /**
   * 关闭对话
   * @param {string} reason - 关闭原因
   * @param {string} closedBy - 关闭人
   */
  close(reason, closedBy) {
    if (!this.isActive()) {
      throw new Error('Conversation is already closed');
    }

    this.status = 'closed';
    this.closedAt = new Date();

    this.addDomainEvent(new ConversationClosedEvent({
      conversationId: this.conversationId,
      reason,
      closedBy,
      closedAt: this.closedAt,
    }));
  }

  /**
   * 判断对话是否活跃
   */
  isActive() {
    return this.status === 'active' || this.status === 'pending';
  }

  /**
   * 获取最后一条消息
   */
  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }

  /**
   * 获取消息数量
   */
  getMessageCount() {
    return this.messages.length;
  }

  /**
   * 重新计算SLA状态
   */
  recalculateSLA() {
    // SLA计算逻辑
    const now = new Date();
    const firstMessageTime = this.messages[0]?.timestamp;
    const responseTime = now - firstMessageTime;

    if (this.sla.type === 'gold' && responseTime > 15 * 60 * 1000) {
      this.sla.status = 'violated';
    }
  }

  generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 4.5 领域服务示例

```javascript
// RequirementDetector.js
export class RequirementDetector {
  constructor() {
    this.keywords = ['需要', '希望', '建议', '改进', '新增', '添加', '功能', '接口'];
  }

  /**
   * 从对话中检测需求
   * @param {Conversation} conversation
   * @returns {Requirement[]}
   */
  detectFromConversation(conversation) {
    const requirements = [];

    conversation.messages.forEach(message => {
      if (this.containsRequirementKeywords(message.content)) {
        const requirement = this.extractRequirement(message);
        if (requirement) {
          requirements.push(requirement);
        }
      }
    });

    return requirements;
  }

  containsRequirementKeywords(content) {
    return this.keywords.some(keyword => content.includes(keyword));
  }

  extractRequirement(message) {
    // 需求提取逻辑
    return {
      content: message.content,
      sourceMessageId: message.messageId,
      detectedAt: new Date(),
    };
  }
}
```

## 5. 基础设施层（Infrastructure Layer）

### 5.1 职责

- 实现Repository接口
- 调用外部API
- 事件总线
- 缓存管理
- 持久化

### 5.2 目录结构

```
assets/js/infrastructure/
├── repositories/
│   ├── ConversationRepositoryImpl.js
│   ├── CustomerProfileRepositoryImpl.js
│   ├── RequirementRepositoryImpl.js
│   └── TaskRepositoryImpl.js
├── api/
│   ├── ApiClient.js
│   ├── ConversationApiClient.js
│   ├── CustomerApiClient.js
│   ├── RequirementApiClient.js
│   └── TaskApiClient.js
├── eventbus/
│   ├── EventBus.js
│   ├── InMemoryEventBus.js
│   └── RemoteEventBus.js
├── cache/
│   ├── CacheManager.js
│   └── LocalStorageCache.js
├── messaging/
│   ├── WebSocketManager.js
│   └── MessageQueue.js
└── external/
    ├── CRMServiceAdapter.js
    ├── AIServiceAdapter.js
    └── KnowledgeServiceAdapter.js
```

### 5.3 Repository实现示例

```javascript
// ConversationRepositoryImpl.js
import { ConversationRepository } from '../../domain/conversation/ConversationRepository.js';
import { Conversation } from '../../domain/conversation/models/Conversation.js';
import { ConversationApiClient } from '../api/ConversationApiClient.js';

export class ConversationRepositoryImpl extends ConversationRepository {
  constructor(apiClient, cache) {
    super();
    this.apiClient = apiClient;
    this.cache = cache;
  }

  async getById(conversationId) {
    // 1. 尝试从缓存获取
    const cached = this.cache.get(`conversation:${conversationId}`);
    if (cached) {
      return this.toDomain(cached);
    }

    // 2. 从API获取
    const data = await this.apiClient.getConversation(conversationId);

    // 3. 转换为领域模型
    const conversation = this.toDomain(data);

    // 4. 缓存
    this.cache.set(`conversation:${conversationId}`, data, 300); // 5分钟

    return conversation;
  }

  async save(conversation) {
    // 1. 转换为API格式
    const data = this.toData(conversation);

    // 2. 调用API保存
    await this.apiClient.saveConversation(conversation.conversationId, data);

    // 3. 更新缓存
    this.cache.set(`conversation:${conversation.conversationId}`, data, 300);
  }

  async findAll(criteria) {
    const data = await this.apiClient.getConversations(criteria);
    return data.map(item => this.toDomain(item));
  }

  /**
   * 将API数据转换为领域模型
   */
  toDomain(data) {
    return new Conversation({
      conversationId: data.id,
      customerId: data.customerId,
      channel: data.channel,
      status: data.status,
      messages: data.messages || [],
      sla: data.sla,
      createdAt: new Date(data.createdAt),
    });
  }

  /**
   * 将领域模型转换为API数据
   */
  toData(conversation) {
    return {
      id: conversation.conversationId,
      customerId: conversation.customerId,
      channel: conversation.channel,
      status: conversation.status,
      messages: conversation.messages,
      sla: conversation.sla,
      createdAt: conversation.createdAt.toISOString(),
    };
  }
}
```

### 5.4 事件总线实现

```javascript
// EventBus.js
export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  subscribe(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);
  }

  async publish(event) {
    const eventType = event.constructor.name;
    const handlers = this.handlers.get(eventType) || [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error handling event ${eventType}:`, error);
      }
    }
  }

  unsubscribe(eventType, handler) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}
```

## 6. 跨层通信模式

### 6.1 命令流程

```
1. User Action (UI)
   ↓
2. Controller creates Command
   ↓
3. Application Service validates Command
   ↓
4. Application Service loads Aggregate (via Repository)
   ↓
5. Application Service calls Aggregate method
   ↓
6. Aggregate executes business logic
   ↓
7. Aggregate raises Domain Event
   ↓
8. Application Service saves Aggregate (via Repository)
   ↓
9. Application Service publishes Domain Events
   ↓
10. Event Handlers process Events
```

### 6.2 查询流程

```
1. User Request (UI)
   ↓
2. Controller creates Query
   ↓
3. Application Service processes Query
   ↓
4. Application Service calls Repository
   ↓
5. Repository fetches data (from API/Cache)
   ↓
6. Application Service creates DTO
   ↓
7. Controller creates ViewModel
   ↓
8. View renders ViewModel
```

## 7. 关键设计模式

### 7.1 依赖注入（DI）

```javascript
// 容器配置
class DIContainer {
  constructor() {
    this.services = new Map();
  }

  register(name, factory) {
    this.services.set(name, factory);
  }

  resolve(name) {
    const factory = this.services.get(name);
    return factory(this);
  }
}

// 注册服务
const container = new DIContainer();

container.register('apiClient', () => new ApiClient());
container.register('cache', () => new LocalStorageCache());
container.register('eventBus', () => new EventBus());

container.register('conversationRepo', (c) =>
  new ConversationRepositoryImpl(c.resolve('apiClient'), c.resolve('cache'))
);

container.register('conversationAppService', (c) =>
  new ConversationApplicationService(
    c.resolve('conversationRepo'),
    c.resolve('profileRepo'),
    c.resolve('eventBus')
  )
);
```

### 7.2 工厂模式

```javascript
// ConversationFactory.js
export class ConversationFactory {
  static create(data) {
    return new Conversation({
      conversationId: data.conversationId || this.generateId(),
      customerId: data.customerId,
      channel: data.channel,
      status: 'active',
      messages: [],
      sla: this.createDefaultSLA(data.customerLevel),
      createdAt: new Date(),
    });
  }

  static createDefaultSLA(customerLevel) {
    // 根据客户等级创建默认SLA
  }

  static generateId() {
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 7.3 规约模式（Specification）

```javascript
// ConversationIsActiveSpec.js
export class ConversationIsActiveSpecification {
  isSatisfiedBy(conversation) {
    return conversation.status === 'active' || conversation.status === 'pending';
  }
}

// 使用
const spec = new ConversationIsActiveSpecification();
const activeConversations = conversations.filter(c => spec.isSatisfiedBy(c));
```

## 8. 测试策略

### 8.1 单元测试

- **领域层**：测试聚合、实体、值对象的业务逻辑
- **应用层**：测试用例编排逻辑（使用Mock Repository）
- **基础设施层**：测试Repository实现（使用Mock API）

### 8.2 集成测试

- 测试跨层交互
- 测试API集成
- 测试事件流程

### 8.3 端到端测试

- 测试完整用户场景
- 使用真实UI和Mock后端

---

**文档版本**：v1.0
**最后更新**：2025-12-13
**作者**：架构团队
