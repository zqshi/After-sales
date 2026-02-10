# customerRoutes APIs
- Purpose: 客户画像与客户动作接口

## GET `/api/v1/api/customers/:id`
- Purpose: 客户档案查询接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## POST `/api/v1/api/customers`
- Purpose: 创建客户档案接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateCustomerProfileRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## POST `/api/v1/api/customers/:id/bind-external`
- Purpose: 绑定外部系统标识接口（IM/CRM）
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: Omit<BindExternalIdentityRequestDTO,
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## GET `/api/v1/api/customers/:id/bindings`
- Purpose: 查询客户绑定关系接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## DELETE `/api/v1/api/customers/:id/bindings`
- Purpose: 解绑外部系统标识接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: Omit<UnbindExternalIdentityRequestDTO,
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## POST `/api/v1/api/customers/:id/refresh`
- Purpose: 刷新客户画像接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { source: string; metrics?: { satisfactionScore: number; issueCount: number; averageResolutionMinutes: number; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## GET `/api/v1/api/customers/:id/interactions`
- Purpose: 客户交互记录查询接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## POST `/api/v1/api/customers/:id/service-records`
- Purpose: 创建客户服务记录接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { title: string; description: string; ownerId?: string; outcome?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## PATCH `/api/v1/api/customers/:id/commitments/:commitmentId`
- Purpose: 更新客户承诺事项接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string; commitmentId: string }
- Query Params: none
- Body Schema: { progress: number }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## POST `/api/v1/api/customers/:id/interactions`
- Purpose: 新增客户互动记录接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { interactionType: 'call' | 'chat' | 'email' | 'meeting'; occurredAt?: string; notes?: string; channel?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 201
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## POST `/api/v1/api/customers/:id/mark-vip`
- Purpose: 标记客户VIP接口
- Source: `backend/src/presentation/http/routes/customerRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: { reason?: string }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: customers.write
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
