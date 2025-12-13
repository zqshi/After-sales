# 治理、监控与发布执行清单

## 1. 治理组织与职责
- [ ] 设立治理委员会（售后/产品/安全/技术）与运维小组，明确每月审查频率与内容（审计日志、权限、接口健康）。
- [ ] 定期更新 `GOVERNANCE_TRANSFORMATION_PLAN.md` 版本号，并向团队同步本次变更。
- [ ] 建立 RBAC 审批流程：所有新角色/权限需通过治理委员会审核，记录 actor/timestamp。
- [ ] 记录每条需求/任务/消息操作的审计事件，后端 `POST /audit/events` 每次成功/失败都应保存 `userId`、`action`、`entity`、`result`（可导出 CSV）。
- [ ] 定义数据质量规则（会话必须有 `customerId`/`channel`/`SLA`、需求/任务需 `priority`/`owner`、合同需要 `status`），并用网关 schema +前端校验双重检测。

## 2. 监控与告警
- [ ] 在 API 网关接入 OpenTelemetry & Prometheus 采集：IM channel latency (p50/p95)、SLA compliance、task pipeline volume、external API error rate。
- [ ] 建立 UI 面板（dashboard）展示三张卡：渠道链路状态（channel up/down、latency）、SLA 看板（当前逾期数/95% 目标）、错误事件表（等级、影响、操作者）。
- [ ] 前端 `assets/js/api.js` 每次调用 `request` 时带 `X-Request-Id`/`X-Trace-Id` 并在失败时调用 `window.logger.log('api.failure', { path, status })`。
- [ ] 告警阈值：
  - IM channel down ≥ 30 秒 → PagerDuty/钉钉告警 + UI ticker。
  - SLA 逾期率 > 5% → 自动触发治理复盘通知。
  - 审计日志 gap（5 分钟无事件）→ 触发回滚保护并通知运维。
- [ ] 建立回放机制：日志采集到 `audit` + `feature-flag` 事件后可回放事件链路（traceId）用于问题定位。

## 3. 发布/灰度步骤
- [ ] 按阶段推进：Dev → Staging → Pilot → Production，每个阶段需完成 smoke test、监控验证。
- [ ] 每次发布前 Checklist：
  1. 所有接口通过 contract/Schema 测试（OpenAPI + mock）。
  2. Feature flag 面板更新：`chat.channel.*`, `customer.profile.refresh`, `requirements.priorityCreation`, `ai.solutions`。
  3. 监控 thresholds 中所有指标状态为 normal。
  4. 审计/权限配置由治理委员会签字通过。
  5. 回滚计划就绪：可以通过 flag 快速 disable 某 channel/模块。
- [ ] 灰度策略：逐步打开 feature flag。每个 flag 先在 pilot 里 enable，然后由治理委员会确认指标再放到生产。
- [ ] 治理与运维需共享 release notes，包括 flag 状态、IM 频道列表、联系人、应急联系人。

## 4. Pilot 执行清单
- [ ] 选定 1-2 个渠道（如飞书 + 企业 QQ）与 1 个客户画像源，通过 API 网关连接并验证 WebSocket/REST 事件。
- [ ] 配置前端 `window.config.apiBaseUrl` 指向 pilot Mock/real 网关，确保 `assets/js/api.js` 调用成功。
- [ ] 运行 pilot 期间收集 KPI：SLA compliance、消息延迟、需求卡创建/忽略数、task backlog。
- [ ] 每日整理「pilot 健康报告」包含：渠道 connectivity status, API error trends, governance alerts。
- [ ] Pilot 结束后提交“Go/No-go”评估，包含问题列表、回滚记录与 readiness score，供治理委员会决定是否推进全量。

## 5. 持续提升
- [ ] 每次发布后复盘，归档在 `release_log.md`，记录更改点、风险与后续计划。
- [ ] 将 `API_OPENAPI_SPEC.md`、`API_CONTRACT_GUIDE.md` 与 `API_GATEWAY_SPEC.md` 作为 living docs，定期与后端/产品同步，确保对接一致性。
- [ ] 建立运营渠道（飞书群 + Jira board）供售后团队上报问题并追踪状态。
