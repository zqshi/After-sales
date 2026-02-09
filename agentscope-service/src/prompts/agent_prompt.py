from __future__ import annotations

from pathlib import Path
from typing import Iterable


def _repo_root() -> Path:
    # agentscope-service/src/prompts/agent_prompt.py -> After-sales/
    return Path(__file__).resolve().parents[3]


def _agents_prompt_root() -> Path:
    return _repo_root() / "docs" / "prompts" / "agents"


def _extract_prompt(raw: str) -> str:
    marker = "```prompt"
    if marker not in raw:
        return raw.strip()
    start = raw.find(marker)
    if start == -1:
        return raw.strip()
    start = raw.find("\n", start)
    if start == -1:
        return raw.strip()
    end = raw.find("```", start + 1)
    if end == -1:
        return raw.strip()
    return raw[start + 1:end].strip()


def load_agent_stage_prompt(agent_name: str, stage: str) -> str:
    if not stage:
        return ""
    prompt_path = _agents_prompt_root() / agent_name / f"{stage}.md"
    if not prompt_path.exists():
        return ""
    raw = prompt_path.read_text(encoding="utf-8")
    return _extract_prompt(raw)


def load_agent_stage_prompts(agent_name: str, stages: Iterable[str]) -> list[str]:
    prompts: list[str] = []
    for stage in stages:
        stage = str(stage).strip()
        if not stage:
            continue
        text = load_agent_stage_prompt(agent_name, stage)
        if text:
            prompts.append(text)
    return prompts


def build_agent_prompt(base_prompt: str, agent_name: str, metadata: dict | None) -> str:
    if not metadata:
        return base_prompt
    stages: list[str] = []
    stage = metadata.get("prompt_stage")
    if stage:
        stages.append(str(stage))
    extra_stages = metadata.get("prompt_stages")
    if isinstance(extra_stages, list):
        stages.extend([str(s) for s in extra_stages if s])

    if not stages:
        return base_prompt

    stage_prompts = load_agent_stage_prompts(agent_name, stages)
    if not stage_prompts:
        return base_prompt

    return f"{base_prompt}\n\n【场景提示词】\n" + "\n\n".join(stage_prompts)


def load_agent_stage_config() -> dict:
    """
    Load orchestrator stage config from YAML or Markdown.
    YAML path: docs/prompts/agents/orchestrator/stage_config.yaml
    Markdown fallback: docs/prompts/agents/orchestrator/stage_config.md (```prompt block)
    """
    base = _agents_prompt_root() / "orchestrator"
    yaml_path = base / "stage_config.yaml"
    if yaml_path.exists():
        raw = yaml_path.read_text(encoding="utf-8")
        parsed = _parse_simple_yaml(raw)
        if isinstance(parsed, dict):
            return parsed

    md_raw = load_agent_stage_prompt("orchestrator", "stage_config")
    if md_raw:
        try:
            import json
            data = json.loads(md_raw)
            if isinstance(data, dict):
                return data
        except Exception:
            return {}
    return {}


def _parse_simple_yaml(raw: str) -> dict | None:
    lines = []
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        lines.append(line.rstrip())

    root: dict = {}
    stack: list[tuple[int, dict]] = [(0, root)]

    for line in lines:
        indent = len(line) - len(line.lstrip(" "))
        content = line.lstrip(" ")

        while stack and indent < stack[-1][0]:
            stack.pop()
        if not stack:
            return None

        if ":" not in content:
            return None

        key, rest = content.split(":", 1)
        key = key.strip()
        value_raw = rest.strip()
        current = stack[-1][1]

        if value_raw == "":
            new_map: dict = {}
            current[key] = new_map
            stack.append((indent + 2, new_map))
            continue

        current[key] = _parse_yaml_scalar(value_raw)

    return root


def _parse_yaml_scalar(value: str) -> str | list[str]:
    value = value.strip()
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        parts = [p.strip().strip("'").strip('"') for p in inner.split(",")]
        return [p for p in parts if p]
    return value.strip("'").strip('"')
