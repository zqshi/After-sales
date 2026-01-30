# 智能售后工作台 - 业务流程设计（以代码实现为准）

> 文档目的：对齐“当前真实实现”，剔除历史规划与已废弃路线，作为投产基线依据。
> 版本：v3.0
> 更新日期：2026-01-30
> 依据：后端代码（`backend/src`）+ IM 实际链路说明（`tests/backend/事件格式.md`）

---

## 1. 总览（当前实现）

**核心原则**
- **IM 对话不支持关闭**：IM 对话永久存在，质检由 **ProblemResolvedEvent** 触发。
- **非 IM 对话可关闭**：`/api/v1/conversations/:id/close` 触发 **ConversationClosedEvent**，再触发质检。
- **回复生成优先 AgentScope**：失败时降级到 LLM，再降级到固定文案。
- **人工审核为主路径**：系统会创建 ReviewRequest，并通过 SSE 推送人工审核队列。

**主要实现完成度（现状）**
- 对话创建/消息入库：✅ 已实现
- 需求识别 + 自动建需求：✅ 已实现（规则/阈值驱动）
- 高优先级任务自动创建：✅ 已实现
- 问题生命周期（new → in_progress → resolved → reopened）：✅ 已实现
- 质检触发与落库：✅ 已实现（IM=ProblemResolved，非IM=ConversationClosed）
- AgentScope 调用与降级：✅ 已实现
- WebSocket 推送：❌ 未接入（代码存在但未在 app 注册）

---

## 2. IM 渠道主流程（真实实现）

**入口**：`POST /api/v1/api/im/incoming-message`

**处理链路**（简化视图）
1. **会话创建/复用**：创建 Conversation + Message，写入 domain_events + outbox_events
2. **需求识别**：置信度阈值 `requirement.confidenceThreshold`（默认 0.7）
3. **任务创建**：高优先级需求自动创建 Task
4. **问题生命周期**：识别问题/解决/复开，驱动 Problem 状态流转
5. **回复建议生成**：AgentScope → LLM → 固定文案降级
6. **人工审核**：创建 ReviewRequest（SSE 推送）

**关键事实**
- IM 关闭会话会被拒绝（业务逻辑层与接口层双重校验）。
- 质检触发点：`ProblemResolvedEvent`（非 ConversationClosed）。

---

## 3. 非 IM 渠道流程（真实实现）

**入口**：`/api/v1/conversations/*`

**核心链路**
1. 创建 Conversation / 发送消息
2. 调用 `CloseConversationUseCase` 关闭对话
3. 触发 `ConversationClosedEvent`
4. 质检调用 AgentScope `/api/agents/inspect` 并保存到 `quality_reports`

---

## 4. 质检链路（当前实现）

**触发路径**
- IM：`ProblemResolvedEventHandler`
- 非 IM：`ConversationTaskCoordinator.handleConversationClosed`

**落库**
- `quality_reports` 表记录质检结果

---

## 5. AgentScope 调用与降级策略（当前实现）

**回复生成策略**
1. AgentScope `/api/chat/message`
2. LLM（如已启用）
3. 固定文案（降级兜底）

**可靠性现状**
- 有超时与熔断
- 无自动重试/退避

---

## 6. 人工审核与 SSE（当前实现）

- ReviewRequest 创建后，SSE `GET /api/v1/api/im/reviews/stream` 推送
- `GET /api/v1/api/im/reviews/pending` 可获取待处理列表
- `POST /api/v1/api/im/reviews/submit` 提交审核结果

**说明**
- WebSocketService 代码存在，但未在 app 注册，因此不作为可用能力。

---

## 7. 已废弃 / 移除能力（以代码为准）

- **IM 消息回执接口**：仅记录数据无业务逻辑，已从路由移除。
- **Workflow 回复生成路径**：Workflow YAML 存在，但回复生成主链路未接入。

---

## 8. 不在当前实现的内容（明确未实现）

- 自动化回复发送（全自动），当前仍以人工审核为主
- WebSocket 推送（Review/消息实时推送）
- 质量低分告警自动通知（仅日志）
- 知识沉淀自动化（对话总结/自动建知识）

---

## 9. 与代码一致性声明

本文件与以下路径保持一致：
- `backend/src/application/services/ConversationTaskCoordinator.ts`
- `backend/src/application/event-handlers/ProblemResolvedEventHandler.ts`
- `backend/src/application/use-cases/CloseConversationUseCase.ts`
- `backend/src/presentation/http/controllers/ImController.ts`
- `backend/src/presentation/http/routes/imRoutes.ts`

如出现偏差，以代码为准，并更新本文件。
