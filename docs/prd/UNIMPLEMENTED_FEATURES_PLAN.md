# 未实现功能清单与落地计划（以真实投产为目标）

> **更新时间**: 2026-01-30
> **依据**: 代码实现 + PRD 标注“未实现/待实现” + 现有测试/脚本运行结果
> **目标**: 形成可执行的实现清单、优先级与分期计划

---

## 1. 范围与口径

- **范围**: PRD/架构文档中标注未实现项 + 代码中的 TODO（与业务流程有关）
- **不含**: 归档文档中的历史计划（除非仍出现在现行 PRD 中）
- **产线标准**: 需具备接口、权限、稳定性、监控与测试闭环

---

## 2. 未实现功能清单（按业务优先级）

### P0（上线阻断）
1) **全自动回复发送**（仍依赖人工审核）
- 现状: `ConversationTaskCoordinator` 以人工审核为主，未实现自动发送
- 影响: 业务流程不闭环，无法实现“全自动客服”目标
- 证据: `docs/prd/BUSINESS_FLOW_DESIGN.md`

2) **WebSocket 实时推送**（Review/消息实时推送）
- 现状: WebSocketService 存在但未在 app 注册
- 影响: 前端无法接收实时审核/事件推送
- 证据: `docs/prd/BUSINESS_FLOW_DESIGN.md`, `backend/src/infrastructure/websocket/WebSocketService.ts`

3) **质量低分告警通知**（仅日志）
- 现状: 只记录日志，无通知渠道
- 影响: 质检异常无法及时触达责任人
- 证据: `docs/prd/BUSINESS_FLOW_DESIGN.md`, `backend/src/infrastructure/events/OutboxProcessor.ts`

---

### P1（核心能力缺口）
4) **知识沉淀自动化**（对话总结/自动建知识）
- 现状: 代码中仅保留 TODO
- 影响: 质检/知识闭环无法形成
- 证据: `docs/prd/BUSINESS_FLOW_DESIGN.md`, `backend/src/application/services/ConversationTaskCoordinator.ts`

5) **MCP 工具缺失**：对话模式/人工介入识别
- `detectConversationMode` / `detectHandoffTrigger` 未实现
- 影响: 对话模式与人机协作无法自动识别
- 证据: `docs/prd/2-baseline/4-hybrid-modules/Conversation-Mode-PRD.md`

6) **MCP 工具缺失**：任务自动提取与 NLP 解析
- `extractTaskFromConversation` / `parseTaskFromNL` 未实现
- 影响: 任务自动化协作不足
- 证据: `docs/prd/2-baseline/4-hybrid-modules/Task-Collaboration-PRD.md`

7) **EngineerAgent 工具缺口**
- `searchTickets` / `getSystemStatus` 等未实现
- 影响: 工程师 Agent 依赖知识库 + 人工判断，能力不完整
- 证据: `docs/prd/2-baseline/3-agents/EngineerAgent-PRD.md`, `docs/api/API_REFERENCE.md`

---

### P2（产品完善项）
8) **客户管理缺项**
- 已购产品、群信息、外部依赖展示未实现
- 证据: `docs/prd/2-baseline/2-features/2.2-Customer-Management-PRD.md`

9) **知识相关度/向量检索集成**
- KnowledgeAdapter 内 AI 相关度与向量检索未接入
- 证据: `backend/src/domain/conversation/anti-corruption/KnowledgeAdapter.ts`

10) **满意度调研/通知/告警系统**（渠道化）
- 证据: `backend/src/application/event-handlers/ConversationReadyToCloseEventHandler.ts`, `backend/src/application/sagas/CustomerSupportSaga.ts`

---

## 3. 落地计划（可执行分期）

### Phase 0（T+2 周）：上线阻断清单
- 目标: 打通“闭环与实时性”最短链路
- 交付:
  - WebSocketService 接入 app，推送 ReviewRequest/消息事件
  - 质量低分告警：邮件/IM 通知（基于 OutboxProcessor）
  - 自动回复发送能力（可配置开关 + 白名单）
- 验收:
  - 人审/自动回复均可配置，且具备回滚开关
  - 低分告警能触达指定人群

### Phase 1（T+6 周）：核心能力补齐
- 目标: MCP 工具链、自动任务抽取、工程师 Agent 可用
- 交付:
  - MCP: `detectConversationMode` / `detectHandoffTrigger`
  - MCP: `extractTaskFromConversation` / `parseTaskFromNL`
  - EngineerAgent: `searchTickets` / `getSystemStatus`
- 验收:
  - Agent 端到端任务创建成功率 ≥ 90%
  - MCP 调用有监控与降级策略

### Phase 2（T+10 周）：知识与客户闭环
- 目标: 知识沉淀与客户管理完善
- 交付:
  - 对话总结 → 知识入库自动化
  - 客户管理缺项字段与接口补齐
  - KnowledgeAdapter 向量检索/相关度计算
- 验收:
  - 质检 → 知识沉淀自动化覆盖率 ≥ 70%
  - 知识召回 Top-3 命中率 ≥ 60%

---

## 4. 依赖与风险

- **依赖**:
  - WebSocket 推送依赖前端订阅与权限校验
  - 告警通道依赖邮件/IM 第三方配置
  - MCP 工具依赖 AgentScope 服务可用性

- **风险**:
  - 自动回复可能引入误答风险 → 需灰度/白名单/回滚
  - 任务自动提取准确性不足 → 需人工确认/置信度阈值

---

## 5. 验收指标建议

- 自动回复启用后，人审占比降低 ≥ 30%
- WebSocket 推送延迟 ≤ 500ms
- 质量低分告警触达率 ≥ 95%
- 任务自动抽取准确率 ≥ 80%

---

## 6. 关联文档

- `docs/prd/BUSINESS_FLOW_DESIGN.md`
- `docs/prd/2-baseline/3-agents/EngineerAgent-PRD.md`
- `docs/prd/2-baseline/4-hybrid-modules/Conversation-Mode-PRD.md`
- `docs/prd/2-baseline/4-hybrid-modules/Task-Collaboration-PRD.md`
- `docs/prd/2-baseline/2-features/2.2-Customer-Management-PRD.md`
