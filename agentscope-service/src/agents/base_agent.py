from __future__ import annotations

from typing import Any

from agentscope.agent import ReActAgent
from agentscope.formatter import OpenAIChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import OpenAIChatModel
from agentscope.tool import Toolkit


class BaseReActAgent(ReActAgent):
    """Shared base so subclasses can quickly bind prompts and toolkit."""

    @classmethod
    async def create_with_prompt(
        cls,
        toolkit: Toolkit,
        sys_prompt: str,
        max_iters: int = 6,
    ) -> "BaseReActAgent":
        from src.config.settings import settings
        cfg = settings.deepseek_config
        model = OpenAIChatModel(
            model_name=cfg["model_name"],
            api_key=cfg["api_key"],
            stream=cfg.get("stream", True),
            client_kwargs={"base_url": cfg["base_url"], "timeout": cfg["timeout"]},
        )
        formatter = OpenAIChatFormatter()
        return cls(
            name=cls.__name__,
            sys_prompt=sys_prompt,
            model=model,
            formatter=formatter,
            toolkit=toolkit,
            memory=InMemoryMemory(),
            max_iters=max_iters,
        )
