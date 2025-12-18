from __future__ import annotations

from collections import deque
from datetime import datetime, timezone
from typing import Any, Dict

import httpx
from urllib.parse import urljoin


class NodeEventLedger:
    """In-memory ledger that keeps the latest events arriving from the backend EventBus."""

    def __init__(self, max_entries: int = 256) -> None:
        self._events: deque[Dict[str, Any]] = deque(maxlen=max_entries)

    def record(self, event: Dict[str, Any]) -> None:
        entry = {**event, "receivedAt": datetime.now(timezone.utc).isoformat()}
        self._events.append(entry)

    def recent(self) -> list[Dict[str, Any]]:
        return list(self._events)

    def clear(self) -> None:
        self._events.clear()


class AgentEventPublisher:
    """Forward AgentScope-side events back into the Node.js EventBus."""

    def __init__(self, base_url: str, path: str, timeout_seconds: float = 5.0) -> None:
        self._endpoint = urljoin(base_url, path)
        self._client = httpx.AsyncClient(timeout=timeout_seconds)

    async def publish_event(
        self,
        event_type: str,
        aggregate_id: str,
        payload: Dict[str, Any] | None = None,
        occurred_at: str | None = None,
        version: int = 1,
        event_id: str | None = None,
    ) -> None:
        body: Dict[str, Any] = {
            "eventType": event_type,
            "aggregateId": aggregate_id,
            "payload": payload or {},
            "occurredAt": occurred_at or datetime.utcnow().isoformat(),
            "version": version,
        }
        if event_id:
            body["eventId"] = event_id

        response = await self._client.post(self._endpoint, json=body)
        response.raise_for_status()

    async def close(self) -> None:
        await self._client.aclose()
