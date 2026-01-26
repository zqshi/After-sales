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


class TestDiagnoseProblem:
    """测试问题诊断功能"""

    async def test_diagnose_problem_success(
        self,
        engineer_agent: EngineerAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试成功诊断问题"""
        problem_desc = "系统无法登录"
        expected_diagnosis = {
            "problem_type": "authentication",
            "severity": "high",
            "possible_causes": ["密码错误", "账号被锁定"],
            "suggested_solutions": ["重置密码", "联系管理员"],
        }
        mock_mcp_client.call_tool.return_value = expected_diagnosis

        diagnosis = await engineer_agent.diagnose_problem(problem_desc)

        assert diagnosis == expected_diagnosis

    async def test_diagnose_problem_with_context(
        self,
        engineer_agent: EngineerAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试带上下文的问题诊断"""
        problem_desc = "系统无法登录"
        context = {"user_id": "user-123", "error_code": "AUTH_FAILED"}

        await engineer_agent.diagnose_problem(problem_desc, context)

        mock_mcp_client.call_tool.assert_called_once()
        call_args = mock_mcp_client.call_tool.call_args
        assert "context" in call_args.kwargs or len(call_args.args) > 1
