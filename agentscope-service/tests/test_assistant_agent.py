"""
AssistantAgent单元测试
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agentscope.formatter import OpenAIChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import OpenAIChatModel
from agentscope.tool import Toolkit

from src.agents.assistant_agent import AssistantAgent
from src.tools.mcp_tools import BackendMCPClient


@pytest.fixture
def mock_model() -> OpenAIChatModel:
    """创建模拟的OpenAIChatModel"""
    model = MagicMock(spec=OpenAIChatModel)
    model.model_name = "test-model"
    return model


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
def assistant_agent(
    mock_model: OpenAIChatModel,
    mock_formatter: OpenAIChatFormatter,
    mock_toolkit: Toolkit,
    mock_mcp_client: BackendMCPClient,
) -> AssistantAgent:
    """创建AssistantAgent实例"""
    return AssistantAgent(
        name="TestAssistant",
        sys_prompt="Test prompt",
        model=mock_model,
        formatter=mock_formatter,
        toolkit=mock_toolkit,
        mcp_client=mock_mcp_client,
        memory=InMemoryMemory(),
        max_iters=6,
    )


class TestAssistantAgentInit:
    """测试AssistantAgent初始化"""

    def test_init_with_default_memory(
        self,
        mock_model: OpenAIChatModel,
        mock_formatter: OpenAIChatFormatter,
        mock_toolkit: Toolkit,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试使用默认memory初始化"""
        agent = AssistantAgent(
            name="TestAgent",
            sys_prompt="Test",
            model=mock_model,
            formatter=mock_formatter,
            toolkit=mock_toolkit,
            mcp_client=mock_mcp_client,
        )
        assert agent.name == "TestAgent"
        assert agent.mcp_client == mock_mcp_client
        assert isinstance(agent.memory, InMemoryMemory)

    def test_init_with_custom_memory(
        self,
        mock_model: OpenAIChatModel,
        mock_formatter: OpenAIChatFormatter,
        mock_toolkit: Toolkit,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试使用自定义memory初始化"""
        custom_memory = InMemoryMemory()
        agent = AssistantAgent(
            name="TestAgent",
            sys_prompt="Test",
            model=mock_model,
            formatter=mock_formatter,
            toolkit=mock_toolkit,
            mcp_client=mock_mcp_client,
            memory=custom_memory,
        )
        assert agent.memory == custom_memory


class TestAnalyzeSentiment:
    """测试情感分析功能"""

    async def test_analyze_sentiment_success(
        self,
        assistant_agent: AssistantAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试成功的情感分析"""
        # 准备测试数据
        msg = Msg(
            name="user",
            content="你们系统怎么这么烂！",
            role="user",
            metadata={"conversationId": "conv-123"},
        )
        expected_result = {
            "sentiment": "negative",
            "intensity": "angry",
            "score": 0.2,
            "risk_level": "high",
        }
        mock_mcp_client.call_tool.return_value = expected_result

        # 执行测试
        result = await assistant_agent.analyze_sentiment(msg)

        # 验证结果
        assert result == expected_result
        mock_mcp_client.call_tool.assert_called_once_with(
            "analyzeConversation",
            conversationId="conv-123",
            context="sentiment",
            includeHistory=True,
        )

    async def test_analyze_sentiment_fallback(
        self,
        assistant_agent: AssistantAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试情感分析失败时的降级处理"""
        # 准备测试数据
        msg = Msg(
            name="user",
            content="测试消息",
            role="user",
            metadata={"conversationId": "conv-123"},
        )
        mock_mcp_client.call_tool.side_effect = Exception("MCP调用失败")

        # 执行测试
        result = await assistant_agent.analyze_sentiment(msg)

        # 验证降级结果
        assert result["sentiment"] == "neutral"
        assert result["intensity"] == "calm"
        assert result["risk_level"] == "low"
        assert "error" in result

    async def test_analyze_sentiment_without_conversation_id(
        self,
        assistant_agent: AssistantAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试没有conversationId时使用msg.id"""
        msg = Msg(name="user", content="测试", role="user", metadata={})
        msg.id = "msg-456"
        mock_mcp_client.call_tool.return_value = {"sentiment": "neutral"}

        await assistant_agent.analyze_sentiment(msg)

        mock_mcp_client.call_tool.assert_called_once()
        call_args = mock_mcp_client.call_tool.call_args
        assert call_args.kwargs["conversationId"] == "msg-456"


class TestGetCustomerProfile:
    """测试获取客户画像功能"""

    async def test_get_customer_profile_success(
        self,
        assistant_agent: AssistantAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试成功获取客户画像"""
        customer_id = "cust-123"
        expected_profile = {
            "id": customer_id,
            "name": "张三",
            "vip_level": "gold",
            "history_count": 10,
        }
        mock_mcp_client.call_tool.return_value = expected_profile

        result = await assistant_agent.get_customer_profile(customer_id)

        assert result == expected_profile
        mock_mcp_client.call_tool.assert_called_once_with(
            "getCustomerProfile",
            customerId=customer_id,
        )

    async def test_get_customer_profile_failure(
        self,
        assistant_agent: AssistantAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试获取客户画像失败时返回空字典"""
        mock_mcp_client.call_tool.side_effect = Exception("获取失败")

        result = await assistant_agent.get_customer_profile("cust-123")

        assert result == {}


class TestShouldEscalateToHuman:
    """测试是否需要升级人工的判断逻辑"""

    def test_escalate_high_risk(self, assistant_agent: AssistantAgent) -> None:
        """测试高风险情感需要升级"""
        analysis = {
            "sentiment_analysis": {
                "sentiment": "negative",
                "risk_level": "high",
            },
            "confidence": 0.9,
        }
        assert assistant_agent.should_escalate_to_human(analysis) is True

    def test_escalate_negative_sentiment(
        self, assistant_agent: AssistantAgent
    ) -> None:
        """测试负面情感需要升级"""
        analysis = {
            "sentiment_analysis": {
                "sentiment": "negative",
                "risk_level": "medium",
            },
            "confidence": 0.9,
        }
        assert assistant_agent.should_escalate_to_human(analysis) is True

    def test_escalate_low_confidence(
        self, assistant_agent: AssistantAgent
    ) -> None:
        """测试低置信度需要升级"""
        analysis = {
            "sentiment_analysis": {
                "sentiment": "neutral",
                "risk_level": "low",
            },
            "confidence": 0.6,
        }
        assert assistant_agent.should_escalate_to_human(analysis) is True

    def test_escalate_urgent_requirement(
        self, assistant_agent: AssistantAgent
    ) -> None:
        """测试紧急需求需要升级"""
        analysis = {
            "sentiment_analysis": {
                "sentiment": "neutral",
                "risk_level": "low",
            },
            "confidence": 0.9,
            "requirement_extraction": [
                {"priority": "urgent", "title": "紧急问题"}
            ],
        }
        assert assistant_agent.should_escalate_to_human(analysis) is True

    def test_no_escalation_needed(
        self, assistant_agent: AssistantAgent
    ) -> None:
        """测试正常情况不需要升级"""
        analysis = {
            "sentiment_analysis": {
                "sentiment": "positive",
                "risk_level": "low",
            },
            "confidence": 0.9,
            "requirement_extraction": [
                {"priority": "medium", "title": "普通问题"}
            ],
        }
        assert assistant_agent.should_escalate_to_human(analysis) is False


class TestPrefetchContext:
    """测试预取上下文功能"""

    async def test_prefetch_with_all_data(
        self,
        assistant_agent: AssistantAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试完整的预取流程"""
        msg = Msg(
            name="user",
            content="测试消息",
            role="user",
            metadata={"customerId": "cust-123"},
        )

        # 模拟MCP调用
        mock_mcp_client.call_tool.side_effect = [
            {"sentiment": "neutral"},  # sentiment
            {"name": "张三"},  # customer_profile
            [{"title": "知识1"}],  # knowledge
        ]

        with patch.object(
            assistant_agent, "analyze_sentiment", return_value={"sentiment": "neutral"}
        ):
            await assistant_agent._prefetch_context(msg)

        # 验证metadata被更新
        assert "prefetch" in msg.metadata
        assert "sentiment" in msg.metadata["prefetch"]

    async def test_prefetch_handles_errors_gracefully(
        self,
        assistant_agent: AssistantAgent,
        mock_mcp_client: BackendMCPClient,
    ) -> None:
        """测试预取失败时的容错处理"""
        msg = Msg(
            name="user",
            content="测试消息",
            role="user",
            metadata={"customerId": "cust-123"},
        )

        # 所有调用都失败
        mock_mcp_client.call_tool.side_effect = Exception("调用失败")

        with patch.object(
            assistant_agent, "analyze_sentiment", side_effect=Exception("失败")
        ):
            # 不应该抛出异常
            await assistant_agent._prefetch_context(msg)


class TestInjectPrefetchContext:
    """测试注入预取上下文功能"""

    def test_inject_with_prefetch_data(
        self, assistant_agent: AssistantAgent
    ) -> None:
        """测试注入预取数据"""
        base_prompt = "基础提示词"
        metadata = {
            "prefetch": {
                "sentiment": {"sentiment": "positive"},
                "customer_profile": {"name": "张三"},
            }
        }

        result = assistant_agent._inject_prefetch_context(base_prompt, metadata)

        assert "基础提示词" in result
        assert "已加载上下文" in result
        assert "sentiment" in result

    def test_inject_without_prefetch_data(
        self, assistant_agent: AssistantAgent
    ) -> None:
        """测试没有预取数据时返回原提示词"""
        base_prompt = "基础提示词"
        metadata: dict[str, Any] = {}

        result = assistant_agent._inject_prefetch_context(base_prompt, metadata)

        assert result == base_prompt

    def test_inject_truncates_large_payload(
        self, assistant_agent: AssistantAgent
    ) -> None:
        """测试大数据时的截断处理"""
        base_prompt = "基础提示词"
        large_data = {"data": "x" * 3000}
        metadata = {"prefetch": large_data}

        result = assistant_agent._inject_prefetch_context(base_prompt, metadata)

        assert "truncated" in result
        assert len(result) < len(base_prompt) + 3000
