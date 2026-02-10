# auditRoutes APIs
- Purpose: 审计事件与报表接口

## POST `/api/v1/audit/events`
- Purpose: 审计事件上报接口（记录关键操作）
- Source: `backend/src/presentation/http/routes/auditRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: CreateAuditEventRequestDTO
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: audit.write
- Status Codes: 201, 400
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## GET `/api/v1/audit/reports/summary`
- Purpose: 审计报表汇总接口（时间范围摘要）
- Source: `backend/src/presentation/http/routes/auditRoutes.ts`
- Path Params: none
- Query Params: { days?: string }
- Body Schema: none
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: audit.read
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
