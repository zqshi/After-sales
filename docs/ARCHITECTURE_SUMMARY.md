# 智能售后工作台架构设计总览

## 文档导航

本文档是架构设计的总览和导航，详细内容请参阅各专项文档。

### 📚 核心架构文档

1. **[DDD战略设计](./architecture/DDD_STRATEGIC_DESIGN.md)**
   - 限界上下文识别（7个核心上下文）
   - 上下文映射关系
   - 聚合设计原则
   - 领域服务定义
   - 领域事件设计
   - 实施路线图

2. **[分层架构设计](./architecture/LAYERED_ARCHITECTURE.md)**
   - 四层架构详解
   - 展示层（Presentation Layer）
   - 应用层（Application Layer）
   - 领域层（Domain Layer）
   - 基础设施层（Infrastructure Layer）
   - 跨层通信模式
   - 设计模式应用

3. **[目录结构设计](./architecture/DIRECTORY_STRUCTURE.md)**
   - 完整目录树
   - 目录职责说明
   - 文件命名规范
   - 导入路径规范
   - 迁移计划

## 核心设计决策

### 1. 架构模式：DDD + 分层架构

```
┌─────────────────────────┐
│   Presentation Layer    │  ← UI、Controller、ViewModel
├─────────────────────────┤
│   Application Layer     │  ← Use Cases、Commands、Queries
├─────────────────────────┤
│     Domain Layer        │  ← Aggregates、Entities、Services
├─────────────────────────┤
│  Infrastructure Layer   │  ← Repositories、API Clients
└─────────────────────────┘
```

**核心原则**：
- 依赖倒置：外层依赖内层，内层不依赖外层
- 领域驱动：业务逻辑集中在Domain Layer
- 清晰分层：每层职责单一，边界清晰

### 2. 限界上下文（7个）

| 上下文 | 核心聚合 | 职责 |
|--------|----------|------|
| **Conversation** | Conversation | 多渠道对话管理 |
| **Customer Profile** | CustomerProfile | 客户360度画像 |
| **Requirement** | Requirement | 需求采集与管理 |
| **Task & Quality** | Task, QualityInspection | 任务与质检 |
| **AI Analysis** | AnalysisResult | AI辅助决策 |
| **Knowledge** | KnowledgeArticle | 知识库管理 |
| **Governance** | User, AuditLog | 治理与审计 |

### 3. 聚合设计

**聚合根**：事务一致性边界

```javascript
Conversation (聚合根)
├── messages: Message[]       // 实体集合
├── channel: Channel          // 值对象
├── status: Status           // 值对象
└── 行为:
    ├── sendMessage()
    ├── close()
    └── calculateSLA()
```

**设计原则**：
- 小聚合优于大聚合
- 通过ID引用其他聚合
- 跨聚合操作使用最终一致性

### 4. CQRS模式

**命令流**：修改状态

```
Command → Application Service → Aggregate → Repository → Database
                                    ↓
                              Domain Event
```

**查询流**：只读操作

```
Query → Application Service → Repository → ViewModel → View
```

### 5. 事件驱动

**领域事件**：

```javascript
MessageSentEvent
├── eventId: string
├── occurredAt: Date
├── conversationId: string
├── content: string
└── sender: string
```

**事件流**：

```
Aggregate → Domain Event → Event Bus → Event Handlers
                                          ↓
                                    ├─ Update Read Model
                                    ├─ Send Notification
                                    └─ Trigger Workflow
```

## 技术栈

### 前端技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **基础框架** | Vanilla JavaScript (ES Modules) | 轻量级，无框架依赖 |
| **样式** | Tailwind CSS v3 | 工具类CSS框架 |
| **图表** | Chart.js v4.4 | 数据可视化 |
| **构建** | Vite | 快速开发服务器 |
| **代码质量** | ESLint + Prettier | 代码检查和格式化 |
| **测试** | Vitest + Playwright | 单元测试 + E2E测试 |

### 后端技术栈（规划）

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **API网关** | Node.js + Express | RESTful API |
| **数据库** | PostgreSQL | 主存储 |
| **缓存** | Redis | 缓存和Session |
| **消息队列** | Kafka | 事件驱动 |
| **监控** | Prometheus + Grafana | 性能监控 |
| **日志** | ELK Stack | 日志聚合 |

## 目录结构概览

```
assets/js/
├── presentation/       # 展示层
│   ├── conversation/
│   ├── customer/
│   ├── requirement/
│   ├── task/
│   └── shared/
├── application/        # 应用层
│   ├── conversation/
│   ├── customer/
│   ├── requirement/
│   └── task/
├── domain/             # 领域层 ⭐核心
│   ├── conversation/
│   ├── customer/
│   ├── requirement/
│   ├── task/
│   ├── knowledge/
│   ├── ai/
│   └── shared/
└── infrastructure/     # 基础设施层
    ├── repositories/
    ├── api/
    ├── eventbus/
    └── cache/
```

## 关键流程示例

### 用例：发送消息

```
1. User clicks "Send" button
   ↓
2. ConversationController.sendMessage()
   ↓
3. ConversationApplicationService.sendMessage(command)
   ↓
4. Load Conversation aggregate from Repository
   ↓
5. conversation.sendMessage(content, sender)
   ├─ Validate business rules
   ├─ Create Message entity
   ├─ Add to messages collection
   └─ Raise MessageSentEvent
   ↓
6. Save aggregate to Repository
   ↓
7. Publish MessageSentEvent to Event Bus
   ↓
8. Event Handlers:
   ├─ Update customer interaction count
   ├─ Send notification to customer
   └─ Check if requirement detected
```

## 数据流

### 写操作（Command）

```
UI → ViewModel → Controller → Command
    → Application Service → Aggregate
    → Repository → API → Database
```

### 读操作（Query）

```
UI → Controller → Query
    → Application Service → Repository
    → API → Database
    → DTO → ViewModel → UI
```

### 事件流（Event）

```
Aggregate → Domain Event
    → Event Bus → Event Handlers
    ├─ Update Read Model
    ├─ Send Notification
    ├─ Trigger Workflow
    └─ Call External Service
```

## 设计模式应用

### 1. Repository模式

**目的**：抽象数据访问，隔离基础设施

```javascript
// Domain Layer - 接口定义
interface ConversationRepository {
  getById(id): Promise<Conversation>;
  save(conversation): Promise<void>;
  findAll(criteria): Promise<Conversation[]>;
}

// Infrastructure Layer - 实现
class ConversationRepositoryImpl implements ConversationRepository {
  // 实现细节：API调用、缓存等
}
```

### 2. Factory模式

**目的**：封装复杂对象创建逻辑

```javascript
class ConversationFactory {
  static create(data) {
    return new Conversation({
      conversationId: this.generateId(),
      ...data,
      status: 'active',
      createdAt: new Date(),
    });
  }
}
```

### 3. Specification模式

**目的**：封装业务规则，提高复用性

```javascript
class ConversationIsActiveSpec {
  isSatisfiedBy(conversation) {
    return conversation.status === 'active';
  }
}
```

### 4. 依赖注入（DI）

**目的**：解耦，便于测试

```javascript
// 容器配置
container.register('conversationRepo', (c) =>
  new ConversationRepositoryImpl(
    c.resolve('apiClient'),
    c.resolve('cache')
  )
);

container.register('conversationAppService', (c) =>
  new ConversationApplicationService(
    c.resolve('conversationRepo'),
    c.resolve('eventBus')
  )
);
```

## 测试策略

### 测试金字塔

```
         /\
        /E2E\        ← 少量端到端测试
       /------\
      /集成测试\      ← 适量集成测试
     /----------\
    /  单元测试  \    ← 大量单元测试
   /--------------\
```

### 覆盖率目标

- **整体覆盖率**：≥ 60%
- **Domain Layer**：≥ 80%（核心业务逻辑）
- **Application Layer**：≥ 70%
- **Infrastructure Layer**：≥ 50%

### 测试示例

```javascript
// 单元测试 - 领域模型
describe('Conversation', () => {
  it('should raise MessageSentEvent when sending message', () => {
    const conversation = new Conversation({ ... });
    conversation.sendMessage('Hello', 'user123');

    const events = conversation.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(MessageSentEvent);
  });
});

// 集成测试 - 应用服务
describe('ConversationApplicationService', () => {
  it('should save conversation after sending message', async () => {
    const service = new ConversationApplicationService(mockRepo, mockEventBus);
    await service.sendMessage({ conversationId: '1', content: 'Hi' });

    expect(mockRepo.save).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
```

## 性能优化策略

### 1. 缓存策略

```
Level 1: Memory Cache (ViewModel)
Level 2: LocalStorage Cache (Client)
Level 3: Redis Cache (Server)
Level 4: Database (Source of Truth)
```

### 2. 懒加载

- 按需加载模块
- 虚拟滚动长列表
- 图片懒加载

### 3. 批处理

- DOM操作批处理
- API请求合并
- 事件发布批处理

## 安全策略

### 1. 输入验证

- 所有用户输入必须验证
- 使用`sanitize.js`防XSS
- API参数类型检查

### 2. 权限控制

- RBAC模型
- 前后端双重校验
- 操作审计

### 3. 数据安全

- HTTPS传输
- 敏感数据加密
- Token安全存储

## 实施路线图

### Phase 1: 基础设施（当前-2周）
- ✅ 项目脚手架
- ✅ 分层架构搭建
- ✅ 核心工具库
- 🔄 目录结构迁移

### Phase 2: 领域层实现（2-3周）
- Conversation聚合
- CustomerProfile聚合
- Requirement聚合
- Task聚合
- 领域服务
- 领域事件

### Phase 3: 应用层实现（2周）
- 应用服务
- Commands & Queries
- DTOs
- 用例编排

### Phase 4: 基础设施实现（2-3周）
- Repository实现
- API客户端
- 事件总线
- 缓存管理

### Phase 5: 展示层重构（2周）
- ViewModels
- Controllers
- UI组件化

### Phase 6: 测试与优化（2周）
- 单元测试
- 集成测试
- 性能优化
- 文档完善

**总计**：约12-14周

## 质量指标

| 指标 | 当前值 | 目标值 |
|------|-------|-------|
| 代码质量评分 | 3.9/5 | 4.5/5 |
| 测试覆盖率 | 0% | 60% |
| 安全漏洞 | 2个高危 | 0个 |
| 代码重复率 | ~20% | < 5% |
| 平均函数行数 | ~80行 | < 50行 |
| 文档完整度 | 4.5/5 | 5/5 |

## 相关文档

### 架构设计
- [DDD战略设计](./architecture/DDD_STRATEGIC_DESIGN.md)
- [分层架构设计](./architecture/LAYERED_ARCHITECTURE.md)
- [目录结构设计](./architecture/DIRECTORY_STRUCTURE.md)
- [领域事件设计](./architecture/DOMAIN_EVENTS.md)
- [API设计规范](./API_DESIGN.md)
- [技术方案设计](./TECHNICAL_SOLUTIONS.md)

### 开发指南
- [开发指南](./development/DEVELOPMENT.md)

---

**文档版本**：v1.0
**最后更新**：2025-12-13
**作者**：架构团队
**审阅**：技术委员会

**下一步行动**：
1. 团队评审架构设计
2. 开始Phase 1目录结构迁移
3. 启动Phase 2领域层实现
