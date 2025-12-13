# 前端架构与技术方案

## 目标
- 实现完全前后端分离：前端只处理 UI/交互，并通过统一的应用服务层与 API 网关通信；不直接包含业务逻辑、数据 mock 或外部系统接入。
- 支持多渠道、治理与灰度：每次请求带 traceId、feature flag 控制、失败回退与审计上报；UI 保持现有设计，接口可快速替换。

## 技术选型
- **语言与框架**：继续使用现代 Vanilla JS + ES Modules，结合 Tailwind CSS（已在 `index.html` 中使用）以保证轻量且易迭代；未来可替换为 Alpine/Vue/React，但目前保持 DOM 可控。
- **状态与事件管理**：使用轻量 `assets/js/api.js` 作为全局应用服务 + `CustomEvent`/`window` 状态（如 `window.config`, `window.logger`）来跨模块共享 `currentConversationId`、feature flag、telemetry。
- **接口通信**：封装 `fetchWithTelemetry` / `request` 方法（已在 `assets/js/api.js`），提供 `fetchConversations`, `sendChatMessage`, `createRequirement` 等统一 API，所有模块通过该层和网关交互；用于 fallback 也可在该层检查 `window.config.apiBaseUrl`。
- **Telemetry / Governance Hooks**：在 API 层附带 `X-Request-Id`/`X-Trace-Id`, 失败时调用 `window.logger.log('api.failure', ...)`, 成功后触发 `postAuditEvent`; 业务模块也在关键路径加 `showNotification`/`postAuditEvent` 以便治理。
- **UI 分层**：保持 DOM 结构，但每个模块（聊天/需求/客户/知识/AI）独立管理自己的 state、loading、error 内容；把业务逻辑委托给 API 层和 `assets/js/requirements` etc.

## 技术方案设计
1. **应用服务层**：`assets/js/api.js` 提供 REST/telemetry/feature flag 支持，未来可替换为 RPC client。任何模块需要发送/接收数据都必须通过该层，不再访问 `localStorage` 直接。
2. **模块自洽**：每个 domain 模块（conversation、requirement、profile、knowledge/AI）在自己目录封装 `init*`、`render*` 函数，并调用 API 层获取数据、更新 UI。模块之间通过 `CustomEvent` 或 `window.appState` 共享 context。
3. **Deployment 配置**：`window.config` 里统一注入 `apiBaseUrl`, `authToken`, `featureFlags`, `userId`; build 产物只需替换配置文件即可切换环境。
4. **质量保障**：所有 API 响应交给 `try/catch` 处理，UI 显示“接口未就绪”或 fallback mock（`ensureMockData` 仍可保留为 fallback）；开发/QA 通过 `API_OPENAPI_SPEC.md` + local mock server 进行集成测试。

## 交付与演进
- 再完善其他模块（knowledge/AI、roles）使之使用 `assets/js/api.js`，完成治理 instrumentation。
- 结合 `MODULE_BACKLOG.md` 中任务逐项实现并记录到 `release_log.md`。
- 提供 `front-end` README/diagrams 方便未来技术团队理解 API first flows。
