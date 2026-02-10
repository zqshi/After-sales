# authRoutes APIs
- Purpose: 认证与登录注册接口

## POST `/api/v1/api/auth/login`
- Purpose: 用户登录接口（获取访问令牌）
- Source: `backend/src/presentation/http/routes/authRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: LoginRequestDTO
- Headers: Authorization: no auth; Content-Type: application/json
- Permissions: n/a
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## POST `/api/v1/api/auth/register`
- Purpose: 用户注册接口（创建账号）
- Source: `backend/src/presentation/http/routes/authRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: RegisterRequestDTO
- Headers: Authorization: no auth; Content-Type: application/json
- Permissions: n/a
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## GET `/api/v1/api/auth/me`
- Purpose: 获取当前登录用户信息接口
- Source: `backend/src/presentation/http/routes/authRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: session.read
- Status Codes: 200, 401
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
