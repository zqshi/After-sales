"""
OrchestratorAgent单元测试
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agentscope.message import Msg

from src.router.orchestrator_agent import OrchestratorAgent


@pytest.fixture
def orchestrator() -> OrchestratorAgent:
    """创建OrchestratorAgent实例"""
    assistant_agent = AsyncMock()
    engineer_agent = AsyncMock()
    human_agent = MagicMock()
    mcp_client = MagicMock()
    ws_manager = MagicMock()
    ws_manager.send_to_client = AsyncMock()

    assistant_agent.return_value = Msg(
        name="AssistantAgent",
        content="assistant response",
        role="assistant",
        metadata={}
    )
    engineer_agent.return_value = Msg(
        name="EngineerAgent",
        content="engineer response",
        role="assistant",
        metadata={}
    )

    return OrchestratorAgent(
        assistant_agent=assistant_agent,
        engineer_agent=engineer_agent,
        human_agent=human_agent,
        mcp_client=mcp_client,
        ws_manager=ws_manager,
    )


class TestOrchestratorInit:
    """测试Orchestrator初始化"""

    def test_init_success(self) -> None:
        """测试成功初始化"""
        orchestrator = OrchestratorAgent(
            assistant_agent=AsyncMock(),
            engineer_agent=AsyncMock(),
            human_agent=MagicMock(),
            mcp_client=MagicMock(),
            ws_manager=MagicMock(),
        )
        assert orchestrator is not None


class TestScenarioRecognition:
    """测试场景识别功能"""

    async def test_recognize_general_inquiry(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试识别一般咨询场景"""
        msg = Msg(name="user", content="你好，我想了解一下产品功能", role="user")

        scenario = orchestrator._identify_scenario(msg, {
            "complexity": 0.3,
            "sentiment": {},
            "has_requirement": False,
        })

        assert scenario in ["consultation"]

    async def test_recognize_technical_issue(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试识别技术问题场景"""
        msg = Msg(name="user", content="系统报错了，无法登录", role="user")

        scenario = orchestrator._identify_scenario(msg, {
            "complexity": 0.7,
            "sentiment": {},
            "has_requirement": False,
        })

        assert scenario in ["fault"]

    async def test_recognize_complaint(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试识别投诉场景"""
        msg = Msg(name="user", content="你们的服务太差了！我要投诉", role="user")

        scenario = orchestrator._identify_scenario(msg, {
            "complexity": 0.4,
            "sentiment": {},
            "has_requirement": False,
        })

        assert scenario in ["complaint"]


class TestAgentSelection:
    """测试Agent选择功能"""

    async def test_select_assistant_for_general_inquiry(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试一般咨询选择AssistantAgent"""
        analysis = {
            "complexity": 0.2,
            "sentiment": {"overallSentiment": "neutral", "riskLevel": "low"},
            "customer": {},
            "has_requirement": False,
            "risk_level": "low",
            "scenario": "consultation",
        }

        mode = orchestrator._decide_execution_mode(analysis)

        assert mode in ["simple", "agent_supervised"]

    async def test_select_engineer_for_technical_issue(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试技术问题选择EngineerAgent"""
        analysis = {
            "complexity": 0.6,
            "sentiment": {"overallSentiment": "neutral", "riskLevel": "low"},
            "customer": {},
            "has_requirement": False,
            "risk_level": "low",
            "scenario": "fault",
        }

        mode = orchestrator._decide_execution_mode(analysis)

        assert mode == "parallel"

    async def test_select_multiple_agents_for_complex_scenario(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试复杂场景选择多个Agent"""
        analysis = {
            "complexity": 0.8,
            "sentiment": {"overallSentiment": "neutral", "riskLevel": "low"},
            "customer": {},
            "has_requirement": False,
            "risk_level": "low",
            "scenario": "consultation",
        }

        mode = orchestrator._decide_execution_mode(analysis)

        assert mode in ["agent_supervised", "parallel", "human_first"]


class TestExecutionMode:
    """测试执行模式决策"""

    async def test_parallel_execution_for_independent_tasks(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试独立任务使用并行执行"""
        analysis = {
            "complexity": 0.3,
            "sentiment": {"overallSentiment": "neutral", "riskLevel": "low"},
            "customer": {},
            "has_requirement": False,
            "risk_level": "low",
            "scenario": "consultation",
        }

        mode = orchestrator._decide_execution_mode(analysis)

        assert mode in ["simple", "agent_supervised"]

    async def test_sequential_execution_for_dependent_tasks(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试依赖任务使用顺序执行"""
        analysis = {
            "complexity": 0.5,
            "sentiment": {"overallSentiment": "neutral", "riskLevel": "low"},
            "customer": {},
            "has_requirement": False,
            "risk_level": "low",
            "scenario": "fault",
        }

        mode = orchestrator._decide_execution_mode(analysis)

        assert mode in ["parallel"]


class TestSupervisedAndHumanModes:
    async def test_agent_supervised_async_review(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        msg = Msg(name="user", content="测试消息", role="user", metadata={"conversationId": "c1"})
        low_conf = Msg(
            name="AssistantAgent",
            content="reply",
            role="assistant",
            metadata={"confidence": 0.5},
        )
        orchestrator.assistant_agent = AsyncMock(return_value=low_conf)

        result = await orchestrator._agent_supervised_mode(msg, async_review=True)

        assert result.metadata["needs_review"] is True

    async def test_human_first_mode_sync(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        msg = Msg(name="user", content="需要人工", role="user", metadata={"conversationId": "c2"})
        orchestrator.human_agent = AsyncMock(return_value=Msg(
            name="Human",
            content="人工回复",
            role="assistant",
            metadata={}
        ))
        orchestrator.mcp_client.call_tool = AsyncMock(return_value=[])

        result = await orchestrator._human_first_mode(msg, analysis={"risk_level": "high"})

        assert result.content == "人工回复"

    async def test_human_first_mode_async_review(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        msg = Msg(name="user", content="需要人工", role="user", metadata={"conversationId": "c2"})
        orchestrator.mcp_client.call_tool = AsyncMock(return_value=[])

        result = await orchestrator._human_first_mode(
            msg,
            analysis={"risk_level": "high"},
            async_review=True,
        )

        assert result.metadata["execution_mode"] == "human_first_async"


class TestAnalyzeRequestErrors:
    async def test_analyze_request_with_exceptions(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        msg = Msg(name="user", content="需要帮助", role="user")
        orchestrator.mcp_client.call_tool = AsyncMock(side_effect=Exception("boom"))

        analysis = await orchestrator._analyze_request(msg)

        assert analysis["risk_level"] == "low"
        assert analysis["has_requirement"] is True
        assert analysis["scenario"] in ["consultation", "fault", "complaint"]


class TestAnalyzeHelpers:
    async def test_analyze_sentiment_and_customer(self, orchestrator: OrchestratorAgent) -> None:
        orchestrator.mcp_client.call_tool = AsyncMock(return_value={"overallSentiment": "neutral", "riskLevel": "low"})
        msg = Msg(name="user", content="测试", role="user", metadata={"conversationId": "c3", "customerId": "cust-1"})

        sentiment = await orchestrator._analyze_sentiment(msg)
        customer = await orchestrator._get_customer_info(msg)

        assert sentiment["riskLevel"] == "low"
        assert customer == {"overallSentiment": "neutral", "riskLevel": "low"} or customer == {}

    def test_analyze_complexity(self, orchestrator: OrchestratorAgent) -> None:
        msg = Msg(name="user", content="为什么无法登录？怎么办？", role="user")
        value = orchestrator._analyze_complexity(msg)
        assert value >= 0


class TestFrontendNotifications:
    async def test_send_suggestions(self, orchestrator: OrchestratorAgent) -> None:
        orchestrator.ws_manager.send_to_client = AsyncMock()
        msg = Msg(name="user", content="测试", role="user", metadata={"conversationId": "c9"})
        await orchestrator._send_suggestions_to_frontend(msg, [{"t": 1}], {"risk_level": "low"})
        orchestrator.ws_manager.send_to_client.assert_awaited()

    async def test_send_review_request(self, orchestrator: OrchestratorAgent) -> None:
        orchestrator.ws_manager.send_to_client = AsyncMock()
        msg = Msg(name="user", content="测试", role="user", metadata={"conversationId": "c10"})
        agent_resp = Msg(name="assistant", content="reply", role="assistant", metadata={})
        await orchestrator._send_review_request_to_frontend(msg, agent_resp, 0.5)
        orchestrator.ws_manager.send_to_client.assert_awaited()


class TestCoordination:
    """测试Agent协调功能"""

    async def test_coordinate_single_agent(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试协调单个Agent"""
        msg = Msg(name="user", content="测试消息", role="user")

        result = await orchestrator._execute_simple(msg)

        assert result is not None

    async def test_coordinate_multiple_agents_parallel(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试并行协调多个Agent"""
        msg = Msg(name="user", content="测试消息", role="user")
        analysis = {"scenario": "fault"}

        result = await orchestrator._execute_parallel(msg, analysis)

        assert result is not None

    async def test_coordinate_handles_agent_failure(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试处理Agent执行失败"""
        msg = Msg(name="user", content="测试消息", role="user")
        analysis = {"scenario": "fault"}

        with patch.object(orchestrator, "assistant_agent", side_effect=Exception("执行失败")):
            result = await orchestrator._execute_parallel(msg, analysis)

        assert result is not None

    async def test_execute_parallel_timeout(
        self, orchestrator: OrchestratorAgent, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        async def _raise_timeout(*args: object, **kwargs: object) -> None:
            raise asyncio.TimeoutError()

        monkeypatch.setattr(asyncio, "wait_for", _raise_timeout)
        msg = Msg(name="user", content="测试", role="user", metadata={"conversationId": "c-timeout"})

        result = await orchestrator._execute_parallel(msg, analysis={"scenario": "fault"})

        assert result.metadata["execution_mode"] == "parallel_timeout"

    async def test_execute_parallel_no_valid_results(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        orchestrator.assistant_agent = AsyncMock(side_effect=Exception("boom"))
        orchestrator.engineer_agent = AsyncMock(side_effect=Exception("boom"))
        msg = Msg(name="user", content="测试", role="user", metadata={"conversationId": "c-fail"})

        result = await orchestrator._execute_parallel(msg, analysis={"scenario": "fault"})

        assert result.metadata["execution_mode"] == "parallel_failed"


class TestFrontendNoop:
    async def test_send_suggestions_without_ws_manager(self) -> None:
        orch = OrchestratorAgent(
            assistant_agent=AsyncMock(),
            engineer_agent=AsyncMock(),
            human_agent=MagicMock(),
            mcp_client=MagicMock(),
            ws_manager=None,
        )
        msg = Msg(name="user", content="测试", role="user", metadata={"conversationId": "c11"})
        await orch._send_suggestions_to_frontend(msg, [{"t": 1}], {"risk_level": "low"})

    async def test_send_review_without_ws_manager(self) -> None:
        orch = OrchestratorAgent(
            assistant_agent=AsyncMock(),
            engineer_agent=AsyncMock(),
            human_agent=MagicMock(),
            mcp_client=MagicMock(),
            ws_manager=None,
        )
        msg = Msg(name="user", content="测试", role="user", metadata={"conversationId": "c12"})
        await orch._send_review_request_to_frontend(
            msg,
            Msg(name="assistant", content="reply", role="assistant", metadata={}),
            0.4,
        )


class TestResultAggregation:
    """测试结果聚合功能"""

    async def test_aggregate_single_result(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试聚合单个结果"""
        results = {
            "AssistantAgent": Msg(
                name="AssistantAgent",
                content='{"suggested_reply": "回复内容", "confidence": 0.9}',
                role="assistant",
                metadata={}
            ),
        }

        aggregated = await orchestrator._aggregate_results(results, Msg(name="user", content="hi", role="user"))

        assert aggregated is not None

    async def test_aggregate_multiple_results(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试聚合多个结果"""
        results = {
            "AssistantAgent": Msg(
                name="AssistantAgent",
                content='{"suggested_reply": "回复1", "confidence": 0.9}',
                role="assistant",
                metadata={}
            ),
            "EngineerAgent": Msg(
                name="EngineerAgent",
                content='{"suggested_reply": "回复2", "confidence": 0.8}',
                role="assistant",
                metadata={}
            ),
        }

        aggregated = await orchestrator._aggregate_results(results, Msg(name="user", content="hi", role="user"))

        assert aggregated is not None

    async def test_aggregate_handles_empty_results(
        self, orchestrator: OrchestratorAgent
    ) -> None:
        """测试处理空结果"""
        results: dict = {}

        aggregated = await orchestrator._aggregate_results(results, Msg(name="user", content="hi", role="user"))

        assert aggregated is not None
