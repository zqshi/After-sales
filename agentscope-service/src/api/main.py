from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any
import time

from fastapi import FastAPI, Request, Response
import agentscope
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
)

from src.agents.assistant_agent import AssistantAgent
from src.agents.engineer_agent import EngineerAgent
from src.agents.inspector_agent import InspectorAgent
from src.agents.human_agent_adapter import HumanAgentAdapter
from src.api.routes import agents as agents_router, chat as chat_router, events as events_router
from src.api.state import agent_manager
from src.config.settings import settings
from src.events.bridge import AgentEventPublisher, NodeEventLedger
from src.router.orchestrator_agent import OrchestratorAgent
from src.tools.mcp_tools import setup_toolkit
from src.tools.persistence import PersistenceClient


class WebSocketManager:
    """Minimal WebSocket manager placeholder used during early development."""

    def __init__(self) -> None:
        self.clients: dict[str, Any] = {}

    def register_client(self, conversation_id: str, socket: Any) -> None:
        self.clients[conversation_id] = socket

    def unregister_client(self, conversation_id: str) -> None:
        self.clients.pop(conversation_id, None)

    async def send_to_client(self, conversation_id: str, payload: dict[str, Any]) -> None:
        client = self.clients.get(conversation_id)
        if client:
            await client.send_json(payload)


REQUEST_COUNT = Counter(
    "agentscope_http_requests_total",
    "Total HTTP requests received by AgentScope",
    ["method", "path", "status"],
)
REQUEST_LATENCY = Histogram(
    "agentscope_http_request_duration_seconds",
    "Latency of HTTP requests handled by AgentScope",
    ["method", "path"],
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize AgentScope runtime and make routers available."""
    settings.initialize_agentscope()
    toolkit_bundle = await setup_toolkit()

    persistence = PersistenceClient(toolkit_bundle.backend_client)

    # 创建3个独立Agent
    assistant_agent = await AssistantAgent.create(
        toolkit_bundle.toolkit,
        toolkit_bundle.backend_client,
        persistence,
    )
    engineer_agent = await EngineerAgent.create(
        toolkit_bundle.toolkit,
        toolkit_bundle.backend_client,
        persistence,
    )
    inspector_agent = await InspectorAgent.create(
        toolkit_bundle.toolkit,
        toolkit_bundle.backend_client,
        persistence,
    )
    human_agent = HumanAgentAdapter("HumanSupport", app.state.ws_manager)

    # 使用OrchestratorAgent替换AdaptiveRouter
    router = OrchestratorAgent(
        assistant_agent=assistant_agent,
        engineer_agent=engineer_agent,
        human_agent=human_agent,
        mcp_client=toolkit_bundle.backend_client,
        persistence=persistence,
        ws_manager=app.state.ws_manager,
    )

    agent_manager["router"] = router
    agent_manager["assistant_agent"] = assistant_agent
    agent_manager["engineer_agent"] = engineer_agent
    agent_manager["inspector_agent"] = inspector_agent
    agent_manager["human_agent"] = human_agent
    agent_manager["toolkit_bundle"] = toolkit_bundle
    event_ledger = NodeEventLedger()
    event_publisher = AgentEventPublisher(
        base_url=settings.node_backend_url,
        path=settings.backend_event_bridge_path,
        timeout_seconds=settings.backend_event_bridge_timeout,
    )
    agent_manager["node_event_ledger"] = event_ledger
    agent_manager["event_publisher"] = event_publisher

    yield

    # Clean up agent resources if necessary
    await toolkit_bundle.backend_client.close()
    event_publisher = agent_manager.get("event_publisher")
    if event_publisher:
        await event_publisher.close()
    agent_manager.clear()


app = FastAPI(
    title="AgentScope After-Sales Service",
    version="0.1.0",
    lifespan=lifespan,
)
app.state.ws_manager = WebSocketManager()
agent_manager["ws_manager"] = app.state.ws_manager

@app.middleware("http")
async def prometheus_metrics(request: Request, call_next):
    start = time.time()
    try:
        response = await call_next(request)
    except Exception:
        duration = time.time() - start
        REQUEST_COUNT.labels(request.method, request.url.path, "500").inc()
        REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
        raise
    else:
        duration = time.time() - start
        status_code = response.status_code
        REQUEST_COUNT.labels(request.method, request.url.path, str(status_code)).inc()
        REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
        return response


@app.get("/metrics")
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

app.include_router(chat_router.router, prefix="/api/chat", tags=["chat"])
app.include_router(agents_router.router, prefix="/api/agents", tags=["agents"])
app.include_router(events_router.router, prefix="/api/events", tags=["events"])


@app.get("/health")
async def health_check() -> dict[str, Any]:
    return {
        "status": "healthy",
        "agentscope_version": agentscope.__version__,
        "agents_ready": "router" in agent_manager,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000)
