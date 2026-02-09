from __future__ import annotations

from pathlib import Path

import pytest

from src.prompts import agent_prompt


def test_load_stage_config_from_yaml(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path
    cfg_dir = repo_root / "docs" / "prompts" / "agents" / "orchestrator"
    cfg_dir.mkdir(parents=True, exist_ok=True)
    yaml_file = cfg_dir / "stage_config.yaml"
    yaml_file.write_text(
        "assistant:\n"
        "  default: reply\n"
        "  fault: fault_reply\n"
        "engineer:\n"
        "  parallel: [diagnosis, severity]\n",
        encoding="utf-8",
    )

    monkeypatch.setattr(agent_prompt, "_repo_root", lambda: repo_root)
    data = agent_prompt.load_agent_stage_config()

    assert data["assistant"]["default"] == "reply"
    assert data["assistant"]["fault"] == "fault_reply"
    assert data["engineer"]["parallel"] == ["diagnosis", "severity"]


def test_load_stage_config_fallback_to_md(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path
    cfg_dir = repo_root / "docs" / "prompts" / "agents" / "orchestrator"
    cfg_dir.mkdir(parents=True, exist_ok=True)
    md_file = cfg_dir / "stage_config.md"
    md_file.write_text(
        "```prompt\n"
        '{"assistant":{"default":"reply"}}\n'
        "```",
        encoding="utf-8",
    )

    monkeypatch.setattr(agent_prompt, "_repo_root", lambda: repo_root)
    data = agent_prompt.load_agent_stage_config()

    assert data["assistant"]["default"] == "reply"
