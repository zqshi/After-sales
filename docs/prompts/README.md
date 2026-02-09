# Prompts (Source of Truth)

本目录用于沉淀所有大模型提示词，按模块划分子目录，供代码运行时读取。

目录结构（示例）：
- backend/llm/
- backend/ai-service/
- backend/ai-adapter/
- agents/assistant/
- agents/engineer/
- agents/inspector/

使用说明：
- Markdown 中的 ```prompt 代码块内容会被运行时加载为提示词。
- 若无 ```prompt 代码块，则取全文内容。
- Agent 角色基座位于 `docs/prompts/agents/{agent}/base.md`，运行时会将场景提示词（`docs/prompts/agents/**`）拼接注入。
- Orchestrator 的路由阶段配置优先读取 `docs/prompts/agents/orchestrator/stage_config.yaml`，若解析失败回退到 `stage_config.md`。
