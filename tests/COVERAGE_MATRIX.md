# 自动化覆盖矩阵（现状核对）

更新时间：2026-01-27

说明：覆盖类型为现有脚本客观状态，不代表“完整覆盖”。

## 全局导航与布局

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| NAV-001 | P0 | Automated - mock UI | tests/frontend/e2e/dock-navigation.spec.js; tests/frontend/e2e/workspace-navigation.spec.js | Dock/子菜单切换验证（mock API） |
| NAV-002 | P0 | Automated - mock UI | tests/frontend/e2e/dock-navigation.spec.js; tests/frontend/e2e/workspace-navigation.spec.js | 子菜单切换验证（mock API） |
| NAV-003 | P0 | Automated - mock UI | tests/frontend/e2e/permissions.spec.js | 角色权限切换影响入口可见性（mock API） |
| NAV-004 | P0 | Automated - mock UI | tests/frontend/e2e/dock-navigation.spec.js | 分析面板开关（mock API） |
| NAV-005 | P1 | Missing | - | 未发现对应自动化脚本 |
| NAV-006 | P1 | Missing | - | 未发现对应自动化脚本 |

## 登录与会话

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| AUTH-001 | P0 | Automated - UI | tests/frontend/e2e/login.spec.js | 登录成功流程（mock login API） |
| AUTH-002 | P0 | Automated - UI | tests/frontend/e2e/login-validation.spec.js | 登录失败提示（401） |
| AUTH-003 | P0 | Automated - UI | tests/frontend/e2e/app-auth.spec.js | token 失效跳转 |
| AUTH-004 | P0 | Automated - UI | tests/frontend/e2e/app-auth.spec.js | 退出登录清理存储 |
| AUTH-005 | P0 | Automated - UI | tests/frontend/e2e/login-validation.spec.js | 表单校验覆盖 |
| AUTH-006 | P1 | Missing | - | 未发现对应自动化脚本 |

## 权限体系

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| RBAC-001 | P0 | Automated - mock UI | tests/frontend/e2e/permissions.spec.js | 权限接口与UI渲染一致（mock API） |
| RBAC-002 | P0 | Automated - mock UI | tests/frontend/e2e/permissions.spec.js | uiPermissions 隐藏入口 |
| RBAC-003 | P0 | Automated - mock UI | tests/frontend/e2e/permissions.spec.js | 权限变更后入口可见性刷新 |
| RBAC-004 | P0 | Automated - unit | tests/backend/unit/presentation/http/rbacMiddleware.spec.ts | rbacMiddleware 403 校验 |
| RBAC-005 | P1 | Missing | - | 未发现对应自动化脚本 |
| RBAC-006 | P1 | Missing | - | 未发现对应自动化脚本 |

## 对话列表与会话

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| MSG-001 | P0 | Automated - mock UI | tests/frontend/e2e/conversations.spec.js | 列表加载/默认选中 |
| MSG-002 | P0 | Automated - mock UI | tests/frontend/e2e/conversations.spec.js | 切换会话更新标题 |
| MSG-003 | P0 | Automated - mock UI | tests/frontend/e2e/conversations.spec.js | 状态/渠道/紧急度/等级筛选 |
| MSG-004 | P0 | Automated - mock UI (partial) | tests/frontend/e2e/conversations.spec.js | 仅覆盖空消息不发送，未覆盖超长提示 |
| MSG-005 | P1 | Automated - mock UI | tests/frontend/e2e/conversations.spec.js | 表情面板开关 |
| MSG-006 | P1 | Missing | - | 未发现对应自动化脚本 |
| MSG-007 | P0 | Automated - mock UI | tests/frontend/e2e/conversations.spec.js | 模式切换按钮高亮 |
| MSG-008 | P1 | Automated - mock UI | tests/frontend/e2e/conversations.spec.js | 低置信提示 |

## 客户画像

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| PROF-001 | P1 | Automated - mock UI | tests/frontend/e2e/profile.spec.js | 画像加载与兜底 |
| PROF-002 | P1 | Automated - mock UI | tests/frontend/e2e/profile.spec.js | 互动记录筛选 |
| PROF-003 | P1 | Missing | - | 未发现对应自动化脚本 |
| PROF-004 | P1 | Automated - mock UI | tests/frontend/e2e/profile.spec.js | 刷新画像 |

## 需求管理

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| REQ-001 | P1 | Automated - mock UI | tests/frontend/e2e/requirements.spec.js | 列表与统计加载 |
| REQ-002 | P1 | Missing | - | 未发现对应自动化脚本 |
| REQ-003 | P1 | Automated - mock UI | tests/frontend/e2e/requirements.spec.js | 创建/忽略入口 |
| REQ-004 | P1 | Automated - mock UI | tests/frontend/e2e/requirements.spec.js | 状态筛选 |

## 任务与质检

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| TASK-001 | P1 | Automated - mock UI | tests/frontend/e2e/tasks.spec.js | 质检概览与空态 |
| TASK-002 | P1 | Automated - mock UI | tests/frontend/e2e/tasks.spec.js | 指令派发与日志 |
| TASK-003 | P1 | Automated - mock UI | tests/frontend/e2e/tasks.spec.js | 空指令校验 |
| TASK-004 | P1 | Missing | - | 未发现对应自动化脚本 |

## 知识库管理

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| KB-001 | P1 | Automated - mock UI (partial) | tests/frontend/e2e/knowledge-management.spec.js | 分类列表加载隐式覆盖 |
| KB-002 | P1 | Automated - mock UI (partial) | tests/frontend/e2e/knowledge-management.spec.js | 仅新增分类，未覆盖删除/迁移 |
| KB-003 | P1 | Automated - mock UI (partial) | tests/frontend/e2e/knowledge-management.spec.js | 上传进度覆盖，未覆盖重试/删除 |
| KB-004 | P1 | Automated - mock UI | tests/frontend/e2e/knowledge-management.spec.js | 搜索与排序 |
| KB-005 | P1 | Automated - mock UI (partial) | tests/frontend/e2e/knowledge.spec.js | 仅 FAQ 切换展示，无创建/相似问题 |
| KB-006 | P1 | Missing | - | 未发现对应自动化脚本 |

## 知识应用

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| KBU-001 | P1 | Automated - mock UI | tests/frontend/e2e/knowledge-apply.spec.js | 搜索与预览 |
| KBU-002 | P1 | Automated - mock UI | tests/frontend/e2e/knowledge-apply.spec.js | 复制提示 |
| KBU-003 | P1 | Automated - mock UI | tests/frontend/e2e/knowledge-apply.spec.js | 空态与清空 |

## AI 辅助

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| AI-001 | P1 | Automated - mock UI | tests/frontend/e2e/ai-panel.spec.js | 面板加载与刷新 |
| AI-002 | P1 | Automated - mock UI | tests/frontend/e2e/ai-panel.spec.js | 采纳建议写入输入框 |
| AI-003 | P1 | Automated - mock UI | tests/frontend/e2e/ai-panel.spec.js | 子区域切换 |
| AI-004 | P1 | Missing | - | 未发现对应自动化脚本 |

## 工具箱

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| TOOL-001 | P2 | Automated - mock UI | tests/frontend/e2e/tools.spec.js | 告警处理 |
| TOOL-002 | P2 | Automated - mock UI | tests/frontend/e2e/tools.spec.js | 审计汇总弹窗 |
| TOOL-003 | P2 | Automated - mock UI | tests/frontend/e2e/tools.spec.js | 诊断/日志/会话弹窗 |

## 报表

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| REPORT-001 | P2 | Automated - mock UI | tests/frontend/e2e/reports.spec.js | 图表渲染与切换 |
| REPORT-002 | P2 | Automated - mock UI | tests/frontend/e2e/reports.spec.js | 空数据提示 |

## 审计与监控

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| AUDIT-001 | P2 | Automated - API smoke | tests/frontend/e2e/api/audit.spec.js | POST /audit/events |
| AUDIT-002 | P2 | Automated - API smoke | tests/frontend/e2e/api/audit.spec.js | POST /monitoring/alerts |
| AUDIT-003 | P2 | Missing | - | 未发现对应自动化脚本 |

## 健康检查

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| HEALTH-001 | P2 | Automated - API smoke | tests/frontend/e2e/api/health.spec.js | GET /health |
| HEALTH-002 | P2 | Automated - API smoke | tests/frontend/e2e/api/health.spec.js | GET /metrics |

## 权限面板

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| PERM-001 | P1 | Automated - mock UI | tests/frontend/e2e/permission-panel.spec.js | 成员/角色加载与搜索 |
| PERM-002 | P1 | Automated - mock UI | tests/frontend/e2e/permission-panel.spec.js | 权限勾选与保存 |
| PERM-003 | P1 | Missing | - | 未发现对应自动化脚本 |
| PERM-004 | P1 | Missing | - | 未发现对应自动化脚本 |

## 工具箱快捷动作

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| QUICK-001 | P2 | Automated - mock UI | tests/frontend/e2e/quick-actions.spec.js | 快捷动作提交 |
| QUICK-002 | P2 | Automated - mock UI | tests/frontend/e2e/quick-actions.spec.js | ESC 关闭弹窗 |

## 可靠性与异常处理

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| REL-001 | P0 | Automated - mock UI (partial) | tests/frontend/e2e/reliability.spec.js | 覆盖 408/504 提示，未验证重试次数/耗时 |
| REL-002 | P0 | Automated - mock UI | tests/frontend/e2e/reliability.spec.js | 断网提示 |
| REL-003 | P1 | Automated - mock UI | tests/frontend/e2e/reliability.spec.js | 429 提示 |
| REL-004 | P1 | Missing | - | 未发现对应自动化脚本 |

## 实时通信与 SSE

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| SSE-001 | P0 | Automated - API smoke (partial) | tests/frontend/e2e/integration/sse.spec.js | 仅 content-type 校验 |
| SSE-002 | P0 | Missing | - | 未发现对应自动化脚本 |
| SSE-003 | P1 | Missing | - | 未发现对应自动化脚本 |
| SSE-004 | P1 | Missing | - | 未发现对应自动化脚本 |
| SSE-005 | P1 | Missing | - | 未发现对应自动化脚本 |

## Agent 协同与智能辅助

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| AGENT-001 | P0 | Automated - API smoke | tests/frontend/e2e/integration/agents.spec.js | Orchestrator 路由接口 |
| AGENT-002 | P0 | Automated - API smoke | tests/frontend/e2e/integration/agents.spec.js | Assistant 分析接口 |
| AGENT-003 | P1 | Automated - API smoke | tests/frontend/e2e/integration/agents.spec.js | Engineer 诊断接口 |
| AGENT-004 | P1 | Automated - API smoke | tests/frontend/e2e/integration/agents.spec.js | Inspector 报告查询 |
| AGENT-005 | P0 | Automated - integration (mocked deps) | tests/backend/integration/agent-collaboration/AgentCollaboration.integration.spec.ts | AgentScope 失败降级流程有覆盖 |
| AGENT-006 | P1 | Missing | - | 未发现对应自动化脚本 |

## 问题并行管理

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| PROB-001 | P0 | Automated - API smoke | tests/frontend/e2e/integration/problems.spec.js | 创建问题记录 |
| PROB-002 | P0 | Automated - API smoke | tests/frontend/e2e/integration/problems.spec.js | 问题状态流转 |
| PROB-003 | P0 | Automated - API smoke | tests/frontend/e2e/integration/problems.spec.js | 问题与工单关联 |
| PROB-004 | P0 | Missing | - | 未发现对应自动化脚本 |
| PROB-005 | P1 | Missing | - | 未发现对应自动化脚本 |

## 事件溯源与一致性

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| ES-001 | P1 | Automated - API smoke | tests/frontend/e2e/integration/events.spec.js | domain/outbox 写入接口 |
| ES-002 | P1 | Missing | - | 未发现对应自动化脚本 |
| ES-003 | P1 | Automated - API smoke | tests/frontend/e2e/integration/events.spec.js | 一致性校验 |
| ES-004 | P2 | Automated - API smoke | tests/frontend/e2e/integration/events.spec.js | 回溯与重放接口 |

## 性能与负载

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| PERF-001 | P0 | Automated - UI baseline | tests/frontend/e2e/performance/performance.spec.js | 首屏与交互基线 |
| PERF-002 | P1 | Missing | - | 未发现对应自动化脚本 |
| PERF-003 | P1 | Missing | - | 未发现对应自动化脚本 |
| PERF-004 | P1 | Missing | - | 未发现对应自动化脚本 |

## 仅 UI 层手工测试

| 用例ID | 优先级 | 覆盖状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| UI-001 | - | Manual only | tests/WEB_APP_TEST_CASES.md | 仅 UI 层手工测试 |
| UI-002 | - | Manual only | tests/WEB_APP_TEST_CASES.md | 仅 UI 层手工测试 |
| UI-003 | - | Manual only | tests/WEB_APP_TEST_CASES.md | 仅 UI 层手工测试 |
| UI-004 | - | Manual only | tests/WEB_APP_TEST_CASES.md | 仅 UI 层手工测试 |
| UI-005 | - | Manual only | tests/WEB_APP_TEST_CASES.md | 仅 UI 层手工测试 |
| UI-006 | - | Manual only | tests/WEB_APP_TEST_CASES.md | 仅 UI 层手工测试 |
| UI-007 | - | Manual only | tests/WEB_APP_TEST_CASES.md | 仅 UI 层手工测试 |
| UI-008 | - | Manual only | tests/WEB_APP_TEST_CASES.md | 仅 UI 层手工测试 |
