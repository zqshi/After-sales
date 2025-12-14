# 售后服务治理与升级落地方案

## 1. 总体目标
- 把当前 `index.html` + `assets/js/*` 的浏览器端 mock 原型，升级为前后端分离、外部系统全面接入、具备治理与监控能力的商用售后服务管理平台；
- 支撑 100+ 人的售后团队，实现对多渠道 IM、客户画像、合同与工单系统的统一视图与控制；
- 提供可复用的治理模型（权限、审计、数据质量）、灰度发布与运维告警，确保稳定上线。

## 2. 当前状态速览
- 所有用户交互（聊天、任务、需求、AI、知识库）均由浏览器端静态数据驱动，缺少任何真实接口（参见 `assets/js/chat/index.js`、`assets/js/requirements/index.js`、`assets/js/tasks/index.js` 等）；
- 角色/权限和数据视图均由 `roles.js` 等文件硬编码，无法反映真实 RBAC、审计、数据源；
- 未集成外部渠道（IM、CRM、合同、AI），也没有统一的 API 网关、监控或治理手段。

## 3. 重构/升级总体路径
1. **契约和前端改造**：抽象统一配置、封装 fetch 层，将 UI 绑定的 mock 替换为可配置 API（例如 `window.config.apiBaseUrl`）；
2. **网关与外部系统接入**：构建 BFF/API 网关，统筹 IM、CRM、合同、任务/需求、AI 的真实调用，前端通过文档化接口调用；
3. **治理/监控/灰度**：引入 RBAC 审计、OpenTelemetry 级链路、数据质量规则、灰度/feature flag 机制，推动 pilot 至全量商用。

## 4. 分阶段目标与里程碑
| 阶段 | 时间 | 里程碑 |
| --- | --- | --- |
| 契约与前端改造 | Week 0-4 | 完成 OpenAPI 规范、mock 网关、前端 API 模块、替换 `ensureMockData`/静态 profiles，同时加 loading/error 处理。 |
| 网关与外部系统接入 | Week 4-10 | 实现网关 REST+WebSocket，接入选定 IM 渠道、CRM/合同/任务、AI 服务，前端全部调用网关契约；角色/权限与审计上线。 |
| 治理监控与上线 | Week 10-16 | 建立治理（审计、数据质量）、监控/告警、灰度策略、feature flag、运营手册，完成 pilot 与 100 人面推。 |

## 5. 关键模块改造细节
- **聊天/IM**：前端用 `/im/conversations`、`/im/messages`、WebSocket 推送替代本地 `conversation` mock；网关做渠道协议转换、去重与 traceId，下游可适配飞书/企业QQ/微信/群聊；群聊需支持 `conversationId + member` 结构，以及 `@` 触发与 SLA 标签。
- **客户画像/合同**：`assets/js/customer/index.js` 内 `profiles`/`commitments` 替换为 `GET /profiles/{id}`、`GET /contracts/{id}`；网关连接 CRM + CMS，提供 webhook 推送履约变更，并对敏感字段做脱敏/审计。
- **需求/任务/质检**：`assets/js/requirements/index.js` 的 `ensureMockData` 改为 `GET /requirements?status=`，`assets/js/tasks/index.js` 的 `qualityProfiles` 改为 `GET /quality/{convId}`；网关聚合任务系统与 BI。
- **AI分析/建议**：`assets/js/ai/index.js` 中接口调用 `POST /ai/analyze` 和 `POST /ai/solutions`，网关做 LLM 方案调用、结果缓存与速率限制。
- **角色与权限**：`assets/js/roles.js` 通过 API 检查角色，决定控制台 tab、按钮；后端返回可访问模块列表，前端据此隐藏/禁用。

## 6. 治理与监控要点
- **审计**：所有 API 调用需附带 traceId；前端 `sendMessage`、`createTask`、`applySuggestion` 等事件调用 `window.logger.log`，网关记录用户/角色/时间/渠道。
- **数据质量**：每条会话需带 `customerId`、`channel`、`SLA`，任务/需求卡需 `priority/owner`，合同记录需 `status`；违例触发治理告警并反馈 UI。
- **监控告警**：接入 OpenTelemetry + Prometheus，监控网关接口延迟、错误率；设定 SLA 逾期阈值及 IM channel 健康 dashboard，提供 UI 指示灯。
- **灰度发布**：网关与前端均支持 feature flag（按渠道/模块开关）；先在 pilot 客户/团队验证，再扩大至 100 人。
- **运维**：在运维控制台提供「渠道链路」面板（连接状态/响应延迟）、SLA 看板（本日/本周、逾期率）、错误/异常事件表（等级、影响、操作者）。

## 9. 治理、监控与上线控制

### 9.1 组织与职责
- **治理委员会**：由售后、产品、技术、客服安全组成；每月审查审计日志、权限配置、外部接口健康，发布治理通报。
- **运维小组**：负责监控仪表盘（接口延迟、错误率、queue depth）、SLA 追踪、告警响应、灰度控制。
- **开发团队（前端+网关）**：负责 API 层质量、feature flag、telemetry instrumentation 与回滚计划，并与治理委员会同步里程碑。

### 9.2 数据质量与审计
- 所有调用需传 `traceId`/`requestId` header 并写入 audit table；前端需在 UI 展示最近更新时间、修改人、source system label。
- 数据质量规则：
  1. `conversation` record 必有 `customerId`, `channel`, `SLA`. 缺失时网关返回 `400` 并记录到治理 dashboard。
  2. `requirement/task` 需要 `priority`, `owner`, `relatedConversationId`；系统每日生成 Data Quality Report，并通过 SLA Scorecard 汇总。
  3. `contract` 更新必须触发 webhook 至网关，前端 `contracts` 卡片显示 `pending approval` 时需由治理委员审核。
- 审计可按 `userId`, `action`, `entity`, `result`, `timestamp` 查询，必要时提供导出 CSV/Excel。

### 9.3 监控与告警
- **前端 telemetry**：记录事件（message.send/task.create/requirement.scan），上报 `window.logger.log`；网关聚合 Prometheus 计数器/Histogram。
- **后端指标**：
  1. IM Channel latency (median p50/p95) per channel.
  2. SLA compliance (target 95% within time window).
  3. Task pipeline volume & backlog.
  4. External API error rate (per supplier).
- **告警**：
  - IM channel down > 30s triggers PagerDuty + UI ticker.
  - SLA violation rate > 5% triggers governance review.
  - Audit log gap detected (no events for 5 mins) triggers auto-rollback safeguard.

### 9.4 发布与灰度控制
- **发布阶段**：
  1. Dev：开发+本地 mock.
  2. Staging：网关与 mock/real connectors 混合，业务 smoke test。
  3. Pilot：选定 1-2 个客户/渠道（如飞书+CRM），小规模 5~10 人。
  4. Production：全量 100+ 人。
- **发布检查清单**：
  - 所有 API 通过 contract/Schema 验证。
  - Monitoring dashboards 已配置 threshold.
  - Governance sign-off 确认 RBAC/feature flag 策略。
  - 回滚计划：若连接某 IM 失效，可快速 disable channel via feature flag and route to standby.
- **灰度机制**：
  - Feature flag 分别控制：`chat.channel.*`, `customer.profile.refresh`, `requirements.priorityCreation`, `ai.solutions`.
  - Pilot 中每个 flag 先由 governance board 批准并记录 (flag name, owner, metrics to monitor)。
  - Release notes 记录所有 flag status。

## 10. 交付与持续推进
- 由 front + gateway + operations 协同编排 sprint backlog，确保每项任务（API, UI integration, telemetry, monitoring dashboards, pilot run）可追踪。
- 使用 `GOVERNANCE_TRANSFORMATION_PLAN.md` 与 `API_GATEWAY_SPEC.md` 作为基准，将其拆成 GitHub issue/Jira ticket 并指定 owner/ETA。
- 下一阶段：对文档内容进行版本控制（tag release），每次改动更新 `release_log.md` 并同步治理委员会。

需要我将当前文档内容转换为 sprint backlog 表格并附上时间线吗？
- **审计**：所有 API 调用需附带 traceId；前端 `sendMessage`、`createTask`、`applySuggestion` 等事件调用 `window.logger.log`，网关记录用户/角色/时间/渠道。
- **数据质量**：每条会话需带 `customerId`、`channel`、`SLA`，需求卡需 `priority/owner`，合同记录需 `status`；违例触发告警并反馈 UI。
- **监控告警**：接入 OpenTelemetry + Prometheus，监控网关接口延迟、错误率；设定 SLA 逾期阈值及 IM channel 健康 dashboard，提供 UI 指示灯。
- **灰度发布**：网关与前端均支持 feature flag（按渠道/模块开关）；先在 pilot 客户/团队验证，再扩大至 100 人。

## 7. 落地计划（执行任务）
1. 撰写接口契约与 Mock 网关（文档/Swagger）。
2. 建立前端 `assets/js/api.js` 抽象请求/重试/telemetry，逐步替换 mock 数据。
3. 开发 API 网关 BFF，完成 IM/CRM/合同/任务/AI 连接，并实现角色与审计支持。
4. 加入监控/告警/数据质量机制，制作治理与运营手册。
5. 实施灰度，验证指标并推广；保持运营培训与优化反馈。

## 8. 给大语言模型的指令（以防 context 缺失）
1. 始终以前后端分离为基础，前端仅调用 API 网关，不直接处理业务逻辑。
2. 所有模块在加载时要处理 loading、retry 和 error UI，失败时展示 “接口未就绪” 信息并记录 telemetry。
3. 网关必须提供统一认证、审计、限流/重试、schema 校验；前端在调用前需取得 base URL 与 token。
4. 实施 feature flag 控制各渠道/模块；灰度时不要一次性接入所有外部系统。
5. 撰写治理手册、监控仪表盘、升级窗口与回滚流程，确保商用运营可控。

需要我把这个文档同步到项目 README 或生成 PDF 交付吗？
