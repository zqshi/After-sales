# conversationRoutes APIs
- Purpose: 对话管理接口（列表、创建、消息、状态）

## POST `/api/v1/api/conversations`
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

## GET `/api/v1/api/conversations`
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

## POST `/api/v1/api/conversations/:id/assign`
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

## GET `/api/v1/api/conversations/:id`
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

## PUT `/api/v1/api/conversations/:id`
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

## POST `/api/v1/api/conversations/:id/messages`
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

## GET `/api/v1/api/conversations/:id/messages/:messageId`
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

## POST `/api/v1/api/conversations/:id/close`
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