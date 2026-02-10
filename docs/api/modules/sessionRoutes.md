# sessionRoutes APIs
- Purpose: 会话权限与角色读取接口

## GET `/api/v1/session/roles`
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

## GET `/api/v1/session/permissions`
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
