from __future__ import annotations

from typing import Any

from agentscope.agent import AgentBase
from agentscope.message import Msg

from src.tools.mcp_tools import BackendMCPClient


class SentimentAnalyzerAgent(AgentBase):
    """Custom agent dedicated to classifying sentiment via the MCP AI tool."""

    def __init__(self, mcp_client: BackendMCPClient, name: str = "SentimentAnalyzer") -> None:
        super().__init__()
        self.mcp_client = mcp_client
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    async def reply(self, msg: Msg | None = None) -> Msg:
        if msg is None:
            raise ValueError("SentimentAnalyzerAgent requires a message")

        metadata = msg.metadata or {}
        conversation_id = metadata.get("conversationId", msg.id)
        result = await self.mcp_client.call_tool(
            "analyzeConversation",
            conversationId=conversation_id,
            context="sentiment",
            includeHistory=False,
        )

        sentiment = result.get("overallSentiment") or result.get("result", {}).get("overallSentiment") or "neutral"
        score = float(result.get("score") or result.get("result", {}).get("score") or 0.0)

        return Msg(
            name=self._name,
            content=f"Sentiment: {sentiment} (score {score:.2f})",
            role="assistant",
            metadata={"sentiment": sentiment, "confidence": score, "source": result},
        )
