# Conversation（Backend）


## 领域边界
- 负责对话生命周期、消息集合、会话分配、SLA/等级计算、会话关闭与事件发布。
- 不负责客户画像、需求/任务流转、质检与AI分析结果持久化（通过事件/应用服务协作）。

## 后端管理范围
- 会话聚合、消息持久化、分配策略与 SLA 计算。
- `/api/conversations` 与 `/im/*` 路由权限与审计。
- 领域事件发布与异步流程触发（需求/任务/审核）。

## 后端设计概览
- 聚合根: `Conversation`, `Message`
- 值对象: `Channel`, `MessageSummary`
- 领域服务: `ConversationAssignmentPolicyService`, `CustomerLevelCalculatorService`
- 领域事件: `ConversationCreated`, `ConversationAssigned`, `MessageSent`, `ConversationReadyToClose`, `ConversationClosed`, `CustomerLevelViolated`
- 仓储接口: `IConversationRepository`, `IMessageRepository`

## 核心字段
- Conversation: `id`, `customerId`, `agentId`, `channel`, `status`, `priority`, `slaStatus`, `slaDeadline`, `mode`, `metadata`, `createdAt`, `updatedAt`, `closedAt`
- Message: `id`, `conversationId`, `senderId`, `senderType`, `content`, `contentType`, `metadata`, `sentAt`
- 约束:
  - `status=closed` 后禁止发送消息
  - `mode` 仅允许: `agent_auto|agent_supervised|human_first`
  - `channel` 取值受限于枚举

## 后端接口设计
- `POST /api/conversations` 创建对话
- `GET /api/conversations` 查询对话列表
- `GET /api/conversations/:id` 获取对话详情
- `POST /api/conversations/:id/assign` 分配客服
- `POST /api/conversations/:id/messages` 发送消息
- `POST /api/conversations/:id/close` 关闭对话
- `GET /im/conversations` IM 会话列表
- `GET /im/conversations/:id/messages` IM 会话消息
- `POST /im/conversations/:id/messages` IM 发送消息
- `PATCH /im/conversations/:id/status` 更新会话状态
- `PATCH /im/conversations/:id/mode` 设置 Agent 模式
- `GET /im/conversations/:id/sentiment` 情绪分析（AI）
- `GET /im/conversations/:id/ai-analysis` AI 分析结果

## 主要时序图
```mermaid
sequenceDiagram
  autonumber
  participant UI as Chat UI
  participant API as Backend IM Controller
  participant Conv as Conversation Aggregate
  participant Ai as AI Service
  participant Req as Requirement/Task Services

  UI->>API: POST /im/incoming-message
  API->>Conv: create/append message
  API->>Ai: sentiment + intent + suggestion
  Ai-->>API: analysis + suggestion
  API->>Req: create requirement/task (if needed)
  API-->>UI: message + analysis + suggestion
```

## 主要架构图
```mermaid
flowchart LR
  UI[Web Chat UI] -->|/im/*| IM[IM Controller]
  UI -->|/api/conversations| ConvAPI[Conversation API]
  IM --> App[Application Services]
  ConvAPI --> App
  App --> Domain[Conversation Domain]
  Domain --> Repo[Conversation Repository]
  Repo --> DB[(Database)]
  IM --> AI[External AI Services]
```

## 完整性检查与缺口
- 已补齐 `POST /api/conversations/:id/close` 与 `PUT /api/conversations/:id`。
- IM 渠道与标准 Conversation API 并存，职责边界需要在文档层明确：IM 用于实时消息链路；/api/conversations 用于业务管理。
