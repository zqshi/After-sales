from __future__ import annotations

from agentscope.tool import Toolkit

from src.agents.base_agent import BaseReActAgent


class QualityInspectorAgent(BaseReActAgent):
    """ReAct agent that focuses on conversation compliance and quality."""

    @classmethod
    async def create(cls, toolkit: Toolkit) -> "QualityInspectorAgent":
        prompt = """你是质检分析员。
1. 回顾对话内容，找出风险点、错漏与回复质量。
2. 提供改进建议，并标记是否需要人工复审。
3. 仅输出结构化建议，不发送给用户。
"""
        return await cls.create_with_prompt(toolkit, prompt, max_iters=4)
