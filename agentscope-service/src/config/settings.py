import os
from typing import Any, Dict

import agentscope


class AgentScopeSettings:
    """Wraps the runtime configuration that describes how AgentScope integrates with the node backend."""

    def __init__(self) -> None:
        self.node_backend_url = os.getenv("NODE_BACKEND_URL", "http://localhost:8080")
        self.mcp_api_key = os.getenv("MCP_API_KEY", "")
        self.deepseek_config: Dict[str, Any] = {
            "config_name": "deepseek_qwen",
            "model_type": "openai_chat",
            "model_name": "deepseek-v3.1",
            "api_key": os.getenv("AI_SERVICE_API_KEY", ""),
            "base_url": os.getenv("AI_SERVICE_URL", "https://kspmas.ksyun.com"),
            "timeout": 30,
            "stream": True,
        }
        self.backend_event_bridge_path = os.getenv("BACKEND_EVENT_BRIDGE_PATH", "/agentscope/events")
        self.backend_event_bridge_timeout = float(os.getenv("BACKEND_EVENT_BRIDGE_TIMEOUT", "5.0"))

    def initialize_agentscope(self) -> None:
        """Initialize AgentScope runtime with logging and tracing configuration."""

        agentscope.init(
            project="after-sales-system",
            name="agent_service",
            logging_level="INFO",
            tracing_url=os.getenv("TRACING_URL"),
        )


settings = AgentScopeSettings()
