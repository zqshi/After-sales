# aiRoutes APIs
- Purpose: AI分析与建议生成相关接口

## POST `/api/v1/ai/analyze`
- Purpose: AI分析与建议生成的会话分析接口（生成问题诊断与建议）
- Source: `backend/src/presentation/http/routes/aiRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: { conversationId: string; context?: string; model?: string; options?: Record<string, unknown>; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: ai.use
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}

## POST `/api/v1/ai/solutions`
- Purpose: AI分析与建议生成的解决方案输出接口（推荐可执行动作）
- Source: `backend/src/presentation/http/routes/aiRoutes.ts`
- Path Params: none
- Query Params: none
- Body Schema: { conversationId: string; solutionType: string; solutionId?: string; messageTemplate?: string; customization?: Record<string, unknown>; }
- Headers: Authorization: Bearer token; Content-Type: application/json
- Permissions: ai.use
- Status Codes: 200
- Response Schema: unknown
- Response Example (success): {"success": true, "data": {...}}
- Response Example (error): {"success": false, "error": {"message": "error message", "code": "ERROR_CODE"}}
