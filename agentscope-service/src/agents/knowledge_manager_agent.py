from __future__ import annotations

from agentscope.tool import Toolkit

from src.agents.base_agent import BaseReActAgent


class KnowledgeManagerAgent(BaseReActAgent):
    """ReAct agent that curates and updates knowledge base content."""

    @classmethod
    async def create(cls, toolkit: Toolkit) -> "KnowledgeManagerAgent":
        prompt = """你是知识库管理员。
1. 搜索、整理知识、推荐可复用内容。
2. 关注文档类目、标签、数据映射是否准确。
3. 自动增强知识库并给出来源说明。
"""
        return await cls.create_with_prompt(toolkit, prompt, max_iters=5)
