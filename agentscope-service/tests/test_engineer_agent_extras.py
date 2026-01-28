from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from agentscope.formatter import OpenAIChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import OpenAIChatModel
from agentscope.tool import Toolkit

from src.agents.engineer_agent import EngineerAgent
from src.tools.mcp_tools import BackendMCPClient


@pytest.fixture
def mock_mcp_client() -> BackendMCPClient:
    client = MagicMock(spec=BackendMCPClient)
    client.call_tool = AsyncMock()
    return client


@pytest.fixture
def engineer_agent(mock_mcp_client: BackendMCPClient) -> EngineerAgent:
    return EngineerAgent(
        name="Engineer",
        sys_prompt="prompt",
        model=MagicMock(spec=OpenAIChatModel),
        formatter=MagicMock(spec=OpenAIChatFormatter),
        toolkit=MagicMock(spec=Toolkit),
        mcp_client=mock_mcp_client,
        memory=InMemoryMemory(),
        max_iters=2,
    )


@pytest.mark.asyncio
async def test_search_knowledge_success(
    engineer_agent: EngineerAgent,
    mock_mcp_client: BackendMCPClient,
) -> None:
    mock_mcp_client.call_tool.return_value = [{"title": "t1"}]
    results = await engineer_agent.search_knowledge("q")
    assert results == [{"title": "t1"}]


@pytest.mark.asyncio
async def test_search_knowledge_failure(
    engineer_agent: EngineerAgent,
    mock_mcp_client: BackendMCPClient,
) -> None:
    mock_mcp_client.call_tool.side_effect = Exception("boom")
    results = await engineer_agent.search_knowledge("q")
    assert results == []


@pytest.mark.asyncio
async def test_search_similar_tickets(
    engineer_agent: EngineerAgent,
    mock_mcp_client: BackendMCPClient,
) -> None:
    mock_mcp_client.call_tool.return_value = [{"ticket": "t"}]
    results = await engineer_agent.search_similar_tickets("issue")
    assert results == [{"ticket": "t"}]


@pytest.mark.asyncio
async def test_search_similar_tickets_failure(
    engineer_agent: EngineerAgent,
    mock_mcp_client: BackendMCPClient,
) -> None:
    mock_mcp_client.call_tool.side_effect = Exception("boom")
    results = await engineer_agent.search_similar_tickets("issue")
    assert results == []


@pytest.mark.asyncio
async def test_create_ticket_if_needed(
    engineer_agent: EngineerAgent,
    mock_mcp_client: BackendMCPClient,
) -> None:
    mock_mcp_client.call_tool.return_value = {"taskId": "task-1"}
    task_id = await engineer_agent.create_ticket_if_needed(
        {"severity": "P0", "root_cause": "db"}, "conv-1"
    )
    assert task_id == "task-1"


@pytest.mark.asyncio
async def test_create_ticket_if_needed_skips_low_priority(
    engineer_agent: EngineerAgent,
) -> None:
    task_id = await engineer_agent.create_ticket_if_needed({"severity": "P3"}, "conv-1")
    assert task_id is None


def test_assess_severity() -> None:
    agent = EngineerAgent(
        name="Engineer",
        sys_prompt="prompt",
        model=MagicMock(spec=OpenAIChatModel),
        formatter=MagicMock(spec=OpenAIChatFormatter),
        toolkit=MagicMock(spec=Toolkit),
        mcp_client=MagicMock(spec=BackendMCPClient),
        memory=InMemoryMemory(),
        max_iters=2,
    )
    assert agent.assess_severity("系统宕机无法访问") == "P0"
    assert agent.assess_severity("核心功能失败") == "P1"
    assert agent.assess_severity("出现异常问题") == "P2"
    assert agent.assess_severity("小建议") == "P3"


@pytest.mark.asyncio
async def test_diagnose_problem(
    engineer_agent: EngineerAgent,
    mock_mcp_client: BackendMCPClient,
) -> None:
    mock_mcp_client.call_tool.return_value = {"problem_type": "auth"}
    result = await engineer_agent.diagnose_problem("无法登录", {"user": "u1"})
    assert result["problem_type"] == "auth"


@pytest.mark.asyncio
async def test_prefetch_context_updates_metadata(
    engineer_agent: EngineerAgent,
    mock_mcp_client: BackendMCPClient,
) -> None:
    mock_mcp_client.call_tool.return_value = {"ok": True}
    msg = MagicMock()
    msg.content = "问题"
    msg.metadata = {}
    await engineer_agent._prefetch_context(msg)
    assert "prefetch" in msg.metadata


def test_inject_prefetch_context() -> None:
    agent = EngineerAgent(
        name="Engineer",
        sys_prompt="prompt",
        model=MagicMock(spec=OpenAIChatModel),
        formatter=MagicMock(spec=OpenAIChatFormatter),
        toolkit=MagicMock(spec=Toolkit),
        mcp_client=MagicMock(spec=BackendMCPClient),
        memory=InMemoryMemory(),
        max_iters=2,
    )
    text = agent._inject_prefetch_context("base", {"prefetch": {"a": 1}})
    assert "base" in text
    assert "已加载上下文" in text
    assert '"a": 1' in text
