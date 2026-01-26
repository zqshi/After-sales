"""
InspectorAgent单元测试
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from agentscope.formatter import OpenAIChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import OpenAIChatModel
from agentscope.tool import Toolkit

from src.agents.inspector_agent import InspectorAgent
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
def inspector_agent(
    mock_model: OpenAIChatModel,
    mock_formatter: OpenAIChatFormatter,
    mock_toolkit: Toolkit,
    mock_mcp_client: BackendMCPClient,
) -> InspectorAgent:
    """创建InspectorAgent实例"""
    return InspectorAgent(
        name="TestInspector",
        sys_prompt="Test prompt",
        model=mock_model,
        formatter=mock_formatter,
        toolkit=mock_toolkit,
        mcp_client=mock_mcp_client,
        memory=InMemoryMemory(),
        max_iters=6,
    )


class TestInspectorAgentInit:
    """测试InspectorAgent初始化"""

    def test_init_success(
        self,
        mock_model: OpenAIChatModel,
        mock_formatter: OpenAIChatFormatter,
        mock_toolkit: Toolkit,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试成功初始化"""
        agent = InspectorAgent(
            name="TestInspector",
            sys_prompt="Test",
            model=mock_model,
            formatter=mock_formatter,
            toolkit=mock_toolkit,
            mcp_client=mock_mcp_client,
        )
        assert agent.name == "TestInspector"
        assert agent.mcp_client == mock_mcp_client


class TestQualityInspection:
    """测试质检功能"""

    async def test_inspect_conversation_success(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试成功的对话质检"""
        conversation_id = "conv-123"
        expected_report = {
            "conversation_id": conversation_id,
            "quality_score": 0.85,
            "sentiment_improvement": 0.3,
            "issues": [],
            "recommendations": ["保持当前服务质量"],
        }
        mock_mcp_client.call_tool.return_value = expected_report

        report = await inspector_agent.inspect_conversation(conversation_id)

        assert report == expected_report
        mock_mcp_client.call_tool.assert_called_once()

    async def test_inspect_low_quality_conversation(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试低质量对话的质检"""
        conversation_id = "conv-456"
        low_quality_report = {
            "conversation_id": conversation_id,
            "quality_score": 0.45,
            "sentiment_improvement": -0.2,
            "issues": ["响应时间过长", "未解决客户问题"],
            "recommendations": ["加强培训", "优化流程"],
            "requires_follow_up": True,
        }
        mock_mcp_client.call_tool.return_value = low_quality_report

        report = await inspector_agent.inspect_conversation(conversation_id)

        assert report["quality_score"] < 0.7
        assert report["requires_follow_up"] is True
        assert len(report["issues"]) > 0


class TestGenerateReport:
    """测试报告生成功能"""

    async def test_generate_quality_report(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试生成质检报告"""
        inspection_data = {
            "conversation_id": "conv-123",
            "quality_score": 0.85,
            "issues": [],
        }
        expected_report = {
            "report_id": "report-123",
            "summary": "质量良好",
            "details": inspection_data,
        }
        mock_mcp_client.call_tool.return_value = expected_report

        report = await inspector_agent.generate_report(inspection_data)

        assert "report_id" in report
        assert "summary" in report


class TestShouldCreateFollowUpTask:
    """测试是否需要创建跟进任务的判断"""

    def test_should_create_task_for_low_score(
        self, inspector_agent: InspectorAgent
    ) -> None:
        """测试低分需要创建跟进任务"""
        inspection_result = {
            "quality_score": 0.5,
            "issues": ["问题1"],
        }
        assert inspector_agent.should_create_follow_up_task(inspection_result) is True

    def test_should_create_task_for_negative_sentiment(
        self, inspector_agent: InspectorAgent
    ) -> None:
        """测试负面情感改善需要创建跟进任务"""
        inspection_result = {
            "quality_score": 0.8,
            "sentiment_improvement": -0.3,
        }
        assert inspector_agent.should_create_follow_up_task(inspection_result) is True

    def test_no_task_needed_for_good_quality(
        self, inspector_agent: InspectorAgent
    ) -> None:
        """测试高质量对话不需要跟进任务"""
        inspection_result = {
            "quality_score": 0.9,
            "sentiment_improvement": 0.2,
            "issues": [],
        }
        assert inspector_agent.should_create_follow_up_task(inspection_result) is False
