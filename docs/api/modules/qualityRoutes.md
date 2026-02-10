# qualityRoutes APIs
- Purpose: 质检报告与质检数据接口

## GET `/api/v1/api/quality/:conversationId`
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

## GET `/api/v1/api/quality/:conversationId/reports`
- Purpose: 会话质检报告列表接口
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

## GET `/api/v1/api/quality/reports`
- Purpose: 质检报告汇总查询接口
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
