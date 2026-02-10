# agentscope main APIs
- Purpose: 服务健康与指标

## GET `/metrics`
- Purpose: Prometheus指标采集接口
- Source: `agentscope-service/src/api/main.py`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: metrics text
- Response Example (success): {...}
- Response Example (error): {"detail": "error message"}

## GET `/health`
- Purpose: 服务健康检查接口
- Source: `agentscope-service/src/api/main.py`
- Path Params: none
- Query Params: none
- Body Schema: none
- Headers: Content-Type: application/json
- Status Codes: 200, 500
- Response Schema: { status: string, agentscope_version: string, agents_ready: boolean }
- Response Example (success): { status: string, agentscope_version: string, agents_ready: boolean }
- Response Example (error): {"detail": "error message"}
