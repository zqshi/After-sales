# 模块化任务 Backlog（基于 DDD 设计与治理方案）

| 领域 | 任务 | 依赖文档 | 目标 |
| --- | --- | --- | --- |
| Conversation | 1. 实现 `/im/conversations` + WebSocket mock server 并验证 `assets/js/chat/index.js` 使用 `assets/js/api.js` 能发/收；2. 加入 channel health dashboard + feature flag | `API_OPENAPI_SPEC.md`, `API_CONTRACT_GUIDE.md`, `TECHNICAL_DESIGN.md` | 验证 IM 链路、traceId、审计；为多渠道（飞书/QQ/微信）切换做准备 |
| Requirement/Task | 1. 继续将 `assets/js/tasks/index.js` 调整为调用 `fetchTasks`/`actionTask`；2. 完成 `requirements` mock → API 的 full sync（使用 `fetchRequirementStatistics` 产统计）；3. 增加 task/requirement 事件上报到 `POST /audit/events` | `API_CONTRACT_GUIDE.md`, `TECHNICAL_DESIGN.md`, `GOVERNANCE_CHECKLIST.md` | 让任务/质检/需求在 API 体系里流转，满足治理审计 |
| Profile/Contract | 1. 改造 `assets/js/customer/index.js` 以 `fetchProfile` + `fetchContract` 展示；2. 启用画像 `refresh` 接口与 WebSocket event 提示；3. 显示 `updatedBy/updatedAt` 审计信息 | `API_CONTRACT_GUIDE.md`, `TECHNICAL_DESIGN.md` | 画像/合同领域与 CRM/合同系统对齐，供 `chat` + `task` 参考 |
| Knowledge/AI | 1. 构建 `GET /knowledge` mock + UI 显示动态卡片；2. `assets/js/ai/index.js` 调用 `analyzeConversation`/`applySolution` 并自动生成任务/消息；3. 记录 AI 输出 `issue/solution` schema 供任务链路使用 | `API_OPENAPI_SPEC.md`, `API_CONTRACT_GUIDE.md`, `TECHNICAL_DESIGN.md` | 让知识与 AI 输出成为可审计的事件，并驱动后续任务 |
| Governance | 1. 设置 feature flag 管理页 + slash command；2. 将 `assets/js/api.js` 请求 telemetry（latency/error）上报至监控；3. 实施 `GOVERNANCE_CHECKLIST.md` 的发布、灰度、告警流程（SLA, API health, audit gap） | `GOVERNANCE_TRANSFORMATION_PLAN.md`, `GOVERNANCE_CHECKLIST.md`, `TECHNICAL_DESIGN.md` | 确保整个系统可监控、可回滚，支持 100+ 用户上线 |

## 说明
- 该 backlog 可直接拆成 sprint/issue（例如 `Conversation: mock im gateway + CI test`）。
- 每项任务完成后在 `release_log.md` 中记录版本与治理评审（参见 `README.md`）。

需要我把其中某个任务拆得更细、形成具体的实现步骤或 GitHub issue 模板吗？
