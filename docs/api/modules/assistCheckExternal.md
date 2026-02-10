# assistCheckExternal APIs
- Purpose: 辅助排查外部服务对接（演示结构）

## POST `/api/v1/tools/logs/query`
- Purpose: 辅助排查-日志查询接口（外部服务对接，演示结构）
- Source: 外部日志平台（待对接）
- Path Params: none
- Query Params: none
- Body Schema: { conversationId: string; customerId?: string; timeRange?: { from: string; to: string }; keywords?: string[]; limit?: number; traceId?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: assist.check
- Status Codes: 200, 502, 503
- Response Schema: { success: boolean; data?: { taskId: string; status: 'queued'|'running'|'completed'|'failed'; resultUrl?: string; entries?: Array<{ timestamp: string; level: string; message: string; traceId?: string }> }; error?: { message: string; code: string } }
- Response Example (success): {"success": true, "data": {"taskId": "log-123", "status": "completed", "entries": [{"timestamp": "2026-02-10T09:10:00Z", "level": "ERROR", "message": "timeout", "traceId": "abc"}]}}
- Response Example (error): {"success": false, "error": {"message": "provider unavailable", "code": "PROVIDER_DOWN"}}

## POST `/api/v1/tools/traces/query`
- Purpose: 辅助排查-链路追踪查询接口（外部服务对接，演示结构）
- Source: 外部分布式追踪平台（待对接）
- Path Params: none
- Query Params: none
- Body Schema: { conversationId: string; customerId?: string; timeRange?: { from: string; to: string }; traceId?: string; spanId?: string; service?: string; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: assist.check
- Status Codes: 200, 502, 503
- Response Schema: { success: boolean; data?: { taskId: string; status: 'queued'|'running'|'completed'|'failed'; trace?: { traceId: string; durationMs: number; spans: Array<{ spanId: string; service: string; operation: string; durationMs: number; error?: boolean }> } }; error?: { message: string; code: string } }
- Response Example (success): {"success": true, "data": {"taskId": "trace-456", "status": "completed", "trace": {"traceId": "abc", "durationMs": 1200, "spans": [{"spanId": "s1", "service": "gateway", "operation": "GET /login", "durationMs": 1200}]}}}
- Response Example (error): {"success": false, "error": {"message": "provider unavailable", "code": "PROVIDER_DOWN"}}
