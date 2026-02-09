# Agent Prompts (Markdown Source of Truth)

本目录已迁移到 `docs/prompts/agents/`，此处保留为空目录以兼容旧引用。

## 文件清单

- 已迁移：
  - `docs/prompts/agents/assistant/base.md`
  - `docs/prompts/agents/engineer/base.md`
  - `docs/prompts/agents/inspector/base.md`
  - `docs/prompts/agents/orchestrator/base.md`

## 联动关系

- 运行时读取：`agentscope-service/src/prompts/loader.py`（读取 `docs/prompts/`）
- 各 Agent 代码内 `*_AGENT_PROMPT` 会调用 `load_prompt(...)` 加载对应 Markdown。
- 修改 `.md` 即可生效，无需手动改 Python（Agent 会在每次调用时热加载）。
- Python 内的 `fallback` 仅用于文件缺失的兜底。
- 运行时会按场景注入额外提示词：`docs/prompts/agents/{assistant|engineer|inspector}/*.md`
