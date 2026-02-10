# problemRoutes APIs
- Purpose: 问题管理接口

## POST `/api/v1/api/problems`
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

## GET `/api/v1/api/problems/:id`
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

## GET `/api/v1/api/problems`
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

## PATCH `/api/v1/api/problems/:id/status`
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
