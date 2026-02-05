# 投产整改 TODO 清单（基于真实待实现项）

## P0 投产阻断（必须先做）

1. 接入审核响应处理链路
- 文件: `backend/src/infrastructure/websocket/WebSocketService.ts`
- 任务: 实现 `ProcessReviewResponseUseCase` 并在 `handleReviewResponse` 调用
- 验收: 审核响应可落库，状态流转正确，接口与 UI 可回显

2. SSE 事件流订阅与 payload 校验
- 文件: `tests/frontend/e2e/integration/sse.spec.js`
- 任务: 订阅 SSE，校验至少 1 个事件 schema
- 验收: CI 通过，SSE payload 结构符合后端约定

3. 问题关闭/归档 E2E
- 文件: `tests/frontend/e2e/integration/problems.spec.js`
- 任务: 补齐关闭接口路径与状态断言
- 验收: 问题状态从 `in_progress` → `closed/archived` 可验证

4. 对话关闭后通知客户/满意度
- 文件: `backend/src/application/event-handlers/ConversationReadyToCloseEventHandler.ts`
- 任务: 接入 IM 发送与满意度调查触发
- 验收: 关闭后客户可收到通知，满意度任务可追踪

## P1 高风险（建议灰度前完成）

1. 需求提取与回复建议 AI 接入
- 文件: `backend/src/application/sagas/CustomerSupportSaga.ts`
- 任务: `analyzeRequirements` 和 `generateAIResponse` 接入可配置模型
- 验收: 需求提取成功率 >70%，回复建议可生成

2. 需求提取（LLM）
- 文件: `backend/src/application/services/ConversationTaskCoordinator.ts`
- 任务: `extractRequirements` 使用 LLM 能输出结构化需求
- 验收: 输入示例对话可输出结构化需求列表

3. 质检低分告警
- 文件: `backend/src/application/services/ConversationTaskCoordinator.ts`
- 任务: 接入统一告警系统（Slack/钉钉/邮件）
- 验收: 低于阈值触发告警并可追踪

4. 知识库相关度 + NLP 关键词
- 文件: `backend/src/domain/conversation/anti-corruption/KnowledgeAdapter.ts`
- 任务: 接入向量/AI 相关度与关键词抽取
- 验收: 推荐知识质量明显提升（可用人工验收样本）

5. 客户等级获取与高风险处理
- 文件: `backend/src/application/sagas/CustomerSupportSaga.ts`, `assets/js/...`
- 任务: 客户等级获取逻辑 + 高风险处理任务链
- 验收: 风险客户自动触发任务/通知链

## P2 可延期（投产后补齐）

1. 邮件告警服务
- 文件: `backend/src/infrastructure/events/OutboxProcessor.ts`
- 验收: Dead-letter 可邮件告警

2. 示例代码 AI 集成
- 文件: `backend/src/domain/conversation/anti-corruption/ACL_USAGE_EXAMPLES.ts`
- 验收: 示例可运行（非生产功能）

3. 知识沉淀
- 文件: `backend/src/application/services/ConversationTaskCoordinator.ts`
- 验收: 对话结束后可生成并入库 QA

4. `getSagaStatus` 全链路查询
- 文件: `backend/src/application/sagas/CustomerSupportSaga.ts`
- 验收: conversationId 可查到 requirements/tasks

---

说明：已排除纯文档占位 TODO（如 `docs/里程碑驱动/里程碑.md`、`docs/_archived/...`）
