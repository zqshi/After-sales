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


class TestInspectorFollowUpActions:
    """测试后续动作"""

    async def test_create_improvement_task(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        mock_mcp_client.call_tool.return_value = {"taskId": "task-1"}
        task_id = await inspector_agent.create_improvement_task_if_needed(
            conversation_id="conv-1",
            quality_score=60,
            suggestions=["改进1"],
        )
        assert task_id == "task-1"

    async def test_create_improvement_task_skip(
        self,
        inspector_agent: InspectorAgent,
    ) -> None:
        task_id = await inspector_agent.create_improvement_task_if_needed(
            conversation_id="conv-1",
            quality_score=90,
            suggestions=[],
        )
        assert task_id is None

    async def test_save_quality_report_failure(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        mock_mcp_client.call_tool.side_effect = Exception("fail")
        ok = await inspector_agent.save_quality_report("conv-1", {"score": 1})
        assert ok is False

    async def test_create_survey_if_needed(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        mock_mcp_client.call_tool.return_value = {"surveyId": "survey-1"}
        survey_id = await inspector_agent.create_survey_if_needed(
            customer_id="cust-1",
            conversation_id="conv-1",
            survey_questions=["q1"],
        )
        assert survey_id == "survey-1"

    async def test_create_survey_if_needed_failure(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        mock_mcp_client.call_tool.side_effect = Exception("boom")
        survey_id = await inspector_agent.create_survey_if_needed(
            customer_id="cust-1",
            conversation_id="conv-1",
            survey_questions=["q1"],
        )
        assert survey_id is None


class TestInspectorHistory:
    async def test_get_conversation_history_success(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        mock_mcp_client.call_tool.return_value = [{"role": "user", "content": "hi"}]
        history = await inspector_agent.get_conversation_history("conv-1")
        assert history == [{"role": "user", "content": "hi"}]

    async def test_get_conversation_history_failure(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        mock_mcp_client.call_tool.side_effect = Exception("boom")
        history = await inspector_agent.get_conversation_history("conv-2")
        assert history[0]["role"] == "system"

    async def test_get_customer_history_failure(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        mock_mcp_client.call_tool.side_effect = Exception("boom")
        history = await inspector_agent.get_customer_history("cust-1")
        assert history == []


class TestInspectorInternalFlow:
    async def test_inspect_conversation_fallback_flow(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        mock_mcp_client.call_tool.side_effect = Exception("skip")
        inspector_agent.reply = AsyncMock(return_value=Msg(
            name="Inspector",
            content='{"quality_score": 80, "improvement_suggestions": [], "need_follow_up": false}',
            role="assistant",
            metadata={}
        ))

        report = await inspector_agent.inspect_conversation("conv-789")

        assert report["quality_score"] == 80

    async def test_inspect_conversation_default_report(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        mock_mcp_client.call_tool.side_effect = Exception("skip")
        inspector_agent.reply = AsyncMock(return_value=Msg(
            name="Inspector",
            content="not json",
            role="assistant",
            metadata={}
        ))
        inspector_agent.save_quality_report = AsyncMock(return_value=True)
        inspector_agent.create_improvement_task_if_needed = AsyncMock(return_value=None)
        inspector_agent.create_survey_if_needed = AsyncMock(return_value=None)

        report = await inspector_agent.inspect_conversation("conv-999")

        assert report["quality_score"] == 0


class TestInspectorPrefetch:
    async def test_prefetch_context(
        self,
        inspector_agent: InspectorAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        mock_mcp_client.call_tool.return_value = []
        msg = Msg(
            name="user",
            content="hi",
            role="user",
            metadata={"conversationId": "conv-1", "customerId": "cust-1"},
        )
        await inspector_agent._prefetch_context(msg)
        assert "prefetch" in msg.metadata

    def test_inject_prefetch_context(
        self,
        inspector_agent: InspectorAgent,
    ) -> None:
        text = inspector_agent._inject_prefetch_context("base", {"prefetch": {"x": 1}})
        assert "base" in text
        assert "已加载上下文" in text
