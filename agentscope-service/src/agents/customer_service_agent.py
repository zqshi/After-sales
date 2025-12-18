from __future__ import annotations

from typing import Any

from agentscope.agent import ReActAgent
from agentscope.formatter import OpenAIChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import OpenAIChatWrapper
from agentscope.tool import Toolkit

from src.tools.mcp_tools import BackendMCPClient


class CustomerServiceAgent(ReActAgent):
    """AgentScope ReActAgent that handles customer chats via DeepSeek."""

    def __init__(
        self,
        name: str,
        sys_prompt: str,
        model: OpenAIChatWrapper,
        formatter: OpenAIChatFormatter,
        toolkit: Toolkit,
        mcp_client: BackendMCPClient,
        memory: InMemoryMemory | None = None,
        max_iters: int = 10,
        verbose: bool = False,
    ) -> None:
        super().__init__(
            name=name,
            sys_prompt=sys_prompt,
            model=model,
            formatter=formatter,
            toolkit=toolkit,
            memory=memory or InMemoryMemory(),
            max_iters=max_iters,
            verbose=verbose,
        )
        self.mcp_client = mcp_client

    @classmethod
    async def create(cls, toolkit: Toolkit, mcp_client: BackendMCPClient) -> "CustomerServiceAgent":
        model = OpenAIChatWrapper(config_name="deepseek_qwen")
        formatter = OpenAIChatFormatter()
        sys_prompt = """你是一个专业的售后客服助手。
1. 理解客户问题并快速判断是否可自动解决。
2. 使用知识库、客户画像等工具帮助决策。
3. 必要时升级至人工，毕竟客户体验比一次回复更重要。
4. 保持礼貌、高效、有温度。

# 可用工具
- searchKnowledge: 研究知识库
- getCustomerProfile: 查看画像
- analyzeConversation: 计算情绪与风险
- createTask: 建立待办项
- sendMessage: 输出文本给客户
"""
        return cls(
            name="CustomerServiceAgent",
            sys_prompt=sys_prompt,
            model=model,
            formatter=formatter,
            toolkit=toolkit,
            mcp_client=mcp_client,
            memory=InMemoryMemory(),
            max_iters=8,
            verbose=False,
        )

    async def should_escalate_to_human(self, msg: Msg) -> bool:
        history = await self.memory.get_memory()
        if len(history) > 5:
            return True

        metadata = msg.metadata or {}
        conversation_id = metadata.get("conversationId", "")
        customer_id = metadata.get("customerId")

        try:
            result = await self.mcp_client.call_tool(
                "analyzeConversation",
                conversationId=conversation_id or msg.id,
                context="risk",
                includeHistory=True,
            )
        except Exception:
            return False

        sentiment = (
            result.get("overallSentiment")
            or result.get("result", {}).get("overallSentiment")
            or "neutral"
        )
        score = float(result.get("score") or result.get("result", {}).get("score") or 0.0)

        if sentiment == "negative" or score < 0.5:
            return True

        if customer_id:
            profile = await self.mcp_client.call_tool("getCustomerProfile", customerId=customer_id)
            if profile.get("isVIP") or profile.get("riskLevel") == "high":
                return True

        return False
