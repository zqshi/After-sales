# 后端/网关架构与技术选型

## 目标
- 为前端提供统一 REST/WebSocket 接口，屏蔽飞书/企业QQ/微信等多渠道差异；
- 承担治理：鉴权、RBAC、审计、feature-flag、限流、链路追踪、监控与灰度；确保 100+ 售后团队上生产。
- 以 DDD 实现 bounded contexts（Conversation, Profile, Requirement/Task, Knowledge/AI, Governance）以及共享 kernel（audit events, feature flags）。

## 技术选型
- **Gateway/BFF**：Node.js + Express 或 Nest.js，可快速接入 adapters，同时部署 API Gateway（Kong/API Gateway）做统一认证与流量控制。支持 WebSocket/SSE 推送 ix.
- **Adapters/Connectors**：
  * IM Adapter：对接飞书/钉钉/企业QQ/微信群聊，处理 webhook、去重、状态、channel routing。
  * CRM/Contract Adapter：获取 `profiles`, `contracts`, `interactions`; 提供 refresh webhook。
  * Requirement/Task Adapter：连接售后任务/工单系统，提供 `requirements`, `tasks`, `quality`.
  * AI/Knowledge Adapter：调度 LLM/知识库，提供 `/ai/analyze`, `/ai/solutions`, `/knowledge`.
  * Governance Adapter：记录 `audit/events`, feature flag toggles, metrics export.
- **Data Layer**：可用 Redis/DB 缓存 conversation list, requirement stats, feature flags; 另外接 Prometheus metrics + ELK for audit.
- **Authentication/Governance**：SSO/JWT via gateway, RBAC mapping stored in DB; restful path uses `userId`, `roles`. `POST /audit/events` integrated with event bus (Kafka) for replay.

## 技术方案设计
1. **API Contract**：采用 `API_OPENAPI_SPEC.md` + `API_CONTRACT_GUIDE.md` 作为 contracts，前端只调用 `/im`, `/profiles`, `/requirements`, `/tasks`, `/knowledge`, `/ai`, `/session/roles`, `/audit/events` 等。网关验证 schema、traceId、feature flag。
2. **Conversation domain**：WebSocket server pushes `im.message`/`im.status`; persistent message queue ensures order; exposures include conversation health metrics.
3. **Governance domain**：feature flags exposed via `/feature-flags`, `/feature-flags/{flag}/toggle`; `audit/events` writes to append-only store; metrics exported to Prometheus (IM latency, SLA compliance, audit gaps).
4. **Observability**：OpenTelemetry traces propagate `traceId` from frontend via `X-Request-Id`, Prometheus collects latencies, alert manager triggers PagerDuty when thresholds fail (channel down >30s, SLA >5% breach).

## 演进计划
- **Pilot**：启动 1~2 个 channels + CRM source, use Mock gateway to validate interactions, implement dashboards (channel status, SLA board).
- **Production**：feature flags gating new channels/AI, grey release per `GOVERNANCE_CHECKLIST.md`, ensure `release_log.md` records governance sign-offs.
- **持续改进**：每个 domain 以 event storm results + `MODULE_BACKLOG.md` tasks iterate, extend connectors, refactor into microservices when scale demands.
