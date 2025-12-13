# DDD-inspired 技术设计与执行指引

## 1. 领域分块与模块映射
| 领域上下文 | 说明 | 前端模块 | 关键接口（参考文档） |
| --- | --- | --- | --- |
| Conversation Context | 客户消息接收、响应、状态管理，带 SLA/渠道标签 | `assets/js/chat/index.js` | `/im/conversations`, `/im/messages`, WebSocket `im.message` (`API_CONTRACT_GUIDE.md:8-38`) |
| Profile Context | 客户画像、联系人、SLA、合同、承诺 | `assets/js/customer/index.js`（未来切换） | `/profiles/{id}`, `/contracts/{id}`, `/profiles/{id}/refresh` (`API_CONTRACT_GUIDE.md:19-38`) |
| Requirement/Task Context | 需求采集、卡片创建、任务流、质检评分 | `assets/js/requirements/index.js`, `assets/js/tasks/index.js` | `/requirements`, `/tasks`, `/quality/{convId}` (`API_CONTRACT_GUIDE.md:30-119`) |
| Knowledge & AI Context | 知识卡片、AI 分析/方案、建议注入 | `assets/js/knowledge/index.js`, `assets/js/ai/index.js` | `/knowledge`, `/ai/analyze`, `/ai/solutions` (`API_CONTRACT_GUIDE.md:53-92`) |
| Governance Context | 审计、角色、监控、feature flag、发布 | `assets/js/api.js`, `roles.js` + docs | `/session/roles`, `/audit/events`, feature flag endpoints (`API_GATEWAY_SPEC.md`, `GOVERNANCE_*.md`) |

## 2. 模块级技术方案

### 2.1 会话模块
- 实现：`chat/index.js` 使用 `assets/js/api.js` 提供 `sendChatMessage`，将消息、状态上报到 `/im/conversations`，通过 WebSocket `im.message`/`im.status` 增量更新 UI；支持 traceId、SLA draft。
- 扩展：实现微调消息去重、channel-specific routing、status update aggregator；配置 feature flag `chat.channel.{feishu,qq,wechat}`。

### 2.2 画像与合同模块
- 实现：在未来版本将 `customer/index.js` 抽象为 `ProfileService` 组件，`fetchProfile`/`fetchProfileInteractions`/`refreshProfile` 均通过 `assets/js/api.js` 调用后台；显示 `updatedAt/updatedBy` 以便审计。
- 扩展：引入 `ProfileEvent`（合同更改、SLA 变动）通过 WebSocket 推送，触发 `chat` 和 `task` 相关的上下文刷新。

### 2.3 需求与任务模块
- 实现：`requirements/index.js` 现已通过 `fetchRequirementData` + `createRequirement` 调用 API；也需 `fetchRequirementStatistics` 支撑仪表盘；`tasks/index.js` 可参照同级封装 `fetchTasks`/`actionTask`。
- 扩展：引入事件 `RequirementUpdated`, `TaskActioned` 并写入 `audit/events`，推送 governance dashboard；任务状态变化可驱动 SLA 告警。

### 2.4 知识 & AI 模块
- 实现：`assets/js/ai/index.js` 使用 `analyzeConversation` + `applySolution` 生成建议，并使用 `createRelatedTask` 触发任务系统；`knowledge/index.js` fetch `knowledge` + preview/full。
- 扩展：将 AI 输出做标准化 schema（issue, summary, nextSteps），用于任务/knowledge/contract 侧链路；可配置 LLM 模型参数 `model`/`context`。

### 2.5 治理模块
- 实现：`assets/js/api.js` 接口请求时带 `traceId`/`requestId`，失败/成功通过 `postAuditEvent` 上报；`roles.js` 通过 `/session/roles` 控制 tab visibility。
- 扩展：提供 `feature flag` dashboard，依 `GOVERNANCE_CHECKLIST.md` 列出 telemetry 指标（IM latency, SLA compliance, audit gap），并在 `README.md` 中链接。

## 3. 技术栈与执行指引
- 前端：保持 Vanilla JS + HTML + Tailwind，同时引入 `assets/js/api.js` 作为应用层 service，方便替代任何 REST/Socket backend。
- 后端/网关：可用 Node/Express + Adapter 模式（IM adapter, CRM adapter, AI engine）满足 `API_GATEWAY_SPEC.md` 中的治理责任；接口需遵循 `API_OPENAPI_SPEC.md` payload。
- 运营：依 `GOVERNANCE_CHECKLIST.md` 执行监控、告警、feature flag、Pilot checklist；release-note/issue 记录放在 `release_log.md`。

## 4. 自演进建议
1. **Event Storming**：每个重要事件（message send、requirement create、task action、AI solution、audit event）都记录 `traceId` + `userId`，并通过 `POST /audit/events` 进入治理系统。
2. **自治部署**：将 `assets/js/api.js` 配置 (`apiBaseUrl`, `authToken`, `featureFlags`) 置于 `window.config`，支持多个环境（dev/stage/pilot/prod）。
3. **模块小步迭代**：按 Domain 拆版本（v1 conversation, v2 tasks, v3 AI），每次发布伴随 `GOVERNANCE_CHECKLIST.md` 的审批与 smoke test。

## 5. 参考链接
- API 契约：`API_CONTRACT_GUIDE.md`
- 网关治理：`API_GATEWAY_SPEC.md`, `API_OPENAPI_SPEC.md`
- 治理/监控/发布：`GOVERNANCE_TRANSFORMATION_PLAN.md`, `GOVERNANCE_CHECKLIST.md`, `README.md`

如需我基于上面内容进一步生成模块架构图、Event Storming 表格或配合某个 Domain 生成 issue backlog，请说明具体格式或优先级。*** End Patch***"),}Could not parse input. Need proper JSON? apply patch needs string. I'll reapply patch text properly no JSON. Need to reissue apply patch with patch text. Let's do. We'll produce file `TECHNICAL_DESIGN.md`. Use patch. Need to ensure no extraneous quoting. We'll do. We'll use apply patch with patch content plain. Let's try again. It's long but necessary. Use patch. Let's do. We'll include patch as text. 
