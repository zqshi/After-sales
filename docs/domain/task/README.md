# 任务管理域（Task）设计

## 领域边界
- 负责任务生命周期、指派、状态流转、质量评分（若需要）。
- 可关联需求/对话，但不负责需求识别或对话消息管理。

## 后端设计概览
- 聚合根: `Task`
- 值对象: `TaskPriority`, `QualityScore`
- 领域事件: `TaskCreated`, `TaskStarted`, `TaskCompleted`, `TaskCancelled`, `TaskReassigned`
- 仓储接口: `ITaskRepository`

## 后端接口设计
- `POST /api/tasks` 创建任务
- `GET /api/tasks/:id` 任务详情
- `GET /api/tasks` 任务列表
- `POST /api/tasks/:id/assign` 指派
- `PATCH /api/tasks/:id/status` 更新状态
- `POST /api/tasks/:id/complete` 完成任务
- `POST /api/tasks/:id/actions` 通用动作入口

## 前端设计概览
- 领域模型: `Task`
- 基础设施仓储: `TaskRepository`
- API 调用: `/api/tasks/*`

## 主要时序图
```mermaid
sequenceDiagram
  autonumber
  participant UI as Task UI
  participant API as Task API
  participant Domain as Task

  UI->>API: POST /api/tasks
  API->>Domain: create
  Domain-->>API: TaskCreated
  API-->>UI: task
```

## 主要架构图
```mermaid
flowchart LR
  UI[Task UI] --> API[Task Controller]
  API --> App[Use Cases]
  App --> Domain[Task Domain]
  Domain --> Repo[Task Repository]
  Repo --> DB[(Database)]
```

## 完整性检查与缺口
- 前后端接口契约基本一致。
- 若前端需要 `actions` 统一入口，应补充动作类型与约束的文档化说明。
