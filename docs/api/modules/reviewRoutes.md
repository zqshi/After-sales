# reviewRoutes APIs
- Purpose: 质检复核/审核接口

## POST `/api/v1/api/reviews`
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

## GET `/api/v1/api/reviews/:id`
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

## GET `/api/v1/api/reviews`
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

## POST `/api/v1/api/reviews/:id/complete`
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
