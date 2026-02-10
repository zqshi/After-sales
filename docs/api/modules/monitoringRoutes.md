# monitoringRoutes APIs
- Purpose: 监控告警接口

## GET `/api/v1/monitoring/alerts`
- Purpose: 监控告警列表查询接口
- Source: `backend/src/presentation/http/routes/monitoringRoutes.ts`
- Path Params: none
- Query Params: { status?: string }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: monitoring.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## POST `/api/v1/monitoring/alerts`
- Purpose: 创建/触发告警接口
- Source: `backend/src/presentation/http/routes/monitoringRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateMonitoringAlertRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: monitoring.write
- Status Codes: 201, 400
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## PATCH `/api/v1/monitoring/alerts/:id/resolve`
- Purpose: 告警解除接口
- Source: `backend/src/presentation/http/routes/monitoringRoutes.ts`
- Path Params: { id: string }
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: monitoring.write
- Status Codes: 200, 404
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
