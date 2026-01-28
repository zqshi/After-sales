from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from agentscope.message import Msg
from agentscope.tool import Toolkit

from src.agents.base_agent import BaseReActAgent
from src.agents.human_agent_adapter import HumanAgentAdapter


@pytest.mark.asyncio
async def test_base_agent_create_with_prompt(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_model = MagicMock()
    fake_formatter = MagicMock()

    monkeypatch.setattr("src.agents.base_agent.OpenAIChatModel", lambda **_: fake_model)
    monkeypatch.setattr("src.agents.base_agent.OpenAIChatFormatter", lambda: fake_formatter)

    agent = await BaseReActAgent.create_with_prompt(Toolkit(), "hello", max_iters=2)

    assert agent.name == "BaseReActAgent"
    assert agent.sys_prompt == "hello"


@pytest.mark.asyncio
async def test_human_agent_adapter_reply(monkeypatch: pytest.MonkeyPatch) -> None:
    ws_manager = MagicMock()
    ws_manager.send_to_client = AsyncMock()
    adapter = HumanAgentAdapter("Human", ws_manager)

    msg = Msg(name="user", content="需要人工", role="user", metadata={"conversationId": "c1"})

    async def feed() -> None:
        await asyncio.sleep(0.01)
        adapter.receive_human_input("c1", "已处理", {"source": "human"})

    asyncio.create_task(feed())
    result = await adapter.reply(msg)

    ws_manager.send_to_client.assert_awaited()
    assert result.content == "已处理"
    assert result.metadata == {"source": "human"}


@pytest.mark.asyncio
async def test_human_agent_adapter_timeout() -> None:
    ws_manager = MagicMock()
    ws_manager.send_to_client = AsyncMock()
    adapter = HumanAgentAdapter("Human", ws_manager)

    result = await adapter._wait_for_human_input("missing", timeout=0.01)

    assert result["content"].startswith("[超时]")
