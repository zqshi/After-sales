from __future__ import annotations

import importlib
from unittest.mock import MagicMock

import pytest

from src.config.settings import AgentScopeSettings


def test_initialize_agentscope(monkeypatch: pytest.MonkeyPatch) -> None:
    settings_module = importlib.import_module("src.config.settings")
    mock_init = MagicMock()
    monkeypatch.setattr(settings_module.agentscope, "init", mock_init)
    settings = AgentScopeSettings()

    settings.initialize_agentscope()

    mock_init.assert_called_once()
