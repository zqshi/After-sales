# agentscope agents APIs
- Purpose: Agent管理与质检触发

## GET `/api/agents/list`
- Purpose: Agent列表查询接口
- Source: `agentscope-service/src/api/routes/agents.py`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {...}
- Response Example (error): {"detail": "error message"}

## POST `/api/agents/inspect`
- Purpose: 触发会话质检接口
- Source: `agentscope-service/src/api/routes/agents.py`
- Path Params: none
- Query Params: none
- Body Schema: { conversation_id: str }
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: { success: bool, conversation_id: str, quality_score: int, report: dict }
- Response Example (success): { success: bool, conversation_id: str, quality_score: int, report: dict }
- Response Example (error): {"detail": "error message"}
