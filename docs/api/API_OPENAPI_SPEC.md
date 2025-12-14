# API 网关 OpenAPI 样例（用于 mock + contract）

## 1. 概览
- `basePath`：`/api/v1`
- 认证方式：`Authorization: Bearer <token>`，前端通过 `window.config.authToken` 获取。
- 每个请求必须接 `X-Request-Id`/`X-Trace-Id`，后端返回 `X-Span-Id` 供链路追踪。
- 所有响应包含 `meta`（`requestId`, `timestamp`, `status`）+ `data`。

## 2. 会话/IM 模块

### GET /im/conversations
- Query: `agentId`, `status`, `channel`, `sla`, `page`, `pageSize`
- Response data:
  ```json
  {
    "items": [
      {
        "conversationId": "conv-001",
        "customerId": "CUST-001",
        "customerName": "张三",
        "channel": "feishu",
        "slaLevel": "gold",
        "lastMessage": "已恢复服务",
        "unreadCount": 0,
        "emotionTag": "calm",
        "severity": "high",
        "assignedAgent": "agent-007",
        "updatedAt": "2024-07-12T10:35:00Z"
      }
    ],
    "paging": { "page": 1, "pageSize": 20, "total": 3 }
  }
  ```

### GET /im/conversations/{conversationId}/messages
- Query: `limit`, `offset`
- Response payload includes messages with `speaker`, `type`, `content`, `sentiment`, `timestamp`, `attachments`.

### POST /im/conversations/{conversationId}/messages
- Request:
  ```json
  {
    "type": "response",
    "content": "已联系研发排查",
    "channel": "feishu",
    "traceId": "req-12345",
    "attachments": []
  }
  ```
- Response: echo message + `messageId`.

### PATCH /im/conversations/{conversationId}/status
- Payload: `{ "status": "resolved", "slaStatus": "met", "note": "已完成补偿" }`

### WebSocket topics
- `im.message`: event with `conversationId`, `message`.
- `im.status`: event with `status`, `slaStatus`, `urgency`.

## 3. 客户画像与合同

### GET /profiles/{customerId}
- Response:
  ```json
  {
    "customerId": "CUST-001",
    "name": "张三",
    "title": "ABC科技 技术总监",
    "tags": ["gold-sla","重点客户"],
    "slaStatus": "有效",
    "metrics": { "contractAmount": 128000, "satisfaction": 4.5 },
    "contacts": { "phone": "138****5678", "email": "zhang@abc.com" },
    "insights": [
      { "title": "稳定性诉求", "action": "安排巡检" }
    ],
    "contracts": [
      { "contractId": "cnt-2023-001", "status": "active", "promise": "15min恢复", "due": "2024-12-31" }
    ]
  }
  ```

### GET /profiles/{customerId}/interactions
- Returns list of recent interactions (channel, summary, result, updatedAt).

### GET /contracts/{contractId}
- Returns contract details, service records, commitments, attachments.

### POST /profiles/{customerId}/refresh
- Trigger asynchronous refresh; returns job status.

## 4. 需求与任务

### GET /requirements
- Filters: `status`, `priority`
- Response includes `id`, `content`, `customerId`, `status`, `createdBy`, `createdAt`, `priority`, `relatedConversationId`.

### POST /requirements
- Request body: `{"content":"...", "customerId":"CUST-001", "sourceConversationId":"conv-001", "priority":"medium", "category":"feature"}`.
- Response returns created requirement.

### POST /requirements/{id}/ignore
- Marks requirement ignored, returns `ignoredBy` info.

### GET /requirements/statistics
- Returns overall counts, by status breakdown, SLA compliance.

### GET /tasks
- Query: `agentId`, `status`, `priority`.
- Response: tasks with `taskId`, `title`, `description`, `owner`, `status`, `relatedConversationId`, `dueAt`.

### POST /tasks
- Accepts `title`, `description`, `priority`, `owner`, `relatedEntity` (conversation/contract).

### POST /tasks/{taskId}/actions
- `action` enum: `cancel`, `execute`, `export`, `respond`. Body includes `comments`, `traceId`.

## 5. AI 与知识

### POST /ai/analyze
- Request: `{ "conversationId": "conv-001", "context": "...", "model": "gpt-4" }`
- Response: `issues`, `summary`, `nextSteps`, `priority`.

### POST /ai/solutions
- Request includes `solutionType`, `conversationId`, `messageTemplate`.
- Response includes `message`, optional `taskDraft` (`title`, `description`, `owner`), `knowledgeReferences`.

### GET /knowledge`
- Query: `topic`, `tag`, `page`.
- Response returns knowledge cards (id, title, preview, tags, url, updatedAt).

### GET /knowledge/{id}/preview` & `.../full`
- Provide preview/full content, type, attachments.

## 6. 角色与审计

### GET /session/roles
- Returns roles/permissions for current user, e.g. `{ "agentId": "agent-007", "roles": ["dialog", "quality"], "permissions": ["view_reports", "create_tasks"] }`.

### POST /audit/events
- Accepts event metadata (`userId`, `action`, `entity`, `result`, `duration`, `traceId`) for governance dashboards.

## 7. Governance Metadata Endpoints
- `GET /feature-flags`: returns flags/allowed environments.
- `POST /feature-flags/{flagName}/toggle`: for quick disable during outages (requires governance bot).

## 8. Mock Server Suggestions
- For local dev, spin up Express/Mockoon exposing the above routes with canned responses.
- Provide `X-Request-Id` echo, allow toggling `errorRate` and `latency`.

## 9. Notes
- Encouraged to version APIs (v1/v2) and expose `ready` health endpoint.
