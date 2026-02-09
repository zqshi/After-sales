from __future__ import annotations

from pathlib import Path

import pytest

from src.prompts import agent_prompt


def test_build_agent_prompt_injects_stage_prompt(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path
    prompts_dir = repo_root / "docs" / "prompts" / "agents" / "assistant"
    prompts_dir.mkdir(parents=True, exist_ok=True)

    prompt_file = prompts_dir / "reply.md"
    prompt_file.write_text("""```prompt\nSTAGE: reply\n```""", encoding="utf-8")

    monkeypatch.setattr(agent_prompt, "_repo_root", lambda: repo_root)

    base_prompt = "BASE"
    result = agent_prompt.build_agent_prompt(base_prompt, "assistant", {"prompt_stage": "reply"})

    assert "BASE" in result
    assert "STAGE: reply" in result


def test_build_agent_prompt_no_stage_returns_base(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(agent_prompt, "_repo_root", lambda: tmp_path)
    base_prompt = "BASE"
    result = agent_prompt.build_agent_prompt(base_prompt, "assistant", {})
    assert result == base_prompt
