# AgentScope Service

This folder contains the Python service described in the AgentScope upgrade plan. It houses the FastAPI application, Agent implementations, toolkit registration, and routing helpers required to bootstrap the Agent-assisted after-sales system.

## Getting started

```bash
cd agentscope-service
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 5000
```

The service currently exposes a health check endpoint and placeholder agents. Expand the `src/` modules according to the plan to integrate MCP tools, routers, and Agent implementations.
