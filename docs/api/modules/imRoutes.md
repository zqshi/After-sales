# imRoutes APIs
- Purpose: IM消息接入与会话相关接口

## POST `/api/v1/im/incoming-message`
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

## GET `/api/v1/im/conversations`
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

## GET `/api/v1/im/conversations/stats`
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

## GET `/api/v1/im/conversations/:id/messages`
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

## POST `/api/v1/im/conversations/:id/messages`
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

## POST `/api/v1/im/reviews/submit`
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

## GET `/api/v1/im/reviews/pending`
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

## GET `/api/v1/im/reviews/stream`
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

## GET `/api/v1/im/conversations/:id/problems`
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

## PATCH `/api/v1/im/conversations/:id/status`
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

## PATCH `/api/v1/im/conversations/:id/mode`
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

## GET `/api/v1/profiles/:customerId`
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

## GET `/api/v1/profiles/:customerId/interactions`
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

## GET `/api/v1/quality/:conversationId`
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

## GET `/api/v1/quality/:conversationId/reports`
- Purpose: 会话质检报告列表接口
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

## GET `/api/v1/quality/reports`
- Purpose: 质检报告汇总查询接口
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

## GET `/api/v1/im/conversations/:id/ai-analysis`
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

## GET `/api/v1/im/conversations/:id/sentiment`
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
