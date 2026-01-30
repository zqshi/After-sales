"""
EngineerAgent单元测试
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from agentscope.formatter import OpenAIChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import OpenAIChatModel
from agentscope.tool import Toolkit

from src.agents.engineer_agent import EngineerAgent
from src.tools.mcp_tools import BackendMCPClient


@pytest.fixture
def mock_model() -> OpenAIChatModel:
    """创建模拟的OpenAIChatModel"""
    return MagicMock(spec=OpenAIChatModel)


@pytest.fixture
def mock_formatter() -> OpenAIChatFormatter:
    """创建模拟的OpenAIChatFormatter"""
    return MagicMock(spec=OpenAIChatFormatter)


@pytest.fixture
def mock_toolkit() -> Toolkit:
    """创建模拟的Toolkit"""
    return MagicMock(spec=Toolkit)


@pytest.fixture
def mock_mcp_client() -> BackendMCPClient:
    """创建模拟的BackendMCPClient"""
    client = MagicMock(spec=BackendMCPClient)
    client.call_tool = AsyncMock()
    return client


@pytest.fixture
def engineer_agent(
    mock_model: OpenAIChatModel,
    mock_formatter: OpenAIChatFormatter,
    mock_toolkit: Toolkit,
    mock_mcp_client: BackendMCPClient,
) -> EngineerAgent:
    """创建EngineerAgent实例"""
    return EngineerAgent(
        name="TestEngineer",
        sys_prompt="Test prompt",
        model=mock_model,
        formatter=mock_formatter,
        toolkit=mock_toolkit,
        mcp_client=mock_mcp_client,
        memory=InMemoryMemory(),
        max_iters=6,
    )


class TestEngineerAgentInit:
    """测试EngineerAgent初始化"""

    def test_init_success(
        self,
        mock_model: OpenAIChatModel,
        mock_formatter: OpenAIChatFormatter,
        mock_toolkit: Toolkit,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试成功初始化"""
        agent = EngineerAgent(
            name="TestEngineer",
            sys_prompt="Test",
            model=mock_model,
            formatter=mock_formatter,
            toolkit=mock_toolkit,
            mcp_client=mock_mcp_client,
        )
        assert agent.name == "TestEngineer"
        assert agent.mcp_client == mock_mcp_client
        assert isinstance(agent.memory, InMemoryMemory)


class TestSearchKnowledge:
    """测试知识库检索功能"""

    async def test_search_knowledge_success(
        self,
        engineer_agent: EngineerAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试成功检索知识库"""
        query = "如何配置数据库"
        expected_results = [
            {"title": "数据库配置指南", "content": "..."},
            {"title": "常见数据库问题", "content": "..."},
        ]
        mock_mcp_client.call_tool.return_value = expected_results

        results = await engineer_agent.search_knowledge(query)

        assert results == expected_results
        mock_mcp_client.call_tool.assert_called_once()

    async def test_search_knowledge_failure(
        self,
        engineer_agent: EngineerAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试检索失败时返回空列表"""
        mock_mcp_client.call_tool.side_effect = Exception("检索失败")

        results = await engineer_agent.search_knowledge("测试查询")

        assert results == []

