# AgentScope 与 MCP（代码对齐）

**版本**：v2.0（拆分版）  
**最后更新**：2026-02-05

## AgentScope 交互链路（系统视角）

- IM 入站 → `ImController` → `ConversationTaskCoordinator`
- Coordinator 调用 AgentScope `/api/chat/message` 获取回复建议
- AgentScope 内 Orchestrator 路由到 Assistant/Engineer/Inspector
- AgentScope 通过 MCP 调用本仓库 `/mcp` 工具
- 本仓库返回工具结果 → AgentScope 聚合 → Coordinator 生成 `agentSuggestion`
- 需要人工复核：创建 ReviewRequest → SSE 推送
- 质检链路：`ProblemResolvedEvent` → `/api/agents/inspect` → `quality_reports`

## AgentScope 能力对照（摘要）

| Agent | 已实现能力（默认可用） | 规划能力（需编排启用） |
|---|---|---|
| Orchestrator | 规则/启发式路由决策；执行模式选择；可调用 MCP 工具 | 规划能力主要在 AgentScope 侧 |
| Assistant | 情绪/意图分析、知识推荐、回复建议 | 推理能力由模型侧完成 |
| Engineer | 知识检索、工单创建、历史工单检索 | 复杂诊断/方案由模型侧完成 |
| Inspector | 质检评分、改进建议输出（可落库） | 违规检测/团队对比等模型侧完成 |

## MCP 工具清单（本仓库提供）

- Conversation：`getConversationHistory`
- Customer：`getCustomerProfile` / `getCustomerHistory`
- Knowledge：`searchKnowledge`
- Task：`createTask` / `searchTickets`
- AI：`analyzeConversation` / `saveQualityReport` / `createSurvey` / `getSystemStatus` / `inspectConversation` / `generateQualityReport`

**工具实现文件**：
- `backend/src/infrastructure/agentscope/tools/ConversationTools.ts`
- `backend/src/infrastructure/agentscope/tools/CustomerTools.ts`
- `backend/src/infrastructure/agentscope/tools/KnowledgeTools.ts`
- `backend/src/infrastructure/agentscope/tools/TaskTools.ts`
- `backend/src/infrastructure/agentscope/tools/AITools.ts`

**注册入口**：
- `backend/src/infrastructure/agentscope/MCPServer.ts`
- `backend/src/infrastructure/agentscope/AgentScopeGateway.ts`

## MCP 调用与错误

**调用入口**：`POST /mcp`（tools/list, tools/call）  
**工具列表**：`GET /mcp` 或 `GET /mcp/tools`

**常见错误**：
- 缺少 method → 返回工具列表（兼容探测请求）
- method 非法 → 400 `unsupported method`
- tools/call 缺少 name → 400 `tool name is required`
- 工具不存在 → 404 `tool {name} not found`
- 工具执行异常 → 500 `tool execution failed`

## 事件桥接与健康检查

- 事件桥接：`EventBridge` → `config.agentscope.events.*`
- AgentScope 网关自检：
  - `GET /agentscope/status`
  - `GET /agentscope/config`
  - `GET /agentscope/health`

## Workflow/ReAct（可选能力）

- Workflow 引擎与 YAML 已存在，默认未接入 IM 主链路
- `WORKFLOW_ENGINE_ENABLED=true` 仅启用引擎，不会自动接入主链路
- 若需启用，需显式在业务链路触发 `WorkflowEngine.execute(...)`
