from dataclasses import dataclass
from typing import Any

import httpx
from agentscope.mcp import HttpStatelessClient
from agentscope.tool import Toolkit

from src.config.settings import settings


class BackendMCPClient:
    """Lightweight HTTP client to call the Node.js MCP server directly."""

    def __init__(self, url: str, headers: dict[str, str] | None = None) -> None:
        self.url = url
        self.headers = headers or {}
        self._client: httpx.AsyncClient | None = None

    async def _client_instance(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient()
        return self._client

    async def call_tool(self, name: str, **arguments: Any) -> dict[str, Any]:
        client = await self._client_instance()
        payload = {
            "method": "tools/call",
            "params": {
                "name": name,
                "arguments": arguments,
            },
        }
        resp = await client.post(self.url, json=payload, headers=self.headers, timeout=30.0)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise RuntimeError(data["error"])
        return data.get("result", {})

    async def list_tools(self) -> list[dict[str, Any]]:
        client = await self._client_instance()
        resp = await client.post(
            self.url,
            json={"method": "tools/list"},
            headers=self.headers,
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("tools", [])

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None


@dataclass
class MCPToolkitBundle:
    toolkit: Toolkit
    backend_client: BackendMCPClient


async def setup_toolkit() -> MCPToolkitBundle:
    """Set up the AgentScope toolkit and MCP client."""

    toolkit = Toolkit()
    # Temporarily disable MCP client registration for quick startup
    # mcp_client = HttpStatelessClient(
    #     name="aftersales-node",
    #     transport="streamable_http",
    #     url=f"{settings.node_backend_url}/mcp",
    #     headers={"Authorization": f"Bearer {settings.mcp_api_key}"} if settings.mcp_api_key else None,
    # )
    # await toolkit.register_mcp_client(mcp_client)

    backend_client = BackendMCPClient(
        f"{settings.node_backend_url}/mcp",
        headers={"Authorization": f"Bearer {settings.mcp_api_key}"} if settings.mcp_api_key else None,
    )

    return MCPToolkitBundle(toolkit=toolkit, backend_client=backend_client)
