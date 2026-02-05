# AgentScope API Reference

**服务名称**: AgentScope Service
**Base URL**: `http://localhost:5000` (开发环境)
**版本**: v1.0
**最后更新**: 2026-01-26

---

## 📋 目录

- [API概览](#api概览)
- [Agent管理API](#agent管理api)
- [质检API](#质检api)
- [对话处理API](#对话处理api)
- [事件桥接API](#事件桥接api)
- [MCP工具API](#mcp工具api)
- [错误处理](#错误处理)

---

## API概览

### 服务架构

```
┌──────────────────────────────────────┐
│  FastAPI Application (Port 5000)     │
│  ┌────────────────────────────────┐ │
│  │  /api/agents/*                  │ │
│  │  • GET  /list                   │ │
│  │  • POST /inspect                │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │  /api/chat/*                    │ │
│  │  • POST /message                │ │
│  │  • WS   /ws/{conversation_id}   │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │  /api/events/*                  │ │
│  │  • POST /bridge                 │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │  /health                        │ │
│  │  • GET  /                       │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 认证方式

**当前版本**: 无认证（内部服务）

> 备注：`/api/orchestrator/*` 相关路由为规划接口，当前实现未提供。

**未来计划**: API Key认证

---

## Agent管理API

### GET /api/agents/list

获取所有可用Agent列表。

#### 请求

```http
GET /api/agents/list HTTP/1.1
Host: localhost:5000
```

#### 响应

**状态码**: 200 OK

```json
{
  "agents": [
    "AssistantAgent",
    "EngineerAgent",
    "InspectorAgent",
    "HumanAgent"
  ]
}
```

#### 示例

```bash
curl http://localhost:5000/api/agents/list
```

---

## 质检API

### POST /api/agents/inspect

触发InspectorAgent对指定对话进行质检。

**触发时机**: 由Backend EventBus在ConversationClosedEvent触发时自动调用

#### 请求

**URL**: `/api/agents/inspect`
**Method**: POST
**Content-Type**: application/json

**请求体**:
```json
{
  "conversation_id": "conv-123"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversation_id | string | ✅ | 对话ID |

#### 响应

**状态码**: 200 OK

**响应体**:
```json
{
  "success": true,
  "conversation_id": "conv-123",
  "quality_score": 75,
  "report": {
    "quality_score": 75,
    "dimensions": {
      "completeness": 80,
      "professionalism": 75,
      "compliance": 85,
      "tone": 60
    },
    "sentiment_improvement": 45,
    "customer_satisfaction_prediction": 3.5,
    "risk_indicators": [
      "回复过于简短",
      "未提供预计解决时间"
    ],
    "improvement_suggestions": [
      "应主动安抚客户情绪",
      "应提供更详细信息"
    ],
    "need_follow_up": true,
    "follow_up_reason": "客户问题未完全解决",
    "survey_questions": [
      "本次服务是否解决了您的问题？",
      "您对我们的响应速度是否满意？"
    ]
  }
}
```

**响应字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 质检是否成功 |
| conversation_id | string | 对话ID |
| quality_score | integer | 综合质量分（0-100） |
| report | object | 详细质检报告 |
| report.dimensions | object | 评分维度详情 |
| report.dimensions.completeness | integer | 完整性评分（0-100） |
| report.dimensions.professionalism | integer | 专业度评分（0-100） |
| report.dimensions.compliance | integer | 合规性评分（0-100） |
| report.dimensions.tone | integer | 语气评分（0-100） |
| report.sentiment_improvement | integer | 情绪改善百分比（0-100） |
| report.customer_satisfaction_prediction | number | 客户满意度预测（1-5星） |
| report.risk_indicators | string[] | 风险指标列表 |
| report.improvement_suggestions | string[] | 改进建议列表 |
| report.need_follow_up | boolean | 是否需要回访 |
| report.follow_up_reason | string | 回访原因 |
| report.survey_questions | string[] | 调研问题列表 |

#### 错误响应

**状态码**: 500 Internal Server Error

```json
{
  "detail": "InspectorAgent not initialized"
}
```

或

```json
{
  "detail": "Quality inspection failed: [错误详情]"
}
```

#### 示例

```bash
curl -X POST http://localhost:5000/api/agents/inspect \
  -H "Content-Type: application/json" \
  -d '{"conversation_id": "conv-123"}'
```

#### 性能指标

| 指标 | 典型值 | 最大值 |
|------|--------|--------|
| **平均响应时间** | 8秒 | 30秒 |
| **成功率** | 97% | - |
| **超时时间** | 30秒 | - |

---

## 对话处理API

### POST /api/chat/message

发送消息给路由器，由Agent响应。

#### 请求

**URL**: `/api/chat/message`
**Method**: POST
**Content-Type**: application/json

**请求体**:
```json
{
  "conversation_id": "conv-123",
  "message": "系统报500错误，无法登录",
  "customer_id": "customer-456",
  "metadata": {
    "channel": "web"
  }
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversation_id | string | ✅ | 对话ID |
| message | string | ✅ | 用户消息内容 |
| customer_id | string | ✅ | 客户ID |
| metadata | object | ❌ | 元数据（渠道、时间等） |

#### 响应

**状态码**: 200 OK

**响应体**:
```json
{
  "success": true,
  "message": "已收到反馈，正在排查问题。",
  "agent_name": "AssistantAgent",
  "mode": "agent_auto",
  "confidence": 0.88,
  "metadata": {
    "mode": "agent_auto"
  }
}
```

#### 示例

```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv-123",
    "message": "系统报500错误",
    "customer_id": "customer-456"
  }'
```

---

### WS /api/chat/ws/{conversation_id}

WebSocket 用于接收事件回推与人工输入。

---

### GET /api/chat/status

服务状态。

#### 响应

```json
{ "status": "ready" }
```

---

## 事件桥接API

### POST /api/events/bridge

接收后端 Domain Event 并推送到前端 WebSocket。

#### 请求

**URL**: `/api/events/bridge`
**Method**: POST
**Content-Type**: application/json

**请求体**:
```json
{
  "eventId": "evt-123",
  "eventType": "ConversationClosed",
  "aggregateId": "conv-123",
  "payload": { "summary": "resolved" },
  "occurredAt": "2026-01-26T06:20:00Z",
  "version": 1
}
```

#### 响应

```json
{ "status": "accepted" }
```

---

## MCP工具API

### 概述

MCP（Model Context Protocol）工具由Backend提供，AgentScope通过HTTP调用。

**Base URL**: `http://localhost:8080/mcp` (Backend)

说明：MCP 采用 JSON-RPC 风格调用（`POST /mcp`），工具列表可通过 `GET /mcp` 或 `GET /mcp/tools` 获取。

### 可用工具列表

| 工具名称 | 功能 | 使用Agent | 状态 |
|---------|------|----------|------|
| **analyzeConversation** | 情感分析 | Assistant | ✅ 已实现 |
| **searchKnowledge** | 知识库检索 | Assistant, Engineer | ✅ 已实现 |
| **getCustomerProfile** | 客户画像 | Assistant | ✅ 已实现 |
| **getConversationHistory** | 对话历史 | Inspector | ✅ 已实现 |
| **createTask** | 创建工单 | Engineer, Inspector | ✅ 已实现 |
| **createSurvey** | 创建调研 | Inspector | ✅ 已实现 |
| **saveQualityReport** | 保存质检报告 | Inspector | ✅ 已实现 |
| **searchTickets** | 工单检索 | Engineer | ✅ 已实现 |

---

### analyzeConversation

情感分析工具。

#### 请求

```json
{
  "conversationId": "conv-123",
  "context": "sentiment",
  "includeHistory": true
}
```

#### 响应

```json
{
  "overallSentiment": "neutral",
  "intensity": "urgent",
  "score": 0.6,
  "riskLevel": "medium",
  "emotionalTrend": "declining"
}
```

---

### searchKnowledge

知识库检索工具。

#### 请求

```json
{
  "query": "认证服务故障",
  "filters": {
    "category": "fault"
  },
  "mode": "semantic"
}
```

#### 响应

```json
[
  {
    "title": "认证服务故障排查指南",
    "content": "认证服务常见故障原因包括...",
    "relevance": 0.95,
    "category": "fault"
  }
]
```

---

### getConversationHistory

获取对话历史。

#### 请求

```json
{
  "conversationId": "conv-123",
  "includeMetadata": true
}
```

#### 响应

```json
[
  {
    "role": "user",
    "content": "系统报错了",
    "timestamp": "2025-12-27T10:00:00Z",
    "metadata": {
      "customerId": "customer-456"
    }
  },
  {
    "role": "assistant",
    "content": "请提供具体错误码",
    "timestamp": "2025-12-27T10:00:05Z"
  }
]
```

---

### createTask

创建工单。

#### 请求

```json
{
  "title": "P0故障-认证服务宕机",
  "priority": "urgent",
  "conversationId": "conv-123",
  "requirementId": null
}
```

#### 响应

```json
{
  "taskId": "task-789",
  "status": "created",
  "assignee": null
}
```

---

## 错误处理

### 标准错误响应

```json
{
  "detail": "错误描述"
}
```

### HTTP状态码

| 状态码 | 说明 | 场景 |
|--------|------|------|
| **200** | 成功 | 请求成功 |
| **400** | 请求错误 | 参数缺失或格式错误 |
| **500** | 服务器错误 | Agent未初始化、LLM故障 |
| **503** | 服务不可用 | 系统维护 |

### 常见错误

#### InspectorAgent未初始化

```json
{
  "detail": "InspectorAgent not initialized"
}
```

**原因**: Agent Manager未正确初始化InspectorAgent

**解决**: 检查AgentScope服务启动日志，确认Agent初始化成功

---

#### 质检失败

```json
{
  "detail": "Quality inspection failed: LLM API timeout"
}
```

**原因**: DeepSeek API超时或故障

**解决**: 检查网络连接，确认DeepSeek API可用

---

#### 对话历史获取失败

```json
{
  "detail": "Failed to get conversation history: Backend MCP error"
}
```

**原因**: Backend MCP服务不可用

**解决**: 检查Backend服务状态，确认MCP接口可访问

---

## 性能优化建议

### 1. 并发控制

- 质检API建议最大并发：10
- 超过并发限制时返回503

### 2. 超时设置

- 质检API：30秒超时
- MCP工具调用：10秒超时

### 3. 缓存策略

- 对话历史缓存：5分钟
- 知识库检索缓存：1小时

---

## 监控指标

### API响应时间

| API | P50 | P95 | P99 |
|-----|-----|-----|-----|
| **/api/agents/inspect** | 8s | 15s | 25s |
| **/api/chat/message** | 3s | 10s | 18s |
| **/api/agents/list** | 10ms | 20ms | 50ms |

### API成功率

| API | 目标成功率 | 当前成功率 |
|-----|-----------|-----------|
| **/api/agents/inspect** | >95% | 97% |
| **/api/chat/message** | >98% | 99% |

---

## 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-01-26 | 初始版本，包含质检与对话API |

---

**文档维护者**: After-Sales 开发团队
**最后更新**: 2026-01-26
