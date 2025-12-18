from __future__ import annotations

from typing import Any

from agentscope.message import Msg
from agentscope.pipeline import MsgHub

from src.agents.customer_service_agent import CustomerServiceAgent
from src.agents.human_agent_adapter import HumanAgentAdapter
from src.tools.mcp_tools import BackendMCPClient


class AdaptiveRouter:
    """Adaptive router that decides between agent and human processing."""

    def __init__(
        self,
        customer_service_agent: CustomerServiceAgent,
        human_agent: HumanAgentAdapter,
        mcp_client: BackendMCPClient,
        ws_manager: Any,
    ) -> None:
        self.customer_service_agent = customer_service_agent
        self.human_agent = human_agent
        self.mcp_client = mcp_client
        self.ws_manager = ws_manager

    async def route(self, user_msg: Msg) -> Msg:
        complexity = self._analyze_complexity(user_msg)
        sentiment = await self._analyze_sentiment(user_msg)
        customer_info = await self._get_customer_info(user_msg)

        if sentiment.get("riskLevel") == "high" or sentiment.get("overallSentiment") == "negative":
            return await self._human_first_mode(user_msg, sentiment=sentiment)

        if customer_info.get("vip") or complexity > 0.75:
            return await self._human_first_mode(user_msg, sentiment=sentiment)

        if complexity < 0.3:
            return await self._agent_auto_mode(user_msg)

        return await self._agent_supervised_mode(user_msg)

    async def _analyze_sentiment(self, user_msg: Msg) -> dict[str, Any]:
        try:
            return await self.mcp_client.call_tool(
                "analyzeConversation",
                conversationId=user_msg.metadata.get("conversationId", user_msg.id),
                context="quality",
                includeHistory=True,
            )
        except Exception:
            return {"overallSentiment": "neutral", "riskLevel": "low", "score": 0.7}

    async def _get_customer_info(self, user_msg: Msg) -> dict[str, Any]:
        customer_id = user_msg.metadata.get("customerId")
        if not customer_id:
            return {}
        try:
            return await self.mcp_client.call_tool(
                "getCustomerProfile",
                customerId=customer_id,
            )
        except Exception:
            return {}

    def _analyze_complexity(self, user_msg: Msg) -> float:
        words = len(user_msg.content.split())
        return min(1.0, words / 240)

    async def _agent_auto_mode(self, msg: Msg) -> Msg:
        return await self.customer_service_agent(msg)

    async def _agent_supervised_mode(self, msg: Msg) -> Msg:
        async with MsgHub(
            participants=[self.customer_service_agent, self.human_agent],
        ) as hub:
            agent_response = await self.customer_service_agent(msg)
            confidence = agent_response.metadata.get("confidence", 1.0)
            if confidence < 0.7:
                feedback = await self.human_agent(
                    Msg(
                        "system",
                        f"Agent回复置信度低（{confidence:.2f}），请确认或修正：{agent_response.content}",
                        "system",
                    )
                )
                if "修改" in feedback.content or "不对" in feedback.content:
                    return await self.human_agent(msg)
                return feedback
            return agent_response

    async def _human_first_mode(self, msg: Msg, sentiment: dict[str, Any] | None = None) -> Msg:
        suggestions = []
        try:
            suggestions = await self.mcp_client.call_tool(
                "searchKnowledge",
                query=msg.content,
                filters={"category": "faq"},
                mode="semantic",
            )
        except Exception:
            suggestions = []

        await self._send_suggestions_to_frontend(msg, suggestions)
        return await self.human_agent(msg)

    async def _send_suggestions_to_frontend(self, msg: Msg, suggestions: Any) -> None:
        conversation_id = msg.metadata.get("conversationId", "default")
        if not self.ws_manager:
            return

        await self.ws_manager.send_to_client(
            conversation_id,
            {
                "type": "agent_suggestions",
                "suggestions": suggestions,
                "metadata": msg.metadata,
            },
        )
