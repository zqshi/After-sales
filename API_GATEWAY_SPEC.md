# API 网关与对外系统接入规范

## 1. 网关总体定位
- 作为前后端分离项目的唯一入口，屏蔽前端对多个后端的直接访问；
- 对外部系统（IM 渠道、CRM/客户画像、合同、工单/任务、AI/知识库）提供统一 REST & WebSocket 接口；
- 承担鉴权/RBAC、审计、链路追踪、限流、熔断、缓存、数据格式转换等治理功能；
- 支持 feature flag 与灰度控制，如按渠道、角色、场景逐步开放新接口。

## 2. 核心接口与下游对接

### 2.1 聊天/IM 接口
- **REST**
  - `GET /im/conversations`： 查询会话列表，可带 `agentId`, `status`, `channel`, `sla` 等筛选；返回 `conversationId`, `customerName`, `channel`, `lastMessage`, `unread`, `emergency`.
  - `GET /im/conversations/{id}/messages`: 历史消息，支持分页，返回 `id`, `speaker`, `content`, `type`, `sentiment`, `timestamp`, `attachments`.
  - `POST /im/conversations/{id}/messages`: 发送/记录消息，payload 包含 `content`, `type`, `channel`, `source`, `attachments`, `traceId`.
  - `PATCH /im/conversations/{id}/status`: 更新状态（`pending`, `processing`, `resolved`）、SLA/urgency 变更。
- **WebSocket/SSE**
  - `IM_MESSAGE`：外部渠道消息推送，包含 `conversationId`, `sender`, `content`, `channel`, `timestamp`, `meta`.
  - `IM_STATUS`：状态/SLA 变更通知。
- **下游系统**
  - 飞书/钉钉/企业 QQ/微信群聊（支持 webhook/pull depending on provider）。
  - 统一做消息去重、限流、敏感信息屏蔽、Trace ID 注入。

### 2.2 客户画像与合同接口
- `GET /profiles/{customerId}`：组合 CRM 返回画像（联系人、标签、SLA、priority、metrics）。
- `GET /profiles/{customerId}/interactions`: 返回 interaction 列表、服务记录。
- `GET /contracts/{contractId}`：合同详情 + 承诺（promise、evidence、status）。
- `POST /profiles/{customerId}/refresh`: 触发 CRM/合同系统同步。
- **下游系统**：CRM (如 Salesforce、飞书CRM)、合同系统/ERP。
- **治理要求**：接口需做脱敏/权限核查，修改需写审计日志。

### 2.3 需求与任务
- `GET /requirements` + `POST /requirements` + `POST /requirements/{id}/ignore` + `GET /requirements/statistics`。
- `GET /tasks` + `POST /tasks` + `POST /tasks/{id}/actions`。
- `GET /quality/{conversationId}`：返回质检 profile。
- **下游系统**：售后任务系统、工单平台、BI 数据库。
- 接口需支持 `priority`, `status`, `owner`, `commitmentId`, `relatedConversationId` 等字段，并同步回话 context。

### 2.4 AI / 知识
- `POST /ai/analyze`：多渠道对话分析，返回 `issues`, `summary`, `suggestedActions`, `priority`.
- `POST /ai/solutions`：生成话术、任务建议，输出 `message`, `taskDraft`, `knowledgeReference`.
- `GET /knowledge` + `GET /knowledge/{id}`：知识库模块，支持预览与全文。
- **下游系统**：内部知识图谱、LLM 引擎(OpenAI/Claude)、分析平台。
- 支持结果缓存、rate-limiting、模型选择参数（`model`, `context`）。

### 2.5 角色 / 审计
- `GET /session/roles`：返回当前用户角色与授权模块（dialog/tasks/reports）。
- `POST /audit/events`：接收前端事件（message.send/task.create）, 记录 `userId`, `role`, `action`, `entityId`, `result`.
- 支持 `traceId`, `requestId` header 贯穿全链路，便于 OpenTelemetry 聚合。

## 3. 前端对接变化指南（与现有模块对应）

| 前端模块 | 调用说明 | 需改造点 |
| --- | --- | --- |
| `assets/js/chat/index.js` | 拆掉 mock conversation list; 用 `GET /im/conversations` 渲染，`POST /im/.../messages` 发送；通过 WebSocket 注册 `IM_MESSAGE`/`IM_STATUS`。 | 封装 `api.js` 来调用 API，增加 loading/错误提示；添加 retry/feature flag。 |
| `assets/js/customer/index.js` | 替换 `profiles` object 以 API 字段渲染；提供刷新按钮调用 `POST /profiles/{id}/refresh`。 | 显示 `updatedAt`+`updatedBy` 来反映审计；支持 contract change 推送。 |
| `assets/js/requirements/index.js` | 调用 `GET /requirements` 获取列表，`POST /requirements` 创建卡，`GET /requirements/statistics` 更新统计。 | 不再依赖 localStorage；捕获 API 错误后显示提示。 |
| `assets/js/tasks/index.js` | 通过 `GET /quality/{conversationId}` 获取 QC profile，`GET /tasks` 列表，`POST /tasks` 创建，`POST /tasks/{id}/actions` 处理。 | 结构化 Task 视图，将 actions 与 backend 状态同步。 |
| `assets/js/ai/index.js` | `bindReanalyze` 调用 `POST /ai/analyze`，`bindApplySolutions` 调用 `POST /ai/solutions`。 | 处理异步 spinner，调用 `addMessage` 和 `createRelatedTask` 需等待 `ai/solutions` 响应。 |
| `assets/js/knowledge/index.js` | 调用 `/knowledge` 接口动态生成卡片，`openKnowledgePreview` 拉取 `preview/full`。 | 详情页通过 `data-id` 触发 fetch；推送 `addToSuggestion` 需记录 knowledge trace。 |
| `assets/js/roles.js` | `initRoleSwitcher` fetch `/session/roles`，驱动 UI 角色切换。 | 确保按钮/选项只在授权后显示，隐藏/禁用未授权模块。 |

## 4. 治理与运维扩展
- 鉴权：网关需验证 JWT 或 SSO session，每次调用带 `userId`/`agentId`。
- 审计：`POST /audit/events` 接收 `eventType`, `entity`, `payload`, `result`, `duration`。
- 监控：OpenTelemetry + Prometheus 板块，指标包括接口延迟、失败率、队列长度；前端 telemetry 可上线 `window.logger.log`.
- Feature Flag：网关/前端支持按 channel/module/role 开关，便于灰度。
- 灰度策略：先在 test -> pilot -> production 推进，每个阶段记录 SLA/issue 统计。

## 5. 成果交付
- 此规范可直接生成 API 文档（OpenAPI/Swagger），提供给后端/平台团队开发。
- 一旦 Postman/Mock 服务器可用，前端只需要配置 `apiBaseUrl` 指向网关即可完成集成。

需要我继续针对每个接口生成请求/响应示例或 mock server 示例代码吗？
