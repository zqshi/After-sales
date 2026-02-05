# 自动化测试用例文档（最终完整覆盖版）

更新时间：2026-01-27

本文件以当前实现功能为准，覆盖所有业务流程与细分功能点；支持 E2E / API / 集成 / 性能 / 可靠性自动化执行，并与 `tests/WEB_APP_TEST_CASES.md` 对齐。

## 1. 执行环境
- Docker 服务：`docker compose up -d`
- 前端端口：`http://localhost:3002`（compose 映射为 `3002:5173`）
- 后端端口：`http://localhost:8080`
- AgentScope：`http://localhost:5000`
- E2E 命令：
  - `E2E_BASE_URL=http://localhost:3002 E2E_NO_WEB_SERVER=true npm run test:e2e -- --workers=1`
- 集成测试命令：
  - `./tests/system/test-quality-inspection.sh`

## 2. 用例类型说明
- **E2E**：浏览器端全流程自动化（推荐 Playwright）
- **API**：接口级校验（Postman/Newman/Supertest）
- **集成**：跨模块/跨服务联动验证
- **性能**：Lighthouse/WebPageTest/自定义压测
- **可靠性**：重试/超时/降级/断网等

## 3. 数据准备与重置
- 账号：test@example.com / Test@123456
- 角色：cs / quality_specialist / leadership / admin
- 客户：10 个（含等级/风险/标签差异）
- 对话：50 条（含状态/渠道/未读）
- 知识：100 条（含分类/标签/FAQ）
- 需求：20 条（含状态/优先级）
- 任务：10 条（含派发/处理状态）
- 事件：domain_events + outbox_events 基础数据
- 数据重置：用 SQL 种子或 API 清理脚本在每轮前重置

## 4. 自动化覆盖矩阵（全量）

> 每条用例为可自动化执行版本，覆盖 `tests/WEB_APP_TEST_CASES.md` 的全部章节与细分点。

### 0. 全局导航与布局（NAV）
- NAV-001 Dock 入口切换（消息/知识/工具/报表/权限）【E2E, P0】
- NAV-002 Dock 子菜单切换（消息->任务 / 知识->知识应用）【E2E, P0】
- NAV-003 角色切换影响入口可见性【E2E, P0】
- NAV-004 右侧抽屉分析/AI 面板切换【E2E, P0】
- NAV-005 分隔线拖拽边界限制【E2E, P1】
- NAV-006 用户菜单开合【E2E, P1】
- NAV-A11Y-001 Dock 键盘可操作【E2E, P2】

### 1. 登录与会话（AUTH）
- AUTH-001 邮箱/手机号登录成功【E2E, P0】
- AUTH-002 登录失败提示（401/403）【E2E, P0】
- AUTH-003 token 失效跳转登录【E2E, P0】
- AUTH-004 退出登录清理存储【E2E, P0】
- AUTH-005 表单校验（空值/格式/复杂度/长度）【E2E, P0】
- AUTH-006 网络异常/500 提示【E2E, P1】
- AUTH-A11Y-001 错误提示 aria-live【E2E, P2】

### 2. 权限体系（RBAC）
- RBAC-001 权限接口返回与 UI 渲染一致【集成, P0】
- RBAC-002 无权限入口隐藏/禁用【E2E, P0】
- RBAC-003 切换角色权限即时生效【E2E, P0】
- RBAC-004 无权限操作返回 403【API, P0】
- RBAC-005 uiPermissions 优先渲染【集成, P1】
- RBAC-006 当前入口被隐藏自动回退消息页【E2E, P1】

### 3. 对话列表与会话（MSG）
- MSG-001 初始列表加载与默认高亮【E2E, P0】
- MSG-002 切换会话同步画像与消息【E2E, P0】
- MSG-003 搜索/筛选（状态/渠道/紧急度/等级）【E2E, P0】
- MSG-004 发送消息/空消息/超长提示【E2E, P0】
- MSG-005 表情面板开关【E2E, P1】
- MSG-007 Agent 模式切换与接口调用【E2E, P0】
- MSG-008 风险词低置信提示【E2E, P1】
- MSG-A11Y-001 Enter 发送/Shift+Enter 换行【E2E, P2】
- MSG-ERR-001 错误码映射（400/401/403/404/500）【API+E2E, P1】

### 4. 客户画像（PROF）
- PROF-001 画像加载与缺省兜底【E2E, P1】
- PROF-002 互动记录与筛选【E2E, P1】
- PROF-003 服务记录详情弹窗与定位【E2E, P1】
- PROF-004 刷新画像接口【E2E, P1】
- PROF-ERR-001 异常码映射（400/401/403/404）【API, P1】

### 5. 需求管理（REQ）
- REQ-001 列表与统计加载【E2E, P1】
- REQ-002 扫描需求【E2E, P1】
- REQ-003 创建/忽略需求【E2E, P1】
- REQ-004 状态筛选与空态【E2E, P1】
- REQ-ERR-001 枚举/长度校验与错误码映射【API+E2E, P1】

### 6. 任务与质检（TASK）
- TASK-001 质检概览与空态【E2E, P1】
- TASK-002 指令派发与日志记录【E2E, P1】
- TASK-003 空指令校验【E2E, P1】
- TASK-004 派发失败保留输入【E2E, P1】
- TASK-INT-001 集成质检流程（对话关闭触发质检报告）【集成, P0】

### 7. 知识库管理（KB）
- KB-001 分类树加载与切换【E2E, P1】
- KB-002 新建/删除分类与迁移【E2E, P1】
- KB-003 文档上传/进度/重试/删除【E2E, P1】
- KB-004 文档搜索/排序/筛选【E2E, P1】
- KB-005 FAQ 创建与相似问题【E2E, P1】
- KB-006 权限不足处理【E2E, P1】
- KB-ERR-001 文件类型/大小/校验与错误码映射【API+E2E, P1】

### 8. 知识应用（KBU）
- KBU-001 搜索与结果预览【E2E, P1】
- KBU-002 复制内容提示【E2E, P1】
- KBU-003 空结果与清空【E2E, P1】
- KBU-ERR-001 搜索校验与错误码映射【API+E2E, P1】

### 9. AI 辅助（AI）
- AI-001 面板加载与切换对话刷新【E2E, P1】
- AI-002 采纳建议写入输入框【E2E, P1】
- AI-003 子区域切换展示【E2E, P1】
- AI-004 情绪分析同步列表【E2E, P1】
- AI-ERR-001 分析上下文/模型枚举/错误码【API+E2E, P1】

### 10. 工具箱（TOOL）
- TOOL-001 服务状态监控弹窗与告警处理【E2E, P2】
- TOOL-002 生成报告展示审计汇总【E2E, P2】
- TOOL-003 诊断/日志/会话弹窗【E2E, P2】
- TOOL-ERR-001 告警级别枚举与错误码映射【API+E2E, P2】

### 11. 报表（REPORT）
- REPORT-001 图表渲染与切换不串页【E2E, P2】
- REPORT-002 图表空数据提示【E2E, P2】

### 12. 审计与监控（AUDIT）
- AUDIT-001 写操作生成审计【集成, P2】
- AUDIT-002 告警创建与处理【API, P2】
- AUDIT-003 审计 action/resource 校验【API, P2】

### 13. 健康检查（HEALTH）
- HEALTH-001 /health 返回 healthy【API, P2】
- HEALTH-002 /metrics Content-Type=text/plain【API, P2】

### 14. 权限面板（PERM）
- PERM-001 成员/角色加载与搜索【E2E, P1】
- PERM-002 权限勾选与保存【E2E, P1】
- PERM-003 成员/角色增删改【E2E, P1】
- PERM-004 系统角色不可删除【E2E, P1】


### 16. 运行时配置（RUNTIME）
- RUNTIME-001 runtime-config 覆盖 API 地址【集成, P1】
- RUNTIME-002 代理转发生效【集成, P1】
- RUNTIME-003 缺省配置提示【E2E, P1】

### 17. 可靠性与异常处理（REL）
- REL-001 超时与重试（408/504）【可靠性, P0】
- REL-002 断网降级提示【可靠性, P0】
- REL-003 429 限流提示【可靠性, P1】
- REL-004 JSON 解析异常提示【可靠性, P1】

### 18. 实时通信与 SSE（SSE）
- SSE-001 建连与断线重连【集成, P0】
- SSE-002 ReviewRequest 推送到前端【集成, P0】
- SSE-003 消息实时推送【集成, P1】
- SSE-004 失败降级为轮询【集成, P1】
- SSE-005 心跳保活与多标签页连接【集成, P1】

### 19. Agent 协同与智能辅助（AGENT）
- AGENT-001 Orchestrator 路由决策【集成, P0】
- AGENT-002 Assistant 建议与引用【集成, P0】
- AGENT-003 Engineer 诊断与工单【集成, P1】
- AGENT-004 Inspector 质检报告生成【集成, P1】
- AGENT-005 降级策略与日志【可靠性, P0】
- AGENT-006 MCP 工具调用失败提示【集成, P1】

### 20. 问题并行管理（PROB）
- PROB-001 多问题识别与创建【集成, P0】
- PROB-002 状态流转流程【E2E, P0】
- PROB-003 问题与工单关联【集成, P0】
- PROB-004 并行展示与筛选【E2E, P0】
- PROB-005 解决触发质检【集成, P1】

### 21. 事件溯源与一致性（ES）
- ES-001 写入 domain_events + outbox_events【集成, P1】
- ES-002 Outbox 投递与重试【集成, P1】
- ES-003 事件一致性校验【集成, P1】
- ES-004 事件回溯与重放能力【集成, P2】

### 22. 性能与负载（PERF）
- PERF-001 首屏与关键交互（Lighthouse）【性能, P0】
- PERF-002 大数据量加载【性能, P1】
- PERF-003 内存与长连接【性能, P1】
- PERF-004 事件投递性能（EventBus）【性能, P1】

## 5. 自动化脚本与执行映射

### 已生成脚本（当前仓库）
- `tests/frontend/e2e/login.spec.js`
- `tests/frontend/e2e/login-validation.spec.js`
- `tests/frontend/e2e/app-auth.spec.js`
- `tests/frontend/e2e/dock-navigation.spec.js`
- `tests/frontend/e2e/workspace-navigation.spec.js`
- `tests/frontend/e2e/conversations.spec.js`
- `tests/frontend/e2e/permissions.spec.js`
- `tests/frontend/e2e/knowledge.spec.js`
- `tests/frontend/e2e/knowledge-management.spec.js`
- `tests/frontend/e2e/knowledge-apply.spec.js`
- `tests/frontend/e2e/profile.spec.js`
- `tests/frontend/e2e/requirements.spec.js`
- `tests/frontend/e2e/tasks.spec.js`
- `tests/frontend/e2e/ai-panel.spec.js`
- `tests/frontend/e2e/tools.spec.js`
- `tests/frontend/e2e/reports.spec.js`
- `tests/frontend/e2e/permission-panel.spec.js`
- `tests/frontend/e2e/runtime-config.spec.js`
- `tests/frontend/e2e/reliability.spec.js`
- `tests/frontend/e2e/api/health.spec.js`
- `tests/frontend/e2e/api/audit.spec.js`
- `tests/frontend/e2e/integration/sse.spec.js`
- `tests/frontend/e2e/integration/agents.spec.js`
- `tests/frontend/e2e/integration/problems.spec.js`
- `tests/frontend/e2e/integration/events.spec.js`
- `tests/frontend/e2e/performance/performance.spec.js`
- `tests/system/test-quality-inspection.sh`
- `tests/backend/unit/wecom/WecomMockData.unit.spec.ts`（WeCom 接入文档契约校验）
- `tests/backend/unit/presentation/http/rbacMiddleware.spec.ts`（RBAC 403 校验）

## 6. 执行结果记录（模板）
- 日期：YYYY-MM-DD
- E2E：通过/失败（失败用例列表）
- API：通过/失败（失败用例列表）
- 集成：通过/失败（失败用例列表）
- 性能：通过/失败（指标统计）
- 备注：

## 7. 对齐与追溯
- 与 `tests/WEB_APP_TEST_CASES.md` 逐章对应，覆盖 P0/P1/P2 全部功能点。
- 覆盖矩阵对应的脚本已落地，可直接执行全量自动化测试。
