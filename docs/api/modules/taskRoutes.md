# taskRoutes APIs
- Purpose: 任务与工单接口

## POST `/api/v1/api/tasks`
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

## GET `/api/v1/api/tasks/:id`
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

## GET `/api/v1/api/tasks`
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

## GET `/api/v1/api/workorders/:id`
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

## GET `/api/v1/api/workorders`
- Purpose: 工单列表查询接口
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

## POST `/api/v1/api/workorders`
- Purpose: 创建工单接口
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

## POST `/api/v1/api/tasks/:id/assign`
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

## PATCH `/api/v1/api/tasks/:id/status`
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

## POST `/api/v1/api/tasks/:id/complete`
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

## POST `/api/v1/api/tasks/:id/actions`
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
