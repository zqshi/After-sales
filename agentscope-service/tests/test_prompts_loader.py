from __future__ import annotations

from pathlib import Path

import pytest

from src.prompts import loader
from src.prompts.loader import load_prompt, prompt_registry


def test_load_prompt_fallback() -> None:
    assert load_prompt("missing.md", fallback="fallback") == "fallback"


def test_load_prompt_from_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(loader, "_repo_root", lambda: tmp_path)
    prompt_dir = tmp_path / "docs" / "prompts"
    prompt_dir.mkdir(parents=True, exist_ok=True)
    prompt_file = prompt_dir / "test_prompt.md"
    prompt_file.write_text("```prompt\nhello\n```", encoding="utf-8")

    assert load_prompt("test_prompt.md") == "hello"

    prompt_file.unlink()


def test_prompt_registry_cache(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(loader, "_repo_root", lambda: tmp_path)
    prompt_dir = tmp_path / "docs" / "prompts"
    prompt_dir.mkdir(parents=True, exist_ok=True)
    prompt_file = prompt_dir / "cache.md"
    prompt_file.write_text("first", encoding="utf-8")

    value1 = prompt_registry.get("cache.md")
    value2 = prompt_registry.get("cache.md")

    assert value1 == "first"
    assert value2 == "first"
