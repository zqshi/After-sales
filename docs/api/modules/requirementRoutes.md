# requirementRoutes APIs
- Purpose: 需求管理接口

## POST `/api/v1/api/requirements`
- Purpose: 创建需求记录接口
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

## GET `/api/v1/api/requirements/:id`
- Purpose: 需求详情查询接口
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

## GET `/api/v1/api/requirements`
- Purpose: 需求列表查询接口
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

## GET `/api/v1/api/requirements/statistics`
- Purpose: 需求统计接口
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

## PATCH `/api/v1/api/requirements/:id/status`
- Purpose: 需求状态更新接口
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

## PATCH `/api/v1/api/requirements/:id`
- Purpose: 更新需求内容接口
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

## POST `/api/v1/api/requirements/:id/ignore`
- Purpose: 忽略需求接口
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

## DELETE `/api/v1/api/requirements/:id`
- Purpose: 删除需求接口
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
