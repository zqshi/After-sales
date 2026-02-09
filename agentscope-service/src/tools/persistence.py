from __future__ import annotations

from typing import Any

from src.tools.mcp_tools import BackendMCPClient


class PersistenceClient:
    """Write persistence records back to the Node backend via MCP tools."""

    def __init__(self, backend_client: BackendMCPClient) -> None:
        self._backend = backend_client

    async def record_agent_call(
        self,
        *,
        conversation_id: str | None,
        agent_name: str,
        agent_role: str | None,
        mode: str | None,
        status: str,
        duration_ms: int | None,
        input_payload: dict[str, Any] | None = None,
        output_payload: dict[str, Any] | None = None,
        error_message: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        await self._backend.call_tool(
            "recordAgentCall",
            conversationId=conversation_id,
            agentName=agent_name,
            agentRole=agent_role,
            mode=mode,
            status=status,
            durationMs=duration_ms,
            input=input_payload or {},
            output=output_payload or {},
            errorMessage=error_message,
            metadata=metadata or {},
        )

    async def record_agent_memory(
        self,
        *,
        conversation_id: str,
        agent_name: str,
        memory: dict[str, Any],
    ) -> None:
        await self._backend.call_tool(
            "recordAgentMemory",
            conversationId=conversation_id,
            agentName=agent_name,
            memory=memory,
        )

    async def load_agent_memory(
        self,
        *,
        conversation_id: str,
        agent_name: str,
    ) -> dict[str, Any] | None:
        return await self._backend.call_tool(
            "getAgentMemory",
            conversationId=conversation_id,
            agentName=agent_name,
        )
