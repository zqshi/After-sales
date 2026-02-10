# knowledgeRoutes APIs
- Purpose: 知识库检索与管理接口

## POST `/api/v1/api/knowledge/search`
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

## POST `/api/v1/api/knowledge/upload`
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

## GET `/api/v1/api/knowledge/:id/progress`
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

## POST `/api/v1/api/knowledge/:id/sync`
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

## POST `/api/v1/api/knowledge/:id/retry`
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

## POST `/api/v1/api/knowledge`
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

## GET `/api/v1/api/knowledge/:id`
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

## GET `/api/v1/api/knowledge`
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

## PATCH `/api/v1/api/knowledge/:id`
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

## DELETE `/api/v1/api/knowledge/:id`
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
