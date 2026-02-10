# metricsRoutes APIs
- Purpose: 健康检查与Prometheus指标接口

## GET `/metrics`
- Purpose: Prometheus指标采集接口
- Source: `backend/src/presentation/http/routes/metricsRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: monitoring.read
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## GET `/health`
- Purpose: 服务健康检查接口
- Source: `backend/src/presentation/http/routes/metricsRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Authorization: no auth; Content-Type: application/json
- Permissions: n/a
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
