# API 接口契约需求（前端模块视角）

## 背景
当前 `index.html` + `assets/js/*` 全部靠浏览器端 mock/localStorage 驱动。为实现前后端分离、治理友好、外部系统集成，需要为每个模块明确所需的 API 接口、请求数据结构与触发事件，后续可由网关/BFF 或真实服务实现。

## 模块视角与所需契约

### 1. 聊天与 IM（`assets/js/chat/index.js`）
**功能需求**
- 展示多条会话列表，切换时加载历史消息，发送消息及内部备注，探索输入辅助（表情、提示）。

**接口需求**
- `GET /im/conversations?agentId=&status=&channel=`：返回会话列表，包含 `conversationId`, `customerName`, `channel`, `slaLevel`, `lastMessage`, `unreadCount`, `emotionTag` 等。
- `GET /im/conversations/{conversationId}/messages?limit=&offset=`：返回消息历史（包括客户、工程师、系统标签），带 `timestamp`, `speaker`, `content`, `sentiment`, `messageType`。
- `POST /im/conversations/{conversationId}/messages`：发送客服消息/备注，支持 `type`（`response`/`internal`/`suggestion`）、`channel`, `attachments`, `traceId`。
- WebSocket 推送/Server-Sent `IM_MESSAGE` 事件，包含新的消息、会话状态、SLA/urgent 变更，用于 UI 实时回填。
- `POST /im/conversations/{conversationId}/status`：更新会话状态（如「待处理」「已完成」），用于在筛选按钮上反映。

### 2. 客户画像与合同视图（`assets/js/customer/index.js`）
**功能需求**
- 展示客户基本信息、标签、SLA/合同状态、重要联系人、互动历史、承诺与服务记录，并提供画像刷新/跟进按钮。

**接口需求**
- `GET /profiles/{customerId}`：返回 `name`, `title`, `tags`, `weight`, `contacts`, `slaStatus`, `contracts`, `insights` and `metrics`，用于 `profiles` 数据结构。
- `GET /profiles/{customerId}/interactions?window=`：返回历史互动列表（channel、date、summary、result）。
- `GET /contracts/{contractId}`：提供当前合同详情（`title`, `status`, `promise`, `promiseStatus`, `due`, `owner`, `relatedConversations`）。
- `POST /profiles/{customerId}/refresh`：触发后端刷新画像（可由 CRM/合同系统 webhook 管理），返回最新更新时间/trace。
- Webhook/推送：当合同状态、SLA、客户标签被 CRM 更新时，通知前端刷新当前卡片。

### 3. 需求与产品反馈（`assets/js/requirements/index.js`）
**功能需求**
- 收集未处理需求，创建卡片，展示已处理需求与状态筛选，提供统计与图表。

**接口需求**
- `GET /requirements?status=all|pending|processing|closed`：返回需求列表，含 `id`, `content`, `status`, `customer`, `createdBy`, `timestamp`, `priority`.
- `POST /requirements`：创建新需求（由会话自动识别或手动），包含 `content`, `sourceConversationId`, `customerId`, `priority`, `category`.
- `POST /requirements/{id}/ignore`：忽略未处理需求。
- `GET /requirements/statistics`：返回统计卡（未处理总量、处理率、按标签分布）与图表数据用于 `initRequirementsChart`。
- `POST /requirements/scan-conversation`：分析当前会话内容，推荐标签/priority。

### 4. 任务与质检（`assets/js/tasks/index.js` & `assets/js/ai/index.js`部分）
**功能需求**
- 显示质检雷达/评分、建议动作，创建任务、查看任务列表、处理任务操作、引导 AI 方案。

**接口需求**
- `GET /quality/{conversationId}`：获取 `qualityProfiles`、`dimensions`, `summary`, `actions`, `insights`, `tags`, `metrics`, `thread`。
- `GET /tasks?agentId=&status=`：任务列表含 `id`, `title`, `description`, `priority`, `owner`, `status`, `relatedConversationId`, `createdAt`.
- `POST /tasks`：创建新任务（custom / AI generated），payload 包括 `title`, `description`, `priority`, `owner`, `relatedEntities`.
- `POST /tasks/{taskId}/actions`：用于取消、执行、导出、复盘等操作，带 `action`, `comments`, `traceId`.
- `POST /ai/analyze`：分析会话，返回 `issues`, `suggestedSolutions`, `priority`, `nextSteps`。
- `POST /ai/solutions`：应用 AI 方案，将输出写入消息（可调用 `addMessage('engineer', solution)`）并触发任务创建（返回 solution title/summary）。

### 5. 知识与建议（`assets/js/knowledge/index.js`）
**功能需求**
- 展示知识卡片、进度、预览、引用建议，支持打开原文、扩展/收起。

**接口需求**
- `GET /knowledge?query=` 或 `GET /knowledge/{topicId}`：返回卡片列表（`title`, `preview`, `tags`, `url`, `updatedAt`, `type`）。
- `GET /knowledge/{id}/preview` & `GET /knowledge/{id}/full`：用于 `openKnowledgePreview` 展示预览与全文。
- `POST /knowledge/{id}/suggestion`：生成建议模板（可自动 `addToSuggestion`）。

### 6. 角色与权限（`assets/js/roles.js`）
**功能需求**
- 角色切换控制 tabs、可见/可操作模块。

**接口需求**
- `GET /roles/{agentId}` 或 `GET /session/roles`：返回当前用户角色与可访问模块（例如 `dialogs`, `tasks`, `reports`）以及权限 `canCreateTasks`, `canViewReports`。
- `POST /roles/switch`：若前端需要主动切换视角，可通知后端并返回新的可视表单；或由前端按角色动态调整 UI，不暴露未授权的按钮。
- 需结合 RBAC 审计（role change 需要记录 actor/timestamp）。

## 7. 事件与治理需求
- 所有接口应支持 `traceId`/`requestId`头部，后端返回 `spanId`用于链路追踪。
- 审计日志需记录 `userId`, `action`, `entityId`, `timestamp`，并提供 `GET /audit` 供治理页查询。
- 前端在调用网关失败/超时时，展示“接口未就绪”提示并保留 `retry` 控件；同时上报 `window.logger.log` 类似 telemetry。

## 8. 后续使用建议
- 此文档可作为大语言模型或项目组执行任务的输入，确保按模块逐个实现 API 后再替换 mock；
- 下一步可由开发者基于此生成 OpenAPI 表、Mock 服务器脚手架、前端 `api.js` 请求层，逐渐完成前后端拆分。

需要我继续补充接口示例或 mock 网关启动脚本吗？
