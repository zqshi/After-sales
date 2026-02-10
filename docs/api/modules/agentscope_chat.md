# agentscope chat APIs
- Purpose: Agent聊天/对话交互服务

## POST `/api/chat/message`
- Purpose: Agent对话消息接口（生成回复）
- Source: `agentscope-service/src/api/routes/chat.py`
- Path Params: none
- Query Params: none
- Body Schema: { conversation_id: str, message: str, customer_id: str, metadata: Dict[str, Any] }
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: { success: bool, message: str, agent_name: str, mode: str, confidence: float, metadata: Dict[str, Any] }
- Response Example (success): { success: bool, message: str, agent_name: str, mode: str, confidence: float, metadata: Dict[str, Any] }
- Response Example (error): {"detail": "error message"}

## GET `/api/chat/status`
- Purpose: Agent服务状态查询接口
- Source: `agentscope-service/src/api/routes/chat.py`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: unknown
- Response Example (success): {...}
- Response Example (error): {"detail": "error message"}
