# 测试用例库

> **文档版本**: v1.1
> **更新日期**: 2026-01-27

---

## 1. 用例说明与来源

本文件提供测试用例索引与自动化覆盖清单，详细步骤与断言请参见：

- `tests/WEB_APP_TEST_CASES.md`（Web端详细可执行用例）
- `tests/AUTOMATION_TEST_CASES.md`（自动化覆盖矩阵）
- `tests/backend/*.md`（接口/事件格式说明）

---

## 2. 功能模块用例清单（索引）

### 2.1 会话与消息
- 创建会话、查询会话、关闭会话
- 发送消息、消息回放、异常输入处理
- SSE/实时通信（如适用）

### 2.2 需求管理
- 创建需求、状态流转、权限校验
- 需求列表筛选、分页、导出

### 2.3 任务管理
- 创建任务、分配、完成、关闭
- 任务并发更新（乐观锁）

### 2.4 质检与审计
- 质检报告生成与查询
- 审计事件记录与查询

### 2.5 知识库与知识应用
- 知识条目 CRUD
- 搜索与推荐
- 文档上传/重试/删除

### 2.6 权限与角色
- RBAC 权限显示与接口一致性
- 权限变更即时生效

---

## 3. 自动化覆盖清单（按目录）

### 3.1 前端E2E（Playwright）

- 入口与导航：`tests/frontend/e2e/dock-navigation.spec.js`、`workspace-navigation.spec.js`
- 登录与权限：`login.spec.js`、`login-validation.spec.js`、`permissions.spec.js`、`permission-panel.spec.js`
- 会话与消息：`conversations.spec.js`、`profile.spec.js`
- 需求/任务/质检：`requirements.spec.js`、`tasks.spec.js`
- 知识库/知识应用：`knowledge.spec.js`、`knowledge-management.spec.js`、`knowledge-apply.spec.js`
- AI 面板：`ai-panel.spec.js`
- 报表与工具：`reports.spec.js`、`tools.spec.js`
- 可靠性：`reliability.spec.js`
- 集成类用例：`tests/frontend/e2e/integration/*.spec.js`
- 性能基线：`tests/frontend/e2e/performance/performance.spec.js`

### 3.2 后端集成测试（Vitest）

- Use Cases：`tests/backend/integration/use-cases/*.spec.ts`
- Repository：`tests/backend/integration/repositories/*.spec.ts`
- 并发控制：`tests/backend/integration/concurrency/*.spec.ts`
- Agent协同：`tests/backend/integration/agent-collaboration/*.spec.ts`

### 3.3 后端E2E测试（Vitest）

- 关键业务流：`tests/backend/e2e/business-flows/*.spec.ts`
- 模块E2E：`tests/backend/e2e/*.spec.ts`

### 3.4 系统集成脚本

- 质检流程：`tests/system/test-quality-inspection.sh`

### 3.5 单元测试

- `tests/backend/unit/` 当前为空（待补充）

---

## 4. 通用校验用例

- 必填字段缺失
- 枚举值非法
- 权限不足（401/403）
- 并发更新冲突（409）
- 网络异常与超时

---

## 5. 接口回归检查

> 以 `backend/src/app.ts` 注册的 `/api/v1` 路由为基准。

- Auth
- Session
- Permission
- Audit
- Monitoring
- Conversations
- Customers
- Requirements
- Tasks
- Knowledge
- AI
- IM

---

**维护团队**: QA
