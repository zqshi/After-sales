# permissionRoutes APIs
- Purpose: 角色与成员权限管理接口

## GET `/api/v1/api/roles`
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

## POST `/api/v1/api/roles`
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

## PATCH `/api/v1/api/roles/:id`
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

## DELETE `/api/v1/api/roles/:id`
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

## GET `/api/v1/api/members`
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

## POST `/api/v1/api/members`
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

## PATCH `/api/v1/api/members/:id`
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

## DELETE `/api/v1/api/members/:id`
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
