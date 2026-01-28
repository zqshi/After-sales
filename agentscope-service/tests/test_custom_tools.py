from __future__ import annotations

import pytest

from src.tools.custom_tools import health_ping


@pytest.mark.asyncio
async def test_health_ping() -> None:
    result = await health_ping()
    assert result == {"status": "alive"}
