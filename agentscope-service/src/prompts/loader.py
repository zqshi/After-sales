from __future__ import annotations

from pathlib import Path
from typing import Optional, Dict, Tuple


def _repo_root() -> Path:
    # agentscope-service/src/prompts/loader.py -> After-sales/
    return Path(__file__).resolve().parents[3]


def _prompt_root() -> Path:
    return _repo_root() / "docs" / "prompts"


def load_prompt(filename: str, fallback: Optional[str] = None) -> str:
    """
    Load prompt text from markdown file.
    If markdown contains a ```prompt code block, use its content.
    Otherwise return full file content.
    """
    prompt_path = _prompt_root() / filename
    if not prompt_path.exists():
        return fallback or ""

    raw = prompt_path.read_text(encoding="utf-8")
    marker = "```prompt"
    if marker in raw:
        start = raw.find(marker)
        if start != -1:
            start = raw.find("\n", start)
            if start != -1:
                end = raw.find("```", start + 1)
                if end != -1:
                    return raw[start + 1:end].strip()
    return raw.strip()


class PromptRegistry:
    def __init__(self) -> None:
        self._cache: Dict[str, Tuple[float, str]] = {}

    def get(self, filename: str, fallback: Optional[str] = None) -> str:
        prompt_path = _prompt_root() / filename
        if not prompt_path.exists():
            return fallback or ""

        mtime = prompt_path.stat().st_mtime
        cached = self._cache.get(filename)
        if cached and cached[0] == mtime:
            return cached[1]

        text = load_prompt(filename, fallback)
        self._cache[filename] = (mtime, text)
        return text


prompt_registry = PromptRegistry()
