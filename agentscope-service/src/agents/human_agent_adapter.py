from __future__ import annotations

import asyncio
from typing import Any

from agentscope.agent import AgentBase
from agentscope.message import Msg


class HumanAgentAdapter(AgentBase):
    """Adapter that waits for human input coming through WebSockets."""

    def __init__(self, name: str, ws_manager: Any) -> None:
        super().__init__()
        self._name = name
        self.ws_manager = ws_manager
        self.pending_responses: dict[str, asyncio.Future] = {}

    @property
    def name(self) -> str:
        return self._name

    async def reply(self, x: Msg | None = None) -> Msg:
        """Notify frontend that human response is required and await input."""
        conversation_id = (x.metadata or {}).get("conversationId", "default")
        await self.ws_manager.send_to_client(conversation_id, {
            "type": "human_input_required",
            "message": x.content if x else "需要人工处理",
            "metadata": x.metadata or {},
        })

        human_response = await self._wait_for_human_input(conversation_id)

        return Msg(
            name=self._name,
            content=human_response.get("content", ""),
            role="assistant",
            metadata=human_response.get("metadata", {}),
        )

    async def _wait_for_human_input(self, conversation_id: str, timeout: int = 300) -> dict[str, Any]:
        future = asyncio.get_running_loop().create_future()
        self.pending_responses[conversation_id] = future
        try:
            return await asyncio.wait_for(future, timeout)
        except asyncio.TimeoutError:
            return {"content": "[超时] 正在分配其他客服", "metadata": {}}
        finally:
            self.pending_responses.pop(conversation_id, None)

    def receive_human_input(self, conversation_id: str, content: str, metadata: dict[str, Any]) -> None:
        future = self.pending_responses.get(conversation_id)
        if future and not future.done():
            future.set_result({"content": content, "metadata": metadata})
