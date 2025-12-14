# 项目目录结构设计

## 1. 完整目录结构

```
After-sales/
├── index.html                          # 应用入口
├── config.js                           # 运行时配置（可选）
├── package.json
├── vite.config.js
├── .eslintrc.json
├── .prettierrc.json
├── .gitignore
│
├── docs/                               # 项目文档
│   ├── architecture/                   # 架构设计
│   │   ├── DDD_STRATEGIC_DESIGN.md    # DDD战略设计
│   │   ├── LAYERED_ARCHITECTURE.md    # 分层架构
│   │   ├── DIRECTORY_STRUCTURE.md     # 目录结构说明（本文档）
│   │   ├── DOMAIN_EVENTS.md           # 领域事件设计
│   │   └── API_DESIGN.md              # API设计规范
│   ├── api/                            # API文档
│   │   ├── API_CONTRACT_GUIDE.md      # API契约指南
│   │   ├── API_GATEWAY_SPEC.md        # 网关规范
│   │   └── API_OPENAPI_SPEC.md        # OpenAPI规范
│   ├── governance/                     # 治理文档
│   │   ├── GOVERNANCE_TRANSFORMATION_PLAN.md
│   │   ├── GOVERNANCE_CHECKLIST.md
│   │   └── SECURITY_GUIDELINES.md     # 安全指南
│   ├── development/                    # 开发文档
│   │   ├── CODING_STANDARDS.md        # 编码规范
│   │   ├── TESTING_GUIDE.md           # 测试指南
│   │   └── DEPLOYMENT_GUIDE.md        # 部署指南
│   ├── PROJECT_QUALITY_ASSESSMENT.md  # 质量评估报告
│   ├── TECHNICAL_DESIGN.md            # 技术设计
│   ├── FRONTEND_ARCHITECTURE.md       # 前端架构
│   ├── BACKEND_ARCHITECTURE.md        # 后端架构
│   └── MODULE_BACKLOG.md              # 模块待办
│
├── assets/                             # 资源文件
│   ├── js/                             # JavaScript源码
│   │   ├── main.js                     # 应用入口（依赖注入容器初始化）
│   │   │
│   │   ├── presentation/               # 展示层
│   │   │   ├── conversation/
│   │   │   │   ├── ConversationView.js
│   │   │   │   ├── ConversationController.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── MessageList.js
│   │   │   │   │   ├── MessageInput.js
│   │   │   │   │   └── ConversationCard.js
│   │   │   │   └── viewmodels/
│   │   │   │       ├── ConversationViewModel.js
│   │   │   │       └── MessageViewModel.js
│   │   │   │
│   │   │   ├── customer/
│   │   │   │   ├── ProfileView.js
│   │   │   │   ├── ProfileController.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProfileCard.js
│   │   │   │   │   ├── ContractInfo.js
│   │   │   │   │   ├── InteractionHistory.js
│   │   │   │   │   └── SLAIndicator.js
│   │   │   │   └── viewmodels/
│   │   │   │       └── ProfileViewModel.js
│   │   │   │
│   │   │   ├── requirement/
│   │   │   │   ├── RequirementView.js
│   │   │   │   ├── RequirementController.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── RequirementCard.js
│   │   │   │   │   ├── RequirementList.js
│   │   │   │   │   └── StatisticsChart.js
│   │   │   │   └── viewmodels/
│   │   │   │       └── RequirementViewModel.js
│   │   │   │
│   │   │   ├── task/
│   │   │   │   ├── TaskView.js
│   │   │   │   ├── TaskController.js
│   │   │   │   ├── QualityInspectionView.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── TaskCard.js
│   │   │   │   │   ├── TaskList.js
│   │   │   │   │   ├── QualityScoreCard.js
│   │   │   │   │   └── TaskActionPanel.js
│   │   │   │   └── viewmodels/
│   │   │   │       ├── TaskViewModel.js
│   │   │   │       └── QualityViewModel.js
│   │   │   │
│   │   │   ├── knowledge/
│   │   │   │   ├── KnowledgeView.js
│   │   │   │   ├── KnowledgeController.js
│   │   │   │   └── components/
│   │   │   │       ├── ArticleCard.js
│   │   │   │       └── SearchBar.js
│   │   │   │
│   │   │   ├── ai/
│   │   │   │   ├── AIAnalysisView.js
│   │   │   │   ├── AIController.js
│   │   │   │   └── components/
│   │   │   │       ├── AnalysisResult.js
│   │   │   │       └── SolutionCard.js
│   │   │   │
│   │   │   └── shared/
│   │   │       ├── components/           # 共享UI组件
│   │   │       │   ├── Button.js
│   │   │       │   ├── Modal.js
│   │   │       │   ├── Notification.js
│   │   │       │   ├── LoadingSpinner.js
│   │   │       │   ├── Dropdown.js
│   │   │       │   ├── Tabs.js
│   │   │       │   └── Badge.js
│   │   │       ├── formatters/           # 格式化工具
│   │   │       │   ├── DateFormatter.js
│   │   │       │   ├── CurrencyFormatter.js
│   │   │       │   └── StatusFormatter.js
│   │   │       └── layout/               # 布局组件
│   │   │           ├── Sidebar.js
│   │   │           ├── Header.js
│   │   │           └── RightPanel.js
│   │   │
│   │   ├── application/                # 应用层
│   │   │   ├── conversation/
│   │   │   │   ├── ConversationApplicationService.js
│   │   │   │   ├── commands/
│   │   │   │   │   ├── SendMessageCommand.js
│   │   │   │   │   ├── CloseConversationCommand.js
│   │   │   │   │   └── AddInternalNoteCommand.js
│   │   │   │   ├── queries/
│   │   │   │   │   ├── GetConversationQuery.js
│   │   │   │   │   ├── GetConversationListQuery.js
│   │   │   │   │   └── GetConversationHistoryQuery.js
│   │   │   │   └── dtos/
│   │   │   │       ├── ConversationDTO.js
│   │   │   │       └── MessageDTO.js
│   │   │   │
│   │   │   ├── customer/
│   │   │   │   ├── CustomerProfileApplicationService.js
│   │   │   │   ├── commands/
│   │   │   │   │   ├── RefreshProfileCommand.js
│   │   │   │   │   └── UpdateContactInfoCommand.js
│   │   │   │   ├── queries/
│   │   │   │   │   ├── GetProfileQuery.js
│   │   │   │   │   └── GetInteractionHistoryQuery.js
│   │   │   │   └── dtos/
│   │   │   │       ├── ProfileDTO.js
│   │   │   │       └── InteractionDTO.js
│   │   │   │
│   │   │   ├── requirement/
│   │   │   │   ├── RequirementApplicationService.js
│   │   │   │   ├── commands/
│   │   │   │   │   ├── CreateRequirementCommand.js
│   │   │   │   │   ├── ProcessRequirementCommand.js
│   │   │   │   │   ├── CompleteRequirementCommand.js
│   │   │   │   │   └── IgnoreRequirementCommand.js
│   │   │   │   ├── queries/
│   │   │   │   │   ├── GetRequirementListQuery.js
│   │   │   │   │   └── GetRequirementStatisticsQuery.js
│   │   │   │   └── dtos/
│   │   │   │       └── RequirementDTO.js
│   │   │   │
│   │   │   ├── task/
│   │   │   │   ├── TaskApplicationService.js
│   │   │   │   ├── QualityApplicationService.js
│   │   │   │   ├── commands/
│   │   │   │   │   ├── CreateTaskCommand.js
│   │   │   │   │   ├── AssignTaskCommand.js
│   │   │   │   │   ├── CompleteTaskCommand.js
│   │   │   │   │   └── InspectQualityCommand.js
│   │   │   │   ├── queries/
│   │   │   │   │   ├── GetTaskListQuery.js
│   │   │   │   │   └── GetQualityInspectionQuery.js
│   │   │   │   └── dtos/
│   │   │   │       ├── TaskDTO.js
│   │   │   │       └── QualityInspectionDTO.js
│   │   │   │
│   │   │   └── shared/
│   │   │       └── ApplicationService.js    # 基础应用服务类
│   │   │
│   │   ├── domain/                     # 领域层
│   │   │   ├── conversation/
│   │   │   │   ├── models/
│   │   │   │   │   ├── Conversation.js       # 聚合根
│   │   │   │   │   ├── Message.js            # 实体
│   │   │   │   │   ├── Channel.js            # 值对象
│   │   │   │   │   ├── ConversationStatus.js # 值对象
│   │   │   │   │   ├── SLAStatus.js          # 值对象
│   │   │   │   │   └── Participant.js        # 值对象
│   │   │   │   ├── services/
│   │   │   │   │   ├── SLACalculator.js      # 领域服务
│   │   │   │   │   └── ConversationMerger.js # 领域服务
│   │   │   │   ├── repositories/
│   │   │   │   │   └── ConversationRepository.js # 仓储接口
│   │   │   │   ├── events/
│   │   │   │   │   ├── MessageSentEvent.js
│   │   │   │   │   ├── ConversationClosedEvent.js
│   │   │   │   │   ├── SLAViolatedEvent.js
│   │   │   │   │   └── InternalNoteAddedEvent.js
│   │   │   │   ├── specifications/
│   │   │   │   │   ├── ConversationIsActiveSpec.js
│   │   │   │   │   └── SLAIsViolatedSpec.js
│   │   │   │   └── factories/
│   │   │   │       └── ConversationFactory.js
│   │   │   │
│   │   │   ├── customer/
│   │   │   │   ├── models/
│   │   │   │   │   ├── CustomerProfile.js    # 聚合根
│   │   │   │   │   ├── Contract.js           # 实体
│   │   │   │   │   ├── ServiceRecord.js      # 实体
│   │   │   │   │   ├── Commitment.js         # 实体
│   │   │   │   │   ├── Insight.js            # 实体
│   │   │   │   │   ├── Interaction.js        # 实体
│   │   │   │   │   ├── ContactInfo.js        # 值对象
│   │   │   │   │   ├── SLAInfo.js            # 值对象
│   │   │   │   │   ├── Metrics.js            # 值对象
│   │   │   │   │   └── RiskLevel.js          # 值对象
│   │   │   │   ├── services/
│   │   │   │   │   ├── RiskCalculator.js     # 领域服务
│   │   │   │   │   └── ProfileAggregator.js  # 领域服务
│   │   │   │   ├── repositories/
│   │   │   │   │   └── CustomerProfileRepository.js
│   │   │   │   ├── events/
│   │   │   │   │   ├── ProfileRefreshedEvent.js
│   │   │   │   │   ├── RiskLevelChangedEvent.js
│   │   │   │   │   └── SLAStatusChangedEvent.js
│   │   │   │   └── factories/
│   │   │   │       └── ProfileFactory.js
│   │   │   │
│   │   │   ├── requirement/
│   │   │   │   ├── models/
│   │   │   │   │   ├── Requirement.js        # 聚合根
│   │   │   │   │   ├── RequirementStatus.js  # 值对象
│   │   │   │   │   └── Priority.js           # 值对象
│   │   │   │   ├── services/
│   │   │   │   │   └── RequirementDetector.js # 领域服务
│   │   │   │   ├── repositories/
│   │   │   │   │   └── RequirementRepository.js
│   │   │   │   ├── events/
│   │   │   │   │   ├── RequirementCreatedEvent.js
│   │   │   │   │   ├── RequirementProcessedEvent.js
│   │   │   │   │   ├── RequirementCompletedEvent.js
│   │   │   │   │   └── RequirementIgnoredEvent.js
│   │   │   │   └── factories/
│   │   │   │       └── RequirementFactory.js
│   │   │   │
│   │   │   ├── task/
│   │   │   │   ├── models/
│   │   │   │   │   ├── Task.js               # 聚合根
│   │   │   │   │   ├── QualityInspection.js  # 聚合根
│   │   │   │   │   ├── TaskAction.js         # 实体
│   │   │   │   │   ├── QualityDimension.js   # 实体
│   │   │   │   │   ├── TaskStatus.js         # 值对象
│   │   │   │   │   └── QualityScore.js       # 值对象
│   │   │   │   ├── services/
│   │   │   │   │   ├── QualityScorer.js      # 领域服务
│   │   │   │   │   └── TaskGenerator.js      # 领域服务
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── TaskRepository.js
│   │   │   │   │   └── QualityInspectionRepository.js
│   │   │   │   ├── events/
│   │   │   │   │   ├── TaskCreatedEvent.js
│   │   │   │   │   ├── TaskAssignedEvent.js
│   │   │   │   │   ├── TaskCompletedEvent.js
│   │   │   │   │   └── QualityInspectedEvent.js
│   │   │   │   └── factories/
│   │   │   │       ├── TaskFactory.js
│   │   │   │       └── QualityInspectionFactory.js
│   │   │   │
│   │   │   ├── knowledge/
│   │   │   │   ├── models/
│   │   │   │   │   ├── KnowledgeArticle.js   # 聚合根
│   │   │   │   │   ├── Tag.js                # 值对象
│   │   │   │   │   └── Category.js           # 值对象
│   │   │   │   ├── services/
│   │   │   │   │   └── RelevanceScorer.js    # 领域服务
│   │   │   │   ├── repositories/
│   │   │   │   │   └── KnowledgeRepository.js
│   │   │   │   └── events/
│   │   │   │       └── ArticleAccessedEvent.js
│   │   │   │
│   │   │   ├── ai/
│   │   │   │   ├── models/
│   │   │   │   │   ├── AnalysisResult.js     # 聚合根
│   │   │   │   │   ├── Solution.js           # 实体
│   │   │   │   │   ├── Recommendation.js     # 实体
│   │   │   │   │   ├── Sentiment.js          # 值对象
│   │   │   │   │   └── Intent.js             # 值对象
│   │   │   │   ├── services/
│   │   │   │   │   ├── SentimentAnalyzer.js  # 领域服务
│   │   │   │   │   └── IntentRecognizer.js   # 领域服务
│   │   │   │   └── repositories/
│   │   │   │       └── AnalysisResultRepository.js
│   │   │   │
│   │   │   ├── governance/
│   │   │   │   ├── models/
│   │   │   │   │   ├── User.js               # 聚合根
│   │   │   │   │   ├── Role.js               # 实体
│   │   │   │   │   ├── Permission.js         # 值对象
│   │   │   │   │   └── AuditLog.js           # 聚合根
│   │   │   │   ├── services/
│   │   │   │   │   └── PermissionChecker.js  # 领域服务
│   │   │   │   └── repositories/
│   │   │   │       ├── UserRepository.js
│   │   │   │       └── AuditLogRepository.js
│   │   │   │
│   │   │   └── shared/                       # 共享内核
│   │   │       ├── Entity.js                 # 基础实体类
│   │   │       ├── ValueObject.js            # 基础值对象类
│   │   │       ├── AggregateRoot.js          # 基础聚合根类
│   │   │       ├── DomainEvent.js            # 基础领域事件类
│   │   │       ├── DomainEventPublisher.js   # 事件发布器
│   │   │       ├── Specification.js          # 规约基类
│   │   │       └── identifiers/              # 共享标识符
│   │   │           ├── ConversationId.js
│   │   │           ├── CustomerId.js
│   │   │           ├── RequirementId.js
│   │   │           └── TaskId.js
│   │   │
│   │   ├── infrastructure/              # 基础设施层
│   │   │   ├── repositories/
│   │   │   │   ├── ConversationRepositoryImpl.js
│   │   │   │   ├── CustomerProfileRepositoryImpl.js
│   │   │   │   ├── RequirementRepositoryImpl.js
│   │   │   │   ├── TaskRepositoryImpl.js
│   │   │   │   ├── QualityInspectionRepositoryImpl.js
│   │   │   │   ├── KnowledgeRepositoryImpl.js
│   │   │   │   ├── AnalysisResultRepositoryImpl.js
│   │   │   │   └── UserRepositoryImpl.js
│   │   │   │
│   │   │   ├── api/                          # API客户端
│   │   │   │   ├── ApiClient.js              # 基础API客户端
│   │   │   │   ├── ConversationApiClient.js
│   │   │   │   ├── CustomerApiClient.js
│   │   │   │   ├── RequirementApiClient.js
│   │   │   │   ├── TaskApiClient.js
│   │   │   │   ├── KnowledgeApiClient.js
│   │   │   │   └── AIApiClient.js
│   │   │   │
│   │   │   ├── eventbus/                     # 事件总线
│   │   │   │   ├── EventBus.js
│   │   │   │   ├── InMemoryEventBus.js
│   │   │   │   ├── RemoteEventBus.js
│   │   │   │   └── handlers/                 # 事件处理器
│   │   │   │       ├── MessageSentHandler.js
│   │   │   │       ├── ProfileRefreshedHandler.js
│   │   │   │       └── TaskCompletedHandler.js
│   │   │   │
│   │   │   ├── cache/                        # 缓存管理
│   │   │   │   ├── CacheManager.js
│   │   │   │   ├── LocalStorageCache.js
│   │   │   │   └── MemoryCache.js
│   │   │   │
│   │   │   ├── messaging/                    # 消息通信
│   │   │   │   ├── WebSocketManager.js
│   │   │   │   └── MessageQueue.js
│   │   │   │
│   │   │   ├── external/                     # 外部服务适配器
│   │   │   │   ├── CRMServiceAdapter.js
│   │   │   │   ├── AIServiceAdapter.js
│   │   │   │   └── KnowledgeServiceAdapter.js
│   │   │   │
│   │   │   └── persistence/                  # 持久化
│   │   │       └── MockDataProvider.js       # Mock数据提供者
│   │   │
│   │   └── core/                        # 核心工具库
│   │       ├── dom.js                   # DOM操作工具
│   │       ├── notifications.js         # 通知组件
│   │       ├── sanitize.js              # XSS防护
│   │       ├── storage.js               # 安全存储
│   │       ├── validators.js            # 验证工具
│   │       └── utils.js                 # 通用工具函数
│   │
│   ├── css/                             # 样式文件
│   │   ├── main.css                     # 主样式
│   │   ├── variables.css                # CSS变量
│   │   ├── components/                  # 组件样式
│   │   │   ├── button.css
│   │   │   ├── modal.css
│   │   │   └── notification.css
│   │   └── layouts/                     # 布局样式
│   │       ├── sidebar.css
│   │       └── grid.css
│   │
│   ├── images/                          # 图片资源
│   │   ├── icons/
│   │   └── logos/
│   │
│   └── mock-data/                       # Mock测试数据
│       ├── README.md
│       ├── conversations.json
│       ├── customer-profiles.json
│       ├── requirements.json
│       ├── tasks.json
│       └── knowledge-articles.json
│
├── tests/                               # 测试文件
│   ├── unit/                            # 单元测试
│   │   ├── domain/
│   │   │   ├── conversation/
│   │   │   │   ├── Conversation.test.js
│   │   │   │   └── SLACalculator.test.js
│   │   │   ├── customer/
│   │   │   │   ├── CustomerProfile.test.js
│   │   │   │   └── RiskCalculator.test.js
│   │   │   └── requirement/
│   │   │       └── RequirementDetector.test.js
│   │   ├── application/
│   │   │   └── conversation/
│   │   │       └── ConversationApplicationService.test.js
│   │   └── infrastructure/
│   │       └── repositories/
│   │           └── ConversationRepositoryImpl.test.js
│   │
│   ├── integration/                     # 集成测试
│   │   ├── api/
│   │   └── eventbus/
│   │
│   └── e2e/                             # 端到端测试
│       ├── conversation-flow.test.js
│       └── requirement-creation.test.js
│
├── scripts/                             # 构建和部署脚本
│   ├── build.sh
│   ├── deploy.sh
│   └── migrate-data.js
│
├── README.md
├── CHANGELOG.md
├── DEVELOPMENT.md
└── LICENSE
```

## 2. 目录职责说明

### 2.1 展示层（Presentation Layer）

**路径**：`assets/js/presentation/`

**职责**：
- 处理用户交互
- 渲染UI组件
- 调用应用服务
- 数据格式化（ViewModel）

**命名规范**：
- View文件：`*View.js`
- Controller文件：`*Controller.js`
- ViewModel文件：`*ViewModel.js`
- Component文件：描述性名称（如`MessageList.js`）

### 2.2 应用层（Application Layer）

**路径**：`assets/js/application/`

**职责**：
- 编排用例流程
- 事务控制
- 权限校验
- DTO转换

**命名规范**：
- 应用服务：`*ApplicationService.js`
- 命令：`*Command.js`
- 查询：`*Query.js`
- DTO：`*DTO.js`

### 2.3 领域层（Domain Layer）

**路径**：`assets/js/domain/`

**职责**：
- 核心业务逻辑
- 领域模型定义
- 业务规则验证
- 领域事件

**命名规范**：
- 聚合根：业务名词（如`Conversation.js`）
- 实体：业务名词（如`Message.js`）
- 值对象：业务名词（如`ContactInfo.js`）
- 领域服务：动作+名词（如`SLACalculator.js`）
- 事件：动作过去式+Event（如`MessageSentEvent.js`）
- 规约：名词+Spec（如`ConversationIsActiveSpec.js`）

### 2.4 基础设施层（Infrastructure Layer）

**路径**：`assets/js/infrastructure/`

**职责**：
- Repository实现
- API调用
- 事件总线
- 缓存管理
- 外部服务集成

**命名规范**：
- Repository实现：`*RepositoryImpl.js`
- API客户端：`*ApiClient.js`
- 适配器：`*Adapter.js`
- 处理器：`*Handler.js`

## 3. 模块间依赖关系

```
Presentation Layer
    ↓ (depends on)
Application Layer
    ↓ (depends on)
Domain Layer
    ↑ (implements)
Infrastructure Layer
```

## 4. 文件大小指导原则

- **单个文件**：≤ 300行（推荐）
- **聚合根**：≤ 500行（最大）
- **应用服务**：≤ 400行（最大）
- **View/Controller**：≤ 400行（最大）

超过限制时应考虑拆分。

## 5. 导入路径规范

### 5.1 相对路径vs绝对路径

- **同层级**：使用相对路径 `./`
- **子目录**：使用相对路径 `./subdir/`
- **父目录**：使用相对路径 `../`
- **跨层级**：使用绝对路径（从`assets/js/`开始）

### 5.2 导入示例

```javascript
// ✅ 正确：同层级
import { Conversation } from './Conversation.js';

// ✅ 正确：子目录
import { MessageSentEvent } from './events/MessageSentEvent.js';

// ✅ 正确：父目录
import { AggregateRoot } from '../shared/AggregateRoot.js';

// ✅ 正确：跨层级（绝对路径）
import { ConversationRepository } from '../../domain/conversation/ConversationRepository.js';
```

## 6. 测试文件组织

测试文件镜像源码结构：

```
tests/unit/domain/conversation/Conversation.test.js
    ↓ 对应
assets/js/domain/conversation/models/Conversation.js
```

## 7. 迁移计划

### 阶段1：创建新目录结构（1周）
- 创建所有目录
- 移动现有文件到对应目录
- 更新导入路径

### 阶段2：重构领域层（2周）
- 完成所有领域模型
- 实现领域服务
- 定义Repository接口

### 阶段3：重构应用层（1周）
- 创建应用服务
- 定义Commands和Queries
- 创建DTOs

### 阶段4：重构展示层（2周）
- 创建ViewModels
- 拆分Controllers
- 组件化UI

### 阶段5：实现基础设施层（2周）
- Repository实现
- 事件总线
- API客户端

---

**文档版本**：v1.0
**最后更新**：2025-12-13
**作者**：架构团队
