# API Reference (Comprehensive)

- Generated: 2026-02-10
- Includes: Backend (Fastify) + AgentScope Service (FastAPI)

## Backend APIs (Fastify)

### POST `/api/v1/ai/analyze`

- Module: `aiRoutes`
- Purpose: 生成问题诊断与澄清建议（前端：问题澄清）
- Source: `backend/src/presentation/http/routes/aiRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: { conversationId: string; context?: string; model?: string; options?: Record<string, unknown>; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: ai.use
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/ai/analyze`

### POST `/api/v1/ai/solutions`

- Module: `aiRoutes`
- Purpose: 生成可执行的AI解决方案建议（前端：AI解决方案）
- Source: `backend/src/presentation/http/routes/aiRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: { conversationId: string; solutionType: string; solutionId?: string; messageTemplate?: string; customization?: Record<string, unknown>; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: ai.use
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/ai/solutions`

### POST `/api/v1/audit/events`

- Module: `auditRoutes`
- Purpose: 审计事件上报接口（记录关键操作）
- Source: `backend/src/presentation/http/routes/auditRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateAuditEventRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: audit.write
- Status Codes: 201, 400
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/audit/events`

### GET `/api/v1/audit/reports/summary`

- Module: `auditRoutes`
- Purpose: 审计报表汇总接口（时间范围摘要）
- Source: `backend/src/presentation/http/routes/auditRoutes.ts`
- Path Params: none
- Query Params: { days?: string }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: audit.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/audit/reports/summary`

### POST `/api/v1/api/auth/login`

- Module: `authRoutes`
- Purpose: 用户登录接口（获取访问令牌）
- Source: `backend/src/presentation/http/routes/authRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: LoginRequestDTO
- Headers: Authorization: no auth; Content-Type: application/json
- Permissions: n/a
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/auth/login`

### POST `/api/v1/api/auth/register`

- Module: `authRoutes`
- Purpose: 用户注册接口（创建账号）
- Source: `backend/src/presentation/http/routes/authRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: RegisterRequestDTO
- Headers: Authorization: no auth; Content-Type: application/json
- Permissions: n/a
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/auth/register`

### GET `/api/v1/api/auth/me`

- Module: `authRoutes`
- Purpose: 获取当前登录用户信息接口
- Source: `backend/src/presentation/http/routes/authRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: session.read
- Status Codes: 200, 401
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/auth/me`

### POST `/api/v1/api/conversations`

- Module: `conversationRoutes`
- Purpose: 创建会话接口（初始化对话）
- Source: `backend/src/presentation/http/routes/conversationRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateConversationRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: conversations.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/conversations`

### GET `/api/v1/api/conversations`

- Module: `conversationRoutes`
- Purpose: 会话列表查询接口（分页/筛选）
- Source: `backend/src/presentation/http/routes/conversationRoutes.ts`
- Path Params: none
- Query Params: { status?: string; agentId?: string; customerId?: string; channel?: string; slaStatus?: string; page?: string; limit?: string; }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: conversations.read
- Status Codes: 200
- Response Schema: ConversationListResponseDTO (items include issueDescription/relatedProduct/tags/unreadCount)
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/conversations`

### POST `/api/v1/api/conversations/:id/assign`

- Module: `conversationRoutes`
- Purpose: 会话指派接口（分配处理人）
- Source: `backend/src/presentation/http/routes/conversationRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { agentId: string; assignedBy?: string; reason?: 'manual' | 'auto' | 'reassign'; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: conversations.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/conversations/:id/assign`

### GET `/api/v1/api/conversations/:id`

- Module: `conversationRoutes`
- Purpose: 会话详情查询接口
- Source: `backend/src/presentation/http/routes/conversationRoutes.ts`
- Path Params: { id: string }
- Query Params: { includeMessages?: string }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: conversations.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/conversations/:id`

### PUT `/api/v1/api/conversations/:id`

- Module: `conversationRoutes`
- Purpose: 更新会话信息接口（状态/字段）
- Source: `backend/src/presentation/http/routes/conversationRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { status?: string; mode?: string; metadata?: Record<string, unknown>; reason?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: conversations.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PUT http://localhost:8080/api/v1/api/conversations/:id`

### POST `/api/v1/api/conversations/:id/messages`

- Module: `conversationRoutes`
- Purpose: 发送会话消息接口
- Source: `backend/src/presentation/http/routes/conversationRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { senderId: string; senderType: 'internal' | 'external'; content: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: conversations.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/conversations/:id/messages`

### GET `/api/v1/api/conversations/:id/messages/:messageId`

- Module: `conversationRoutes`
- Purpose: 会话消息详情查询接口
- Source: `backend/src/presentation/http/routes/conversationRoutes.ts`
- Path Params: { id: string; messageId: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: conversations.read
- Status Codes: 200, 404
- Response Schema: MessageDTO
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/conversations/:id/messages/:messageId`

### POST `/api/v1/api/conversations/:id/close`

- Module: `conversationRoutes`
- Purpose: 关闭会话接口
- Source: `backend/src/presentation/http/routes/conversationRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { closedBy: string; reason?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: conversations.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/conversations/:id/close`

### GET `/api/v1/api/customers/:id`

- Module: `customerRoutes`
- Purpose: 客户档案查询接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/customers/:id`

### POST `/api/v1/api/customers`

- Module: `customerRoutes`
- Purpose: 创建客户档案接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateCustomerProfileRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/customers`

### POST `/api/v1/api/customers/:id/bind-external`

- Module: `customerRoutes`
- Purpose: 绑定外部系统标识接口（IM/CRM）
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: Omit<BindExternalIdentityRequestDTO,
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/customers/:id/bind-external`

### GET `/api/v1/api/customers/:id/bindings`

- Module: `customerRoutes`
- Purpose: 查询客户绑定关系接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/customers/:id/bindings`

### DELETE `/api/v1/api/customers/:id/bindings`

- Module: `customerRoutes`
- Purpose: 解绑外部系统标识接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: Omit<UnbindExternalIdentityRequestDTO,
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X DELETE http://localhost:8080/api/v1/api/customers/:id/bindings`

### POST `/api/v1/api/customers/:id/refresh`

- Module: `customerRoutes`
- Purpose: 刷新客户画像接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { source: string; metrics?: { satisfactionScore: number; issueCount: number; averageResolutionMinutes: number; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/customers/:id/refresh`

### GET `/api/v1/api/customers/:id/interactions`

- Module: `customerRoutes`
- Purpose: 客户交互记录查询接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/customers/:id/interactions`

### POST `/api/v1/api/customers/:id/service-records`

- Module: `customerRoutes`
- Purpose: 创建客户服务记录接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { title: string; description: string; ownerId?: string; outcome?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/customers/:id/service-records`

### PATCH `/api/v1/api/customers/:id/commitments/:commitmentId`

- Module: `customerRoutes`
- Purpose: 更新客户承诺事项接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string; commitmentId: string }
- Query Params: none
- Body Schema: { progress: number }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/api/customers/:id/commitments/:commitmentId`

### POST `/api/v1/api/customers/:id/interactions`

- Module: `customerRoutes`
- Purpose: 新增客户互动记录接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { interactionType: 'call' | 'chat' | 'email' | 'meeting'; occurredAt?: string; notes?: string; channel?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/customers/:id/interactions`

### POST `/api/v1/api/customers/:id/mark-vip`

- Module: `customerRoutes`
- Purpose: 标记客户VIP接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { reason?: string }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/customers/:id/mark-vip`

### POST `/api/v1/im/incoming-message`

- Module: `imRoutes`
- Purpose: IM入站消息接收接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: IncomingMessageRequest
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.write
- Status Codes: 200, 400, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/im/incoming-message`

### GET `/api/v1/im/conversations`

- Module: `imRoutes`
- Purpose: IM会话列表查询接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: none
- Query Params: { limit?: string; offset?: string; page?: string; pageSize?: string; status?: string; agentId?: string; customerId?: string; channel?: string; includeProblem?: string; }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/im/conversations`

### GET `/api/v1/im/conversations/stats`

- Module: `imRoutes`
- Purpose: IM会话统计接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: none
- Query Params: { channel?: string; urgency?: string; sla?: string; }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/im/conversations/stats`

### GET `/api/v1/im/conversations/:id/messages`

- Module: `imRoutes`
- Purpose: IM会话消息列表接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.read
- Status Codes: 200, 404, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/im/conversations/:id/messages`

### POST `/api/v1/im/conversations/:id/messages`

- Module: `imRoutes`
- Purpose: IM会话发送消息接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { content: string; messageType?: string }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.write
- Status Codes: 200, 400, 404, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/im/conversations/:id/messages`

### POST `/api/v1/im/reviews/submit`

- Module: `imRoutes`
- Purpose: IM质检提交接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: { reviewId: string; status: 'approved' | 'rejected'; reviewerNote?: string; createTasks?: boolean; modifiedSuggestion?: Record<string, unknown>; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.write
- Status Codes: 200, 400, 404, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/im/reviews/submit`

### GET `/api/v1/im/reviews/pending`

- Module: `imRoutes`
- Purpose: IM待质检列表接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/im/reviews/pending`

### GET `/api/v1/im/reviews/stream`

- Module: `imRoutes`
- Purpose: IM质检流式拉取接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/im/reviews/stream`

### GET `/api/v1/im/conversations/:id/problems`

- Module: `imRoutes`
- Purpose: IM会话问题列表接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/im/conversations/:id/problems`

### PATCH `/api/v1/im/conversations/:id/status`

- Module: `imRoutes`
- Purpose: IM会话状态更新接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { status: string }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.write
- Status Codes: 200, 400, 404, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/im/conversations/:id/status`

### PATCH `/api/v1/im/conversations/:id/mode`

- Module: `imRoutes`
- Purpose: IM会话模式切换接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { mode: AgentMode }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: im.write
- Status Codes: 200, 400, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/im/conversations/:id/mode`

### GET `/api/v1/profiles/:customerId`

- Module: `imRoutes`
- Purpose: 客户画像查询接口（IM聚合视图）
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { customerId: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.read
- Status Codes: 200, 404, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/profiles/:customerId`

### GET `/api/v1/profiles/:customerId/interactions`

- Module: `imRoutes`
- Purpose: 客户互动记录查询接口（IM聚合视图）
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { customerId: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/profiles/:customerId/interactions`

### GET `/api/v1/quality/:conversationId`

- Module: `imRoutes`
- Purpose: 会话质量分析结果查询接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { conversationId: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.read
- Status Codes: 200, 404, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/quality/:conversationId`

### GET `/api/v1/quality/:conversationId/reports`

- Module: `imRoutes`
- Purpose: 查询会话质检/故障报告列表（前端：生成故障报告）
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { conversationId: string }
- Query Params: { limit?: string; offset?: string }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/quality/:conversationId/reports`

### GET `/api/v1/quality/reports`

- Module: `imRoutes`
- Purpose: 查询质检/故障报告汇总（前端：生成故障报告）
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: none
- Query Params: { limit?: string; offset?: string }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/quality/reports`

### GET `/api/v1/im/conversations/:id/ai-analysis`

- Module: `imRoutes`
- Purpose: 会话AI分析结果查询接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: ai.use
- Status Codes: 200, 404, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/im/conversations/:id/ai-analysis`

### GET `/api/v1/im/conversations/:id/sentiment`

- Module: `imRoutes`
- Purpose: 会话情感分析结果查询接口
- Source: `backend/src/presentation/http/routes/imRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: ai.use
- Status Codes: 200, 400, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/im/conversations/:id/sentiment`

### POST `/api/v1/api/knowledge/search`

- Module: `knowledgeRoutes`
- Purpose: 知识库检索接口
- Source: `backend/src/presentation/http/routes/knowledgeRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: SearchKnowledgeRequest
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: knowledge.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/knowledge/search`

### POST `/api/v1/api/knowledge/upload`

- Module: `knowledgeRoutes`
- Purpose: 知识库文件上传接口
- Source: `backend/src/presentation/http/routes/knowledgeRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: Record<string, unknown>
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: knowledge.write
- Status Codes: 200, 201, 202
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/knowledge/upload`

### GET `/api/v1/api/knowledge/:id/progress`

- Module: `knowledgeRoutes`
- Purpose: 知识处理进度查询接口
- Source: `backend/src/presentation/http/routes/knowledgeRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: knowledge.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/knowledge/:id/progress`

### POST `/api/v1/api/knowledge/:id/sync`

- Module: `knowledgeRoutes`
- Purpose: 知识库同步接口
- Source: `backend/src/presentation/http/routes/knowledgeRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { uploadDocId?: string }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: knowledge.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/knowledge/:id/sync`

### POST `/api/v1/api/knowledge/:id/retry`

- Module: `knowledgeRoutes`
- Purpose: 知识处理重试接口
- Source: `backend/src/presentation/http/routes/knowledgeRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: knowledge.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/knowledge/:id/retry`

### POST `/api/v1/api/knowledge`

- Module: `knowledgeRoutes`
- Purpose: 创建知识条目接口
- Source: `backend/src/presentation/http/routes/knowledgeRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: { title: string; content: string; category: string; tags?: string[]; source: string; metadata?: Record<string, unknown>; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: knowledge.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/knowledge`

### GET `/api/v1/api/knowledge/:id`

- Module: `knowledgeRoutes`
- Purpose: 获取知识条目详情接口
- Source: `backend/src/presentation/http/routes/knowledgeRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: knowledge.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/knowledge/:id`

### GET `/api/v1/api/knowledge`

- Module: `knowledgeRoutes`
- Purpose: 知识条目列表查询接口
- Source: `backend/src/presentation/http/routes/knowledgeRoutes.ts`
- Path Params: none
- Query Params: { category?: string; source?: string; tags?: string; query?: string; page?: string; limit?: string; }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: knowledge.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/knowledge`

### PATCH `/api/v1/api/knowledge/:id`

- Module: `knowledgeRoutes`
- Purpose: 更新知识条目接口
- Source: `backend/src/presentation/http/routes/knowledgeRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { title?: string; content?: string; category?: string; tags?: string[]; metadata?: Record<string, unknown>; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: knowledge.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/api/knowledge/:id`

### DELETE `/api/v1/api/knowledge/:id`

- Module: `knowledgeRoutes`
- Purpose: 删除知识条目接口
- Source: `backend/src/presentation/http/routes/knowledgeRoutes.ts`
- Path Params: { id: string }
- Query Params: { deleteRelatedFaq?: string }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: knowledge.write
- Status Codes: 204
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X DELETE http://localhost:8080/api/v1/api/knowledge/:id`

### GET `/metrics`

- Module: `metricsRoutes`
- Purpose: Prometheus指标采集接口
- Source: `backend/src/presentation/http/routes/metricsRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: monitoring.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/metrics`

### GET `/health`

- Module: `metricsRoutes`
- Purpose: 服务健康检查接口
- Source: `backend/src/presentation/http/routes/metricsRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: no auth; Content-Type: application/json
- Permissions: n/a
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/health`

### GET `/api/v1/monitoring/alerts`

- Module: `monitoringRoutes`
- Purpose: 监控告警列表查询接口
- Source: `backend/src/presentation/http/routes/monitoringRoutes.ts`
- Path Params: none
- Query Params: { status?: string }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: monitoring.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/monitoring/alerts`

### POST `/api/v1/monitoring/alerts`

- Module: `monitoringRoutes`
- Purpose: 创建/触发告警接口
- Source: `backend/src/presentation/http/routes/monitoringRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateMonitoringAlertRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: monitoring.write
- Status Codes: 201, 400
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/monitoring/alerts`

### PATCH `/api/v1/monitoring/alerts/:id/resolve`

- Module: `monitoringRoutes`
- Purpose: 告警解除接口
- Source: `backend/src/presentation/http/routes/monitoringRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: monitoring.write
- Status Codes: 200, 404
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/monitoring/alerts/:id/resolve`

### GET `/api/v1/api/roles`

- Module: `permissionRoutes`
- Purpose: 角色列表查询接口
- Source: `backend/src/presentation/http/routes/permissionRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: permissions.roles.manage
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/roles`

### POST `/api/v1/api/roles`

- Module: `permissionRoutes`
- Purpose: 创建角色接口
- Source: `backend/src/presentation/http/routes/permissionRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateRoleRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: permissions.roles.manage
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/roles`

### PATCH `/api/v1/api/roles/:id`

- Module: `permissionRoutes`
- Purpose: 更新角色接口
- Source: `backend/src/presentation/http/routes/permissionRoutes.ts`
- Path Params: id
- Query Params: none
- Body Schema: UpdateRoleRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: permissions.roles.manage
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/api/roles/:id`

### DELETE `/api/v1/api/roles/:id`

- Module: `permissionRoutes`
- Purpose: 删除角色接口
- Source: `backend/src/presentation/http/routes/permissionRoutes.ts`
- Path Params: id
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: permissions.roles.manage
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X DELETE http://localhost:8080/api/v1/api/roles/:id`

### GET `/api/v1/api/members`

- Module: `permissionRoutes`
- Purpose: 成员列表查询接口
- Source: `backend/src/presentation/http/routes/permissionRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: permissions.members.manage
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/members`

### POST `/api/v1/api/members`

- Module: `permissionRoutes`
- Purpose: 创建成员接口
- Source: `backend/src/presentation/http/routes/permissionRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateMemberRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: permissions.members.manage
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/members`

### PATCH `/api/v1/api/members/:id`

- Module: `permissionRoutes`
- Purpose: 更新成员接口
- Source: `backend/src/presentation/http/routes/permissionRoutes.ts`
- Path Params: id
- Query Params: none
- Body Schema: UpdateMemberRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: permissions.members.manage
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/api/members/:id`

### DELETE `/api/v1/api/members/:id`

- Module: `permissionRoutes`
- Purpose: 删除成员接口
- Source: `backend/src/presentation/http/routes/permissionRoutes.ts`
- Path Params: id
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: permissions.members.manage
- Status Codes: 200, 403
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X DELETE http://localhost:8080/api/v1/api/members/:id`

### POST `/api/v1/api/problems`

- Module: `problemRoutes`
- Purpose: 创建问题单接口
- Source: `backend/src/presentation/http/routes/problemRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: { customerId: string; conversationId: string; title: string; description?: string; intent?: string; confidence?: number; metadata?: Record<string, unknown>; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: problems.write
- Status Codes: 201, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/problems`

### GET `/api/v1/api/problems/:id`

- Module: `problemRoutes`
- Purpose: 问题单详情查询接口
- Source: `backend/src/presentation/http/routes/problemRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: problems.read
- Status Codes: 200, 404, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/problems/:id`

### GET `/api/v1/api/problems`

- Module: `problemRoutes`
- Purpose: 问题单列表查询接口
- Source: `backend/src/presentation/http/routes/problemRoutes.ts`
- Path Params: none
- Query Params: { conversationId?: string; customerId?: string; status?: string; page?: string; limit?: string; }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: problems.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/problems`

### PATCH `/api/v1/api/problems/:id/status`

- Module: `problemRoutes`
- Purpose: 问题单状态更新接口
- Source: `backend/src/presentation/http/routes/problemRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { status: string; reason?: string }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: problems.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/api/problems/:id/status`

### GET `/api/v1/api/quality/:conversationId`

- Module: `qualityRoutes`
- Purpose: 会话质检详情接口
- Source: `backend/src/presentation/http/routes/qualityRoutes.ts`
- Path Params: { conversationId: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: quality.read
- Status Codes: 200, 404, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/quality/:conversationId`

### GET `/api/v1/api/quality/:conversationId/reports`

- Module: `qualityRoutes`
- Purpose: 查询会话质检/故障报告列表（前端：生成故障报告）
- Source: `backend/src/presentation/http/routes/qualityRoutes.ts`
- Path Params: { conversationId: string }
- Query Params: { page?: string; limit?: string }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: quality.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/quality/:conversationId/reports`

### GET `/api/v1/api/quality/reports`

- Module: `qualityRoutes`
- Purpose: 查询质检/故障报告汇总（前端：生成故障报告）
- Source: `backend/src/presentation/http/routes/qualityRoutes.ts`
- Path Params: none
- Query Params: { page?: string; limit?: string }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: quality.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/quality/reports`

### POST `/api/v1/api/requirements`

- Module: `requirementRoutes`
- Purpose: 创建需求检测记录（前端：需求检测）
- Source: `backend/src/presentation/http/routes/requirementRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateRequirementRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: requirements.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/requirements`

### GET `/api/v1/api/requirements/:id`

- Module: `requirementRoutes`
- Purpose: 查询或更新需求检测记录（前端：需求检测）
- Source: `backend/src/presentation/http/routes/requirementRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: requirements.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/requirements/:id`

### GET `/api/v1/api/requirements`

- Module: `requirementRoutes`
- Purpose: 创建需求检测记录（前端：需求检测）
- Source: `backend/src/presentation/http/routes/requirementRoutes.ts`
- Path Params: none
- Query Params: { customerId?: string; conversationId?: string; status?: string; category?: string; priority?: string; page?: string; limit?: string; }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: requirements.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/requirements`

### GET `/api/v1/api/requirements/statistics`

- Module: `requirementRoutes`
- Purpose: 需求检测统计汇总（前端：需求检测）
- Source: `backend/src/presentation/http/routes/requirementRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: requirements.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/requirements/statistics`

### PATCH `/api/v1/api/requirements/:id/status`

- Module: `requirementRoutes`
- Purpose: 更新需求检测状态（前端：需求检测）
- Source: `backend/src/presentation/http/routes/requirementRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { status: 'pending' | 'approved' | 'resolved' | 'ignored' | 'cancelled'; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: requirements.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/api/requirements/:id/status`

### PATCH `/api/v1/api/requirements/:id`

- Module: `requirementRoutes`
- Purpose: 查询或更新需求检测记录（前端：需求检测）
- Source: `backend/src/presentation/http/routes/requirementRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { status: 'pending' | 'approved' | 'resolved' | 'ignored' | 'cancelled'; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: requirements.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/api/requirements/:id`

### POST `/api/v1/api/requirements/:id/ignore`

- Module: `requirementRoutes`
- Purpose: 忽略需求检测结果（前端：需求检测）
- Source: `backend/src/presentation/http/routes/requirementRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: requirements.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/requirements/:id/ignore`

### DELETE `/api/v1/api/requirements/:id`

- Module: `requirementRoutes`
- Purpose: 查询或更新需求检测记录（前端：需求检测）
- Source: `backend/src/presentation/http/routes/requirementRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: requirements.delete
- Status Codes: 204
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X DELETE http://localhost:8080/api/v1/api/requirements/:id`

### POST `/api/v1/api/reviews`

- Module: `reviewRoutes`
- Purpose: 创建复核/质检任务接口
- Source: `backend/src/presentation/http/routes/reviewRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: { conversationId: string; suggestion: Record<string, unknown>; confidence?: number; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: reviews.write
- Status Codes: 201, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/reviews`

### GET `/api/v1/api/reviews/:id`

- Module: `reviewRoutes`
- Purpose: 复核/质检任务详情接口
- Source: `backend/src/presentation/http/routes/reviewRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: reviews.read
- Status Codes: 200, 404, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/reviews/:id`

### GET `/api/v1/api/reviews`

- Module: `reviewRoutes`
- Purpose: 复核/质检任务列表接口
- Source: `backend/src/presentation/http/routes/reviewRoutes.ts`
- Path Params: none
- Query Params: { conversationId?: string; status?: string; page?: string; limit?: string; }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: reviews.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/reviews`

### POST `/api/v1/api/reviews/:id/complete`

- Module: `reviewRoutes`
- Purpose: 完成复核/质检任务接口
- Source: `backend/src/presentation/http/routes/reviewRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { status: 'approved' | 'rejected'; reviewerId?: string; reviewerNote?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: reviews.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/reviews/:id/complete`

### GET `/api/v1/session/roles`

- Module: `sessionRoutes`
- Purpose: 当前会话角色列表接口
- Source: `backend/src/presentation/http/routes/sessionRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: session.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/session/roles`

### GET `/api/v1/session/permissions`

- Module: `sessionRoutes`
- Purpose: 当前会话权限列表接口
- Source: `backend/src/presentation/http/routes/sessionRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: session.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/session/permissions`

### POST `/api/v1/api/tasks`

- Module: `taskRoutes`
- Purpose: 创建任务接口
- Source: `backend/src/presentation/http/routes/taskRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateTaskRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/tasks`

### GET `/api/v1/api/tasks/:id`

- Module: `taskRoutes`
- Purpose: 任务详情查询接口
- Source: `backend/src/presentation/http/routes/taskRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/tasks/:id`

### GET `/api/v1/api/tasks`

- Module: `taskRoutes`
- Purpose: 任务列表查询接口
- Source: `backend/src/presentation/http/routes/taskRoutes.ts`
- Path Params: none
- Query Params: { assigneeId?: string; conversationId?: string; requirementId?: string; type?: string; status?: string; priority?: string; page?: string; limit?: string; }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/tasks`

### GET `/api/v1/api/workorders/:id`

- Module: `taskRoutes`
- Purpose: 工单详情查询接口
- Source: `backend/src/presentation/http/routes/taskRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/workorders/:id`

### GET `/api/v1/api/workorders`

- Module: `taskRoutes`
- Purpose: 创建工单（前端：创建工单）
- Source: `backend/src/presentation/http/routes/taskRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X GET http://localhost:8080/api/v1/api/workorders`

### POST `/api/v1/api/workorders`

- Module: `taskRoutes`
- Purpose: 创建工单（前端：创建工单）
- Source: `backend/src/presentation/http/routes/taskRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: Record<string, unknown>
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/workorders`

### POST `/api/v1/api/tasks/:id/assign`

- Module: `taskRoutes`
- Purpose: 任务指派接口
- Source: `backend/src/presentation/http/routes/taskRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { assigneeId: string }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.assign
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/tasks/:id/assign`

### PATCH `/api/v1/api/tasks/:id/status`

- Module: `taskRoutes`
- Purpose: 任务状态更新接口
- Source: `backend/src/presentation/http/routes/taskRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X PATCH http://localhost:8080/api/v1/api/tasks/:id/status`

### POST `/api/v1/api/tasks/:id/complete`

- Module: `taskRoutes`
- Purpose: 任务完成接口
- Source: `backend/src/presentation/http/routes/taskRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { qualityScore?: { timeliness: number; completeness: number; satisfaction: number; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.complete
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/tasks/:id/complete`

### POST `/api/v1/api/tasks/:id/actions`

- Module: `taskRoutes`
- Purpose: 任务动作执行接口
- Source: `backend/src/presentation/http/routes/taskRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { action: string }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: tasks.write
- Status Codes: 200, 400
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
- Example: `curl -X POST http://localhost:8080/api/v1/api/tasks/:id/actions`

## AgentScope Service APIs (FastAPI)

### GET `/api/agents/list`

- Module: `agents`
- Purpose: 查询可用Agent列表（前端：Agent选择/配置）
- Source: `agentscope-service/src/api/routes/agents.py`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {...}
- Response Example (error): {"detail": "error message"}
- Example: `curl -X GET http://localhost:5000/api/agents/list`

### POST `/api/agents/inspect`

- Module: `agents`
- Purpose: 生成会话质检/故障报告（前端：生成故障报告）
- Source: `agentscope-service/src/api/routes/agents.py`
- Path Params: none
- Query Params: none
- Body Schema: { conversation_id: str }
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: { success: bool, conversation_id: str, quality_score: int, report: dict }
- Response Example (success): { success: bool, conversation_id: str, quality_score: int, report: dict }
- Response Example (error): {"detail": "error message"}
- Example: `curl -X POST http://localhost:5000/api/agents/inspect`

### POST `/api/chat/message`

- Module: `chat`
- Purpose: 生成客服回复建议/话术（前端：回复建议）
- Source: `agentscope-service/src/api/routes/chat.py`
- Path Params: none
- Query Params: none
- Body Schema: { conversation_id: str, message: str, customer_id: str, metadata: Dict[str, Any] }
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: { success: bool, message: str, agent_name: str, mode: str, confidence: float, metadata: Dict[str, Any] }
- Response Example (success): { success: bool, message: str, agent_name: str, mode: str, confidence: float, metadata: Dict[str, Any] }
- Response Example (error): {"detail": "error message"}
- Example: `curl -X POST http://localhost:5000/api/chat/message`

### GET `/api/chat/status`

- Module: `chat`
- Purpose: 查询Agent服务运行状态（前端：服务状态/健康提示）
- Source: `agentscope-service/src/api/routes/chat.py`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {...}
- Response Example (error): {"detail": "error message"}
- Example: `curl -X GET http://localhost:5000/api/chat/status`

### POST `/api/events/bridge`

- Module: `events`
- Purpose: 事件桥接转发接口
- Source: `agentscope-service/src/api/routes/events.py`
- Path Params: none
- Query Params: none
- Body Schema: unknown
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {...}
- Response Example (error): {"detail": "error message"}
- Example: `curl -X POST http://localhost:5000/api/events/bridge`

### GET `/metrics`

- Module: `main`
- Purpose: Prometheus指标采集接口
- Source: `agentscope-service/src/api/main.py`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: metrics text
- Response Example (success): {...}
- Response Example (error): {"detail": "error message"}
- Example: `curl -X GET http://localhost:5000/metrics`

### GET `/health`

- Module: `main`
- Purpose: 服务健康检查接口
- Source: `agentscope-service/src/api/main.py`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: { status: string, agentscope_version: string, agents_ready: boolean }
- Response Example (success): { status: string, agentscope_version: string, agents_ready: boolean }
- Response Example (error): {"detail": "error message"}
- Example: `curl -X GET http://localhost:5000/health`

## AgentScope WebSocket
- Path: `/api/chat/ws/{conversation_id}`
- Purpose: human-in-loop / interrupt events
- Example message: `{ "type": "human_input", "content": "...", "metadata": {} }`

### POST `/api/v1/tools/logs/query`

- Module: `assistCheckExternal`
- Purpose: 辅助排查-日志查询（前端：辅助排查）
- Source: 外部日志平台（待对接）
- Path Params: none
- Query Params: none
- Body Schema: { conversationId: string; customerId?: string; timeRange?: { from: string; to: string }; keywords?: string[]; limit?: number; traceId?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: assist.check
- Status Codes: 200, 502, 503
- Response Schema: { success: boolean; data?: { taskId: string; status: 'queued' | 'running' | 'completed' | 'failed'; resultUrl?: string; entries?: Array<{ timestamp: string; level: string; message: string; traceId?: string }> }; error?: { message: string; code: string } }
- Response Example (success): {"success": true, "data": {"taskId": "log-123", "status": "completed", "entries": [{"timestamp": "2026-02-10T09:10:00Z", "level": "ERROR", "message": "timeout", "traceId": "abc"}]}}
- Response Example (error): {"success": false, "error": {"message": "provider unavailable", "code": "PROVIDER_DOWN"}}
- Example: `curl -X POST http://localhost:8080/api/v1/tools/logs/query`

### POST `/api/v1/tools/traces/query`

- Module: `assistCheckExternal`
- Purpose: 辅助排查-链路追踪查询（前端：辅助排查）
- Source: 外部分布式追踪平台（待对接）
- Path Params: none
- Query Params: none
- Body Schema: { conversationId: string; customerId?: string; timeRange?: { from: string; to: string }; traceId?: string; spanId?: string; service?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: assist.check
- Status Codes: 200, 502, 503
- Response Schema: { success: boolean; data?: { taskId: string; status: 'queued' | 'running' | 'completed' | 'failed'; trace?: { traceId: string; durationMs: number; spans: Array<{ spanId: string; service: string; operation: string; durationMs: number; error?: boolean }> } }; error?: { message: string; code: string } }
- Response Example (success): {"success": true, "data": {"taskId": "trace-456", "status": "completed", "trace": {"traceId": "abc", "durationMs": 1200, "spans": [{"spanId": "s1", "service": "gateway", "operation": "GET /login", "durationMs": 1200}]}}}
- Response Example (error): {"success": false, "error": {"message": "provider unavailable", "code": "PROVIDER_DOWN"}}
- Example: `curl -X POST http://localhost:8080/api/v1/tools/traces/query`
