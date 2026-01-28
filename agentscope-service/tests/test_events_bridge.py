from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.events.bridge import NodeEventLedger, AgentEventPublisher


def test_event_ledger_record_and_clear() -> None:
    ledger = NodeEventLedger(max_entries=2)
    ledger.record({"eventType": "A"})
    ledger.record({"eventType": "B"})
    recent = ledger.recent()
    assert len(recent) == 2
    ledger.clear()
    assert ledger.recent() == []


@pytest.mark.asyncio
async def test_agent_event_publisher(monkeypatch: pytest.MonkeyPatch) -> None:
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=MagicMock(raise_for_status=lambda: None))
    mock_client.aclose = AsyncMock()
    monkeypatch.setattr("src.events.bridge.httpx.AsyncClient", lambda timeout: mock_client)

    publisher = AgentEventPublisher("http://localhost", "/events")
    await publisher.publish_event("Test", "agg-1", {"foo": "bar"})
    await publisher.close()

    mock_client.post.assert_awaited()
    mock_client.aclose.assert_awaited()
