from __future__ import annotations

from typing import Any

from agentscope.agent import ReActAgent
from agentscope.formatter import OpenAIChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import OpenAIChatWrapper
from agentscope.tool import Toolkit


class BaseReActAgent(ReActAgent):
    """Shared base so subclasses can quickly bind prompts and toolkit."""

    @classmethod
    async def create_with_prompt(
        cls,
        toolkit: Toolkit,
        sys_prompt: str,
        max_iters: int = 6,
        verbose: bool = False,
    ) -> "BaseReActAgent":
        model = OpenAIChatWrapper(config_name="deepseek_qwen")
        formatter = OpenAIChatFormatter()
        return cls(
            name=cls.__name__,
            sys_prompt=sys_prompt,
            model=model,
            formatter=formatter,
            toolkit=toolkit,
            memory=InMemoryMemory(),
            max_iters=max_iters,
            verbose=verbose,
        )
