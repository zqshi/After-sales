from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.tools.mcp_tools import BackendMCPClient, setup_toolkit
from src.config import settings as settings_module


@pytest.mark.asyncio
async def test_backend_mcp_client_call_tool(monkeypatch: pytest.MonkeyPatch) -> None:
    client = BackendMCPClient("http://localhost")

    mock_http = MagicMock()
    mock_http.post = AsyncMock(return_value=MagicMock(
        json=lambda: {"result": {"ok": True}},
        raise_for_status=lambda: None,
    ))
    monkeypatch.setattr(client, "_client_instance", AsyncMock(return_value=mock_http))

    result = await client.call_tool("ping", foo="bar")

    assert result == {"ok": True}


@pytest.mark.asyncio
async def test_backend_mcp_client_list_tools(monkeypatch: pytest.MonkeyPatch) -> None:
    client = BackendMCPClient("http://localhost")
    mock_http = MagicMock()
    mock_http.post = AsyncMock(return_value=MagicMock(
        json=lambda: {"tools": [{"name": "t"}]},
        raise_for_status=lambda: None,
    ))
    monkeypatch.setattr(client, "_client_instance", AsyncMock(return_value=mock_http))

    tools = await client.list_tools()

    assert tools == [{"name": "t"}]


@pytest.mark.asyncio
async def test_backend_mcp_client_close(monkeypatch: pytest.MonkeyPatch) -> None:
    client = BackendMCPClient("http://localhost")
    mock_http = MagicMock()
    mock_http.aclose = AsyncMock()
    client._client = mock_http

    await client.close()

    mock_http.aclose.assert_awaited()


@pytest.mark.asyncio
async def test_backend_mcp_client_create_instance() -> None:
    client = BackendMCPClient("http://localhost")
    instance = await client._client_instance()
    assert instance is not None
    await client.close()


@pytest.mark.asyncio
async def test_backend_mcp_client_call_tool_error(monkeypatch: pytest.MonkeyPatch) -> None:
    client = BackendMCPClient("http://localhost")
    mock_http = MagicMock()
    mock_http.post = AsyncMock(return_value=MagicMock(
        json=lambda: {"error": "boom"},
        raise_for_status=lambda: None,
    ))
    monkeypatch.setattr(client, "_client_instance", AsyncMock(return_value=mock_http))

    with pytest.raises(RuntimeError):
        await client.call_tool("ping")


@pytest.mark.asyncio
async def test_setup_toolkit_without_mcp(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTSCOPE_MCP_ENABLED", "false")

    bundle = await setup_toolkit()

    assert bundle.backend_client.url.endswith("/mcp")


@pytest.mark.asyncio
async def test_setup_toolkit_register_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTSCOPE_MCP_ENABLED", "true")
    monkeypatch.setenv("AGENTSCOPE_MCP_TRANSPORT", "streamable_http")

    async def _raise(_client: object) -> None:
        raise RuntimeError("fail")

    mock_toolkit = MagicMock()
    mock_toolkit.register_mcp_client = AsyncMock(side_effect=_raise)
    monkeypatch.setattr("src.tools.mcp_tools.Toolkit", lambda: mock_toolkit)

    bundle = await setup_toolkit()

    assert bundle.toolkit is mock_toolkit
