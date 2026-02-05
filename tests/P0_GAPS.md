# P0 缺口清单（自动化）

更新时间：2026-01-30

| 用例ID | 覆盖状态 | 证据 |
| --- | --- | --- |
| AGENT-001 | Automated - API smoke | tests/frontend/e2e/integration/agents.spec.js |
| AGENT-002 | Automated - API smoke | tests/frontend/e2e/integration/agents.spec.js |
| MSG-004 | Automated - mock UI (partial) | tests/frontend/e2e/conversations.spec.js |
| PROB-001 | Automated - API smoke | tests/frontend/e2e/integration/problems.spec.js |
| PROB-002 | Automated - API smoke | tests/frontend/e2e/integration/problems.spec.js |
| PROB-003 | Automated - API smoke | tests/frontend/e2e/integration/problems.spec.js |
| PROB-004 | Skeleton - TODO | tests/frontend/e2e/integration/problems.spec.js |
| REL-001 | Automated - mock UI (partial) | tests/frontend/e2e/reliability.spec.js |
| SSE-001 | Automated - API smoke (partial) | tests/frontend/e2e/integration/sse.spec.js |
| SSE-002 | Skeleton - TODO | tests/frontend/e2e/integration/sse.spec.js |

## 执行阻塞（影响“真实覆盖率”产出）

| 阻塞项 | 影响范围 | 现象 | 解决建议 |
| --- | --- | --- | --- |
| BE-COV-ENV | 后端 Vitest 覆盖率 | 已解决（连接测试库 + 覆盖率产出） | 无 |
| FE-COV-ENV | 前端 Vitest 覆盖率 | 已解决（依赖安装 + 覆盖率产出） | 无 |
| AGENT-COV-ENV | AgentScope pytest 覆盖率 | 已解决（PYTHONPATH=.` + 覆盖率产出） | 无 |
