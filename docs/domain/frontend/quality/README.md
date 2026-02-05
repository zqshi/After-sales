# Quality（Frontend）


## 领域边界
- 负责对话质检评分、质检报告与改进建议的生命周期。
- 不负责对话消息与审核流程（与对话/审核域协作）。

## 前端管理范围
- 质检报告列表/详情展示。
- 质检评分与建议可视化。

## 核心字段
- QualityReport: `id`, `conversationId`, `problemId`, `qualityScore`, `report`, `createdAt`
- 约束:
  - `qualityScore` 为 0-100 或 0-1 区间（需统一标准）
  - `report` 为结构化质检结果快照

## 完整性检查与缺口
- 已补齐标准 `/api/quality` 接口与前端 `QualityReport` 模型/仓储。
- 领域事件与值对象仍建议后续补齐。
