from __future__ import annotations

from typing import Any

from agentscope.message import Msg
from agentscope.memory import MemoryBase

from src.tools.persistence import PersistenceClient


class PersistentMemory(MemoryBase):
    """Persist memory via Node MCP tools while keeping an in-process cache."""

    def __init__(
        self,
        persistence: PersistenceClient,
        conversation_id: str | None,
        agent_name: str,
    ) -> None:
        super().__init__()
        self._persistence = persistence
        self._conversation_id = conversation_id
        self._agent_name = agent_name
        self._content: list[Msg] = []

    async def hydrate(self) -> None:
        if not self._conversation_id:
            return
        payload = await self._persistence.load_agent_memory(
            conversation_id=self._conversation_id,
            agent_name=self._agent_name,
        )
        if not payload:
            return
        content = payload.get('memory', {}).get('content', [])
        self._content = []
        for data in content:
            if isinstance(data, dict):
                data.pop('type', None)
                self._content.append(Msg.from_dict(data))

    def state_dict(self) -> dict:
        return {
            'content': [msg.to_dict() for msg in self._content],
        }

    def load_state_dict(self, state_dict: dict, strict: bool = True) -> None:
        self._content = []
        for data in state_dict.get('content', []):
            if isinstance(data, dict):
                data.pop('type', None)
                self._content.append(Msg.from_dict(data))

    async def size(self) -> int:
        return len(self._content)

    async def retrieve(self, *args: Any, **kwargs: Any) -> None:
        raise NotImplementedError(
            f"The retrieve method is not implemented in {self.__class__.__name__} class.",
        )

    async def delete(self, index: Any) -> None:
        if isinstance(index, int):
            index = [index]
        invalid_index = [_ for _ in index if 0 > _ or _ >= len(self._content)]
        if invalid_index:
            raise IndexError(f"The index {invalid_index} does not exist.")
        self._content = [
            _ for idx, _ in enumerate(self._content) if idx not in index
        ]
        await self._flush()

    async def add(self, memories: Any, allow_duplicates: bool = False) -> None:
        if memories is None:
            return
        if isinstance(memories, Msg):
            memories = [memories]
        if not isinstance(memories, list):
            raise TypeError(
                f"The memories should be a list of Msg or a single Msg, but got {type(memories)}.",
            )
        for msg in memories:
            if not isinstance(msg, Msg):
                raise TypeError(
                    f"The memories should be a list of Msg or a single Msg, but got {type(msg)}.",
                )
        if not allow_duplicates:
            existing_ids = [_.id for _ in self._content]
            memories = [_ for _ in memories if _.id not in existing_ids]
        self._content.extend(memories)
        await self._flush()

    async def get_memory(self) -> list[Msg]:
        return self._content

    async def clear(self) -> None:
        self._content = []
        await self._flush()

    async def _flush(self) -> None:
        if not self._conversation_id:
            return
        await self._persistence.record_agent_memory(
            conversation_id=self._conversation_id,
            agent_name=self._agent_name,
            memory=self.state_dict(),
        )
