from __future__ import annotations

from agentscope.tool import Toolkit

from src.agents.base_agent import BaseReActAgent


class RequirementCollectorAgent(BaseReActAgent):
    """ReAct agent that listens for implicit requirements and fills tickets."""

    @classmethod
    async def create(cls, toolkit: Toolkit) -> "RequirementCollectorAgent":
        prompt = """你是需求采集机器人。
1. 通过对话提炼需求点、分类、优先级，并建议对应任务。
2. 记录上下文中的业务证据，并保持简洁。
"""
        return await cls.create_with_prompt(toolkit, prompt, max_iters=4)
