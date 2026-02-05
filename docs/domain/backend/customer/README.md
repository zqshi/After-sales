# Customer（Backend）


## 领域边界
- 负责客户画像、交互记录、风险评估、健康度评分、VIP 标记与服务承诺跟踪。
- 不负责对话消息存储与工单流转（通过事件/应用服务协作）。

## 后端管理范围
- 画像聚合与指标计算（健康度、风险等级）。
- 画像/互动/服务记录持久化与事件发布。

## 后端设计概览
- 聚合根: `CustomerProfile`
- 值对象: `ContactInfo`, `CustomerLevelInfo`, `Metrics`, `Insight`, `Interaction`, `ServiceRecord`
- 领域服务: `HealthScoreCalculator`, `RiskEvaluator`
- 领域事件: `ProfileRefreshed`, `InteractionAdded`, `ServiceRecordAdded`, `CommitmentProgressUpdated`, `RiskLevelChanged`, `CustomerMarkedAsVIP`
- 仓储接口: `ICustomerProfileRepository`

## 核心字段
- CustomerProfile: `id`, `name`, `contacts`, `levelInfo`, `metrics`, `insights`, `interactions`, `serviceRecords`, `commitments`, `createdAt`, `updatedAt`
- 约束:
  - `serviceLevel` 仅允许 `gold|silver|bronze`
  - `riskLevel` 由领域服务计算，前端不应直接改写

## 后端接口设计
- `GET /api/customers/:id` 获取客户画像
- `POST /api/customers/:id/refresh` 刷新画像
- `GET /api/customers/:id/interactions` 查询互动记录
- `POST /api/customers/:id/service-records` 添加服务记录
- `PATCH /api/customers/:id/commitments/:commitmentId` 更新承诺进度
- `POST /api/customers/:id/interactions` 添加互动记录
- `POST /api/customers/:id/mark-vip` 标记 VIP
- `GET /profiles/:customerId` IM 侧画像查询
- `GET /profiles/:customerId/interactions` IM 侧互动记录

## 主要时序图
```mermaid
sequenceDiagram
  autonumber
  participant UI as UI
  participant API as Customer API
  participant Domain as CustomerProfile

  UI->>API: GET /api/customers/:id
  API->>Domain: load profile + metrics
  Domain-->>API: profile DTO
  API-->>UI: profile + insights
```

## 主要架构图
```mermaid
flowchart LR
  UI[Customer Panel] --> API[Customer Controller]
  API --> App[Application Services]
  App --> Domain[Customer Domain]
  Domain --> Repo[CustomerProfile Repository]
  Repo --> DB[(Database)]
```

## 完整性检查与缺口
- 前端 `CustomerProfileRepository` 以 `conversationId` 作为缓存键，后端接口按 `customerId` 设计，概念需统一（conversationId vs customerId）。
- IM 路由 `/profiles/*` 与标准 `/api/customers/*` 并存，建议明确哪一套为稳定接口契约。
