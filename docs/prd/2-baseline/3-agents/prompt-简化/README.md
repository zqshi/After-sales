# Agent Prompts (Markdown Source of Truth)

本目录是 Agent 提示词的唯一真实来源。运行时会优先读取这些 Markdown 文件。

## 文件清单

- assistant_agent.md
- engineer_agent.md
- inspector_agent.md
- orchestrator_agent.md

## 联动关系

- 运行时读取：`agentscope-service/src/prompts/loader.py`
- 各 Agent 代码内 `*_AGENT_PROMPT` 会调用 `load_prompt(...)` 加载对应 Markdown。
- 修改 `.md` 即可生效，无需手动改 Python（Agent 会在每次调用时热加载）。
- Python 内的 `fallback` 仅用于文件缺失的兜底。
