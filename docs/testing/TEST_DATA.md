# 测试数据准备

> **文档版本**: v1.1
> **更新日期**: 2026-01-27

---

## 1. 基础数据（仓库实际）

- 用户账号（种子）：
  - `demo@aftersales.io` / `Demo@1234`
  - `admin@kingsoft.com` / `Admin123456`
  - 来源：`backend/scripts/seed-demo-user.sql`
- 客户档案与标签
- 会话与消息样本
- 需求、任务、知识条目
- 事件数据：`domain_events` / `outbox_events`

> `tests/AUTOMATION_TEST_CASES.md` 中示例账号为 `test@example.com`，如需使用请补充种子或通过 API 创建。

---

## 2. 生成方式

- **DB初始化**：`backend/scripts/setup-test-db.sh`
- **账号种子**：`backend/scripts/seed-demo-user.sql`
- **数据工厂**：`tests/backend/helpers.ts`
- **API生成**：通过接口创建会话/需求/任务/知识

---

## 3. 环境变量（后端测试）

- `.env.test`：测试环境配置
- 关键项：
  - `TEST_DB_HOST/PORT/NAME/USER/PASSWORD`
  - `REDIS_HOST/PORT/PASSWORD/DB`
  - `AGENTSCOPE_URL`

---

## 4. 清理策略

- **自动清理**：`tests/backend/setup.ts` 在 `afterEach` 中清理表与 Redis
- **手工清理**：
  - `TRUNCATE` 表（含 `CASCADE`）
  - 或删除 `aftersales_test` 后重建

---

## 5. 目录与脚本索引

- `backend/scripts/setup-test-db.sh`
- `backend/scripts/seed-demo-user.sql`
- `tests/backend/helpers.ts`

---

**维护团队**: QA
