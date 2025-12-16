# 核心上下文剩余建设计划

> **文档版本**: v1.0
> **创建日期**: 2024-12-15
> **最后更新**: 2024-12-15
> **文档状态**: 生效中

---

## 📊 执行摘要

根据代码探索，5个核心领域上下文的实现状态如下:

| 上下文 | 后端完成度 | 前端完成度 | 优先级 | 预计工时 |
|--------|-----------|-----------|--------|---------|
| **Conversation** | 85% | 100% | P1 | 15小时 |
| **Customer** | 10% | 95% | P1 | 90小时 |
| **Requirement** | 0% | 95% | P1 | 85小时 |
| **Task** | 0% | 70% | P1 | 95小时 |
| **Knowledge** | 0% | 0% | P2 | 95小时 |

**总计剩余工时**: 380小时（约9-10周，单人开发）

---

## 🎯 一、Conversation（对话）上下文 - 剩余15%

### 当前状态
✅ **已完成**：聚合根、领域事件、领域服务、Repository、3个Use Cases、3个API端点
❌ **缺失**：创建对话、对话列表查询功能

### 剩余建设内容

#### 1.1 后端补充组件

**Use Cases**（3个）
- `CreateConversationUseCase.ts` - 创建新对话
  - 输入：customerId, channel, initialMessage
  - 输出：conversationId
  - 业务逻辑：验证客户、发布ConversationCreatedEvent

- `ListConversationsUseCase.ts` - 查询对话列表
  - 输入：过滤条件（status, agentId, customerId）+ 分页参数
  - 输出：对话列表 + 总数

- `AssignAgentUseCase.ts` - 分配客服
  - 输入：conversationId, agentId
  - 输出：更新后的对话
  - 业务逻辑：调用聚合根的assign方法、发布ConversationAssignedEvent

**API Controllers**（2个新端点）
- `POST /api/conversations` - 创建对话
- `GET /api/conversations` - 获取对话列表（支持过滤和分页）

**DTO**
- `CreateConversationRequestDTO.ts`
- `ConversationListQueryDTO.ts`
- `ConversationListResponseDTO.ts`

#### 1.2 Repository增强
- 在 `ConversationRepository` 中添加：
  - `findByFilters(filters, pagination)` - 支持复杂查询
  - `countByFilters(filters)` - 统计数量

### 预计工时
- Use Cases: 6小时
- API Controllers: 4小时
- Repository增强: 2小时
- 测试用例: 3小时
- **总计: 15小时**

---

## 🎯 二、Customer（客户画像）上下文 - 剩余90%

### 当前状态
✅ **前端完整**：CustomerProfile聚合根、6个领域事件、Repository、应用服务
✅ **后端部分**：CustomerProfileEntity（数据库实体）
❌ **后端缺失**：完整的DDD层实现

### 剩余建设内容

#### 2.1 领域层（Domain Layer）

**聚合根**
- `CustomerProfile.ts` - 客户画像聚合根
  - 属性：customerId, name, contactInfo, slaInfo, metrics, insights, interactions, serviceRecords, commitments
  - 方法：
    - `refresh()` - 刷新画像数据
    - `addServiceRecord()` - 添加服务记录
    - `updateCommitment()` - 更新承诺进度
    - `addInteraction()` - 添加互动记录
    - `markAsVIP()` - 标记为VIP
    - `calculateHealthScore()` - 计算健康度
    - `evaluateRiskLevel()` - 评估流失风险

**值对象**（6个）
- `ContactInfo.ts` - 联系方式
- `SLAInfo.ts` - SLA信息
- `Metrics.ts` - 统计指标
- `Insight.ts` - 洞察信息
- `Interaction.ts` - 互动记录
- `ServiceRecord.ts` - 服务记录

**领域事件**（6个）
- `ProfileRefreshedEvent.ts`
- `RiskLevelChangedEvent.ts`
- `ServiceRecordAddedEvent.ts`
- `CommitmentProgressUpdatedEvent.ts`
- `InteractionAddedEvent.ts`
- `CustomerMarkedAsVIPEvent.ts`

**领域服务**
- `HealthScoreCalculator.ts` - 健康度计算服务
  - 根据互动频率、满意度、SLA达成率等计算健康度
- `RiskEvaluator.ts` - 流失风险评估服务
  - 根据历史数据预测流失概率

#### 2.2 应用层（Application Layer）

**Use Cases**（6个）
- `GetCustomerProfileUseCase.ts` - 获取客户画像
- `RefreshCustomerProfileUseCase.ts` - 刷新画像
- `AddServiceRecordUseCase.ts` - 添加服务记录
- `UpdateCommitmentProgressUseCase.ts` - 更新承诺进度
- `AddInteractionUseCase.ts` - 添加互动
- `MarkCustomerAsVIPUseCase.ts` - 标记VIP

**Command对象**（5个）
- `RefreshProfileCommand.ts`
- `AddServiceRecordCommand.ts`
- `UpdateCommitmentCommand.ts`
- `AddInteractionCommand.ts`
- `MarkAsVIPCommand.ts`

**Query对象**（2个）
- `GetProfileQuery.ts`
- `GetInteractionsQuery.ts`

#### 2.3 基础设施层（Infrastructure Layer）

**Repository实现**
- `CustomerProfileRepository.ts` - 实现ICustomerProfileRepository
  - `findById(customerId)` - 按ID查询
  - `save(profile)` - 保存画像
  - `findInteractions(customerId)` - 查询互动记录
  - 支持事件持久化

**Mapper**
- `CustomerProfileMapper.ts` - 领域模型 ↔ 数据库实体映射

#### 2.4 表现层（Presentation Layer）

**Controllers**（2个）
- `CustomerProfileController.ts`
  - `GET /api/customers/:id` - 获取客户画像
  - `POST /api/customers/:id/refresh` - 刷新画像
  - `GET /api/customers/:id/interactions` - 获取互动记录

- `CustomerActionController.ts`
  - `POST /api/customers/:id/service-records` - 添加服务记录
  - `PATCH /api/customers/:id/commitments/:commitmentId` - 更新承诺
  - `POST /api/customers/:id/interactions` - 添加互动
  - `POST /api/customers/:id/mark-vip` - 标记VIP

**DTO**（8个）
- `CustomerProfileResponseDTO.ts`
- `RefreshProfileRequestDTO.ts`
- `AddServiceRecordRequestDTO.ts`
- `UpdateCommitmentRequestDTO.ts`
- `AddInteractionRequestDTO.ts`
- `MarkVIPRequestDTO.ts`
- `InteractionListResponseDTO.ts`
- `ServiceRecordResponseDTO.ts`

**Routes**
- `customerRoutes.ts` - 注册7个API端点

#### 2.5 测试

**单元测试**（15个）
- CustomerProfile聚合根测试（8个用例）
- 值对象测试（3个用例）
- 领域服务测试（4个用例）

**集成测试**（12个）
- Repository测试（6个用例）
- Use Case测试（6个用例）

**E2E测试**（8个）
- API端点测试（7个端点）

### 预计工时
- 领域层: 25小时
- 应用层: 18小时
- 基础设施层: 12小时
- 表现层: 15小时
- 测试: 20小时
- **总计: 90小时（2.5周）**

### 关键文件路径
```
backend/src/
├── domain/customer/
│   ├── models/CustomerProfile.ts          【新建】
│   ├── value-objects/
│   │   ├── ContactInfo.ts                 【新建】
│   │   ├── SLAInfo.ts                     【新建】
│   │   └── Metrics.ts                     【新建】
│   ├── events/                            【新建6个事件】
│   ├── services/
│   │   ├── HealthScoreCalculator.ts       【新建】
│   │   └── RiskEvaluator.ts               【新建】
│   └── repositories/ICustomerProfileRepository.ts 【新建】
├── application/use-cases/customer/        【新建6个用例】
├── infrastructure/repositories/CustomerProfileRepository.ts 【新建】
└── presentation/http/controllers/         【新建2个控制器】
```

---

## 🎯 三、Requirement（需求采集）上下文 - 剩余100%

### 当前状态
✅ **前端完整**：Requirement聚合根、2个领域事件、检测服务、Repository
✅ **后端部分**：RequirementEntity（数据库实体）
❌ **后端缺失**：完整的DDD层实现

### 剩余建设内容

#### 3.1 领域层（Domain Layer）

**聚合根**
- `Requirement.ts` - 需求聚合根
  - 属性：id, customerId, conversationId, title, description, category, priority, status, source
  - 方法：
    - `create()` - 创建需求
    - `updateStatus()` - 更新状态
    - `changePriority()` - 修改优先级
    - `resolve()` - 标记已解决
    - `ignore()` - 忽略需求
    - `cancel()` - 取消需求

**值对象**（2个）
- `RequirementSource.ts` - 需求来源（对话、工单、主动采集）
- `Priority.ts` - 优先级（紧急、高、中、低）

**领域事件**（3个）
- `RequirementCreatedEvent.ts`
- `RequirementStatusChangedEvent.ts`
- `RequirementPriorityChangedEvent.ts`

**领域服务**
- `RequirementDetectorService.ts` - 需求检测服务
  - 从对话消息中自动检测需求
  - 使用NLP/规则引擎识别需求类型

#### 3.2 应用层（Application Layer）

**Use Cases**（5个）
- `CreateRequirementUseCase.ts` - 创建需求
- `GetRequirementUseCase.ts` - 获取需求详情
- `ListRequirementsUseCase.ts` - 查询需求列表
- `UpdateRequirementStatusUseCase.ts` - 更新需求状态
- `DeleteRequirementUseCase.ts` - 删除需求

**Command对象**（3个）
- `CreateRequirementCommand.ts`
- `UpdateStatusCommand.ts`
- `ChangePriorityCommand.ts`

**Query对象**（2个）
- `GetRequirementQuery.ts`
- `ListRequirementsQuery.ts`

#### 3.3 基础设施层（Infrastructure Layer）

**Repository实现**
- `RequirementRepository.ts` - 实现IRequirementRepository
  - `findById(id)` - 按ID查询
  - `findByFilters(filters)` - 条件查询
  - `save(requirement)` - 保存需求
  - `delete(id)` - 删除需求

**Mapper**
- `RequirementMapper.ts` - 领域模型 ↔ 数据库实体映射

#### 3.4 表现层（Presentation Layer）

**Controllers**
- `RequirementController.ts`
  - `POST /api/requirements` - 创建需求
  - `GET /api/requirements/:id` - 获取需求详情
  - `GET /api/requirements` - 获取需求列表（支持过滤和分页）
  - `PATCH /api/requirements/:id/status` - 更新状态
  - `DELETE /api/requirements/:id` - 删除需求

**DTO**（6个）
- `CreateRequirementRequestDTO.ts`
- `RequirementResponseDTO.ts`
- `RequirementListQueryDTO.ts`
- `RequirementListResponseDTO.ts`
- `UpdateStatusRequestDTO.ts`
- `RequirementFilterDTO.ts`

**Routes**
- `requirementRoutes.ts` - 注册5个API端点

#### 3.5 测试

**单元测试**（13个）
- Requirement聚合根测试（8个用例）
- 值对象测试（2个用例）
- 领域服务测试（3个用例）

**集成测试**（10个）
- Repository测试（5个用例）
- Use Case测试（5个用例）

**E2E测试**（8个）
- API端点测试（5个端点 + 边界场景）

### 预计工时
- 领域层: 22小时
- 应用层: 16小时
- 基础设施层: 10小时
- 表现层: 14小时
- 测试: 23小时
- **总计: 85小时（2周）**

### 关键文件路径
```
backend/src/
├── domain/requirement/
│   ├── models/Requirement.ts              【新建】
│   ├── value-objects/
│   │   ├── RequirementSource.ts           【新建】
│   │   └── Priority.ts                    【新建】
│   ├── events/                            【新建3个事件】
│   ├── services/RequirementDetectorService.ts 【新建】
│   └── repositories/IRequirementRepository.ts 【新建】
├── application/use-cases/requirement/     【新建5个用例】
├── infrastructure/repositories/RequirementRepository.ts 【新建】
└── presentation/http/controllers/RequirementController.ts 【新建】
```

---

## 🎯 四、Task（任务管理）上下文 - 剩余100%

### 当前状态
✅ **前端部分**：Task聚合根、4个领域事件
❌ **前端缺失**：Repository、应用服务
✅ **后端部分**：TaskEntity（数据库实体）
❌ **后端缺失**：完整的DDD层实现

### 剩余建设内容

#### 4.1 领域层（Domain Layer）

**聚合根**
- `Task.ts` - 任务聚合根
  - 属性：id, title, type, assigneeId, conversationId, requirementId, status, priority, dueDate, qualityScore
  - 方法：
    - `create()` - 创建任务
    - `start()` - 开始任务
    - `complete()` - 完成任务
    - `cancel()` - 取消任务
    - `reassign()` - 重新分配
    - `evaluateQuality()` - 评估质量

**值对象**（2个）
- `QualityScore.ts` - 质量评分（时效性、完整性、满意度）
- `TaskPriority.ts` - 任务优先级

**领域事件**（5个）
- `TaskCreatedEvent.ts`
- `TaskStartedEvent.ts`
- `TaskCompletedEvent.ts`
- `TaskCancelledEvent.ts`
- `TaskReassignedEvent.ts`

**领域服务**
- `TaskAssignmentService.ts` - 任务分配服务
  - 根据客服负载、技能匹配度自动分配任务
- `QualityEvaluator.ts` - 质量评估服务
  - 评估任务完成质量

#### 4.2 应用层（Application Layer）

**Use Cases**（6个）
- `CreateTaskUseCase.ts` - 创建任务
- `GetTaskUseCase.ts` - 获取任务详情
- `ListTasksUseCase.ts` - 查询任务列表
- `AssignTaskUseCase.ts` - 分配任务
- `UpdateTaskStatusUseCase.ts` - 更新状态
- `CompleteTaskUseCase.ts` - 完成任务

**Command对象**（4个）
- `CreateTaskCommand.ts`
- `AssignTaskCommand.ts`
- `UpdateStatusCommand.ts`
- `CompleteTaskCommand.ts`

**Query对象**（2个）
- `GetTaskQuery.ts`
- `ListTasksQuery.ts`

#### 4.3 基础设施层（Infrastructure Layer）

**Repository实现**
- `TaskRepository.ts` - 实现ITaskRepository
  - `findById(id)` - 按ID查询
  - `findByAssignee(assigneeId)` - 按负责人查询
  - `findByFilters(filters)` - 条件查询
  - `save(task)` - 保存任务

**Mapper**
- `TaskMapper.ts` - 领域模型 ↔ 数据库实体映射

#### 4.4 表现层（Presentation Layer）

**Controllers**
- `TaskController.ts`
  - `POST /api/tasks` - 创建任务
  - `GET /api/tasks/:id` - 获取任务详情
  - `GET /api/tasks` - 获取任务列表（支持过滤和分页）
  - `POST /api/tasks/:id/assign` - 分配任务
  - `PATCH /api/tasks/:id/status` - 更新状态
  - `POST /api/tasks/:id/complete` - 完成任务

**DTO**（7个）
- `CreateTaskRequestDTO.ts`
- `TaskResponseDTO.ts`
- `TaskListQueryDTO.ts`
- `TaskListResponseDTO.ts`
- `AssignTaskRequestDTO.ts`
- `UpdateStatusRequestDTO.ts`
- `CompleteTaskRequestDTO.ts`

**Routes**
- `taskRoutes.ts` - 注册6个API端点

#### 4.5 前端补充（Frontend）

**Repository**
- `assets/js/infrastructure/repositories/TaskRepository.js` - 实现任务数据访问

**应用服务**
- `assets/js/application/task/TaskApplicationService.js` - 任务应用服务

**事件处理器**（4个）
- `TaskStartedEventHandler.js`
- `TaskCompletedEventHandler.js`
- `TaskCancelledEventHandler.js`
- `TaskReassignedEventHandler.js`

#### 4.6 测试

**单元测试**（15个）
- Task聚合根测试（9个用例）
- 值对象测试（2个用例）
- 领域服务测试（4个用例）

**集成测试**（12个）
- Repository测试（6个用例）
- Use Case测试（6个用例）

**E2E测试**（10个）
- API端点测试（6个端点 + 复杂场景）

### 预计工时
- 领域层: 24小时
- 应用层: 18小时
- 基础设施层: 12小时
- 表现层: 16小时
- 前端补充: 8小时
- 测试: 17小时
- **总计: 95小时（2.5周）**

### 关键文件路径
```
backend/src/
├── domain/task/
│   ├── models/Task.ts                     【新建】
│   ├── value-objects/
│   │   ├── QualityScore.ts                【新建】
│   │   └── TaskPriority.ts                【新建】
│   ├── events/                            【新建5个事件】
│   ├── services/
│   │   ├── TaskAssignmentService.ts       【新建】
│   │   └── QualityEvaluator.ts            【新建】
│   └── repositories/ITaskRepository.ts    【新建】
├── application/use-cases/task/            【新建6个用例】
├── infrastructure/repositories/TaskRepository.ts 【新建】
└── presentation/http/controllers/TaskController.ts 【新建】

assets/js/
├── infrastructure/repositories/TaskRepository.js  【新建】
└── application/task/TaskApplicationService.js     【新建】
```

---

## 🎯 五、Knowledge（知识库）上下文 - 剩余100%（可选）

### 优先级说明
Knowledge上下文是**P2优先级**，可在v1.0后作为v1.1功能实现。

### 剩余建设内容概要

#### 5.1 领域层
- `KnowledgeItem.ts` - 知识条目聚合根
- `KnowledgeCategory.ts` - 知识分类值对象
- `KnowledgeRecommender.ts` - 知识推荐服务
- 3个领域事件

#### 5.2 应用层
- 4个Use Cases（创建、查询、更新、删除知识）

#### 5.3 基础设施层
- `KnowledgeRepository.ts`
- 搜索引擎集成（Elasticsearch）

#### 5.4 表现层
- 4个API端点
- AI服务集成（知识推荐、智能搜索）

#### 5.5 前端
- 完整的前端领域模型和UI

### 预计工时
- **总计: 95小时（2.5周）**

---

## 📋 实施路线图

### 阶段1: 快速补齐 Conversation（本周）
- 完成Conversation的创建和列表功能
- **工时**: 15小时
- **目标**: Conversation上下文100%完成

### 阶段2: Customer上下文（第2-3周）
- 实现完整的后端DDD层
- **工时**: 90小时
- **目标**: 客户画像功能上线

### 阶段3: Requirement上下文（第4-5周）
- 实现完整的后端DDD层
- **工时**: 85小时
- **目标**: 需求采集功能上线

### 阶段4: Task上下文（第6-7周）
- 实现完整的后端DDD层 + 前端补充
- **工时**: 95小时
- **目标**: 任务管理功能上线

### 阶段5: Knowledge上下文（可选，第8-9周）
- 实现完整的前后端
- **工时**: 95小时
- **目标**: 知识库功能上线

---

## 📊 工作量汇总

| 上下文 | 领域层 | 应用层 | 基础设施层 | 表现层 | 前端 | 测试 | 总计 |
|--------|--------|--------|-----------|--------|------|------|------|
| Conversation | - | 6h | 2h | 4h | - | 3h | **15h** |
| Customer | 25h | 18h | 12h | 15h | - | 20h | **90h** |
| Requirement | 22h | 16h | 10h | 14h | - | 23h | **85h** |
| Task | 24h | 18h | 12h | 16h | 8h | 17h | **95h** |
| Knowledge | 22h | 15h | 18h | 15h | 15h | 10h | **95h** |
| **总计** | 93h | 73h | 54h | 64h | 23h | 73h | **380h** |

---

## 🚀 关键建议

### 1. 优先级排序
**必须完成（v1.0）**：
- ✅ Conversation（补齐15小时）
- ✅ Customer（90小时）
- ✅ Requirement（85小时）
- ✅ Task（95小时）

**可延后（v1.1）**：
- ⏳ Knowledge（95小时）

### 2. 人力配置建议
**方案A - 单人开发**：
- 总工时：285小时（不含Knowledge）
- 预计周期：7-8周
- 完成日期：2025年2月初

**方案B - 双人并行**（推荐）：
- 并行策略：
  - 人员1：Conversation + Customer
  - 人员2：Requirement + Task
- 预计周期：4-5周
- 完成日期：2025年1月中旬

### 3. 技术依赖
- ✅ DDD基础框架（已完成）
- ✅ 数据库实体（已完成）
- ✅ 事件总线（已完成）
- ⏳ Docker环境（需修复）
- ⏳ 测试基础设施（需搭建）

### 4. 风险控制
- **代码复用**：参考Conversation的实现模式
- **TDD开发**：严格遵循测试驱动开发
- **增量交付**：每完成一个上下文立即验证
- **持续集成**：配置CI/CD确保代码质量

---

## ✅ 验收标准

每个上下文完成时需满足：
- ✅ 聚合根包含完整业务逻辑
- ✅ 领域事件机制完整
- ✅ Repository支持CQRS
- ✅ API端点全部可用
- ✅ 单元测试覆盖率 ≥ 80%
- ✅ 集成测试覆盖核心场景
- ✅ E2E测试通过
- ✅ 前后端联调成功

---

## 📚 相关文档

- [生产就绪状态报告](../PRODUCTION_READINESS_STATUS.md)
- [投产差距分析](../PRODUCTION_GAP_ANALYSIS.md)
- [实施进度跟踪](../IMPLEMENTATION_PROGRESS.md)
- [DDD战略设计](./architecture/DDD_STRATEGIC_DESIGN.md)
- [API设计文档](./API_DESIGN.md)

---

**最终目标**: 4个核心上下文（Conversation、Customer、Requirement、Task）完整实现，为生产就绪奠定坚实基础。
