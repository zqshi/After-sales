# 测试策略文档 (Test Strategy)

> **文档版本**: v1.1
> **创建日期**: 2025-12-30
> **维护团队**: QA团队
> **适用版本**: v0.5+ (基础测试) → v1.0 (完整测试体系)
> **最后更新**: 2026-01-27

---

## 📋 目录

- [1. 测试策略概览](#1-测试策略概览)
- [2. 测试分层与目标](#2-测试分层与目标)
- [3. 测试环境与数据](#3-测试环境与数据)
- [4. 覆盖率与质量门槛](#4-覆盖率与质量门槛)
- [5. 执行顺序与门禁](#5-执行顺序与门禁)
- [6. 责任分工与输出](#6-责任分工与输出)

---

## 1. 测试策略概览

### 1.1 测试金字塔

```
         ┌────────────┐
         │  E2E测试   │  慢、脆弱、昂贵
         │   (UI)     │
      ┌──┴────────────┴──┐
      │   集成测试        │  中速、组件交互
      │  (API/Service)   │
   ┌──┴──────────────────┴──┐
   │     单元测试            │  快、稳定、廉价
   │  (函数/类/模块)         │
   └────────────────────────┘
```

### 1.2 策略原则

- **以现有实现为准**：测试覆盖基于 `tests/` 目录实际用例与脚本
- **先集成后E2E**：服务联通性与核心流程优先
- **最少可验证**：关键场景以可断言的 API / UI 输出为准

---

## 2. 测试分层与目标

| 类型 | 框架/工具 | 位置 | 当前状态 | 目标 |
|------|-----------|------|----------|------|
| 单元测试 | Vitest | `tests/backend/unit/` | 待补充 | 组件级逻辑验证 |
| 集成测试 | Vitest | `tests/backend/integration/` | 已实现 | 核心用例与仓储层验证 |
| 后端E2E | Vitest | `tests/backend/e2e/` | 已实现 | 关键业务流端到端 |
| 前端E2E | Playwright | `tests/frontend/e2e/` | 已实现 | UI 关键路径验证 |
| 系统集成 | Bash | `tests/system/` | 已实现 | 多服务联动验证 |
| 性能测试 | Playwright / k6 | `tests/frontend/e2e/performance/` | 已实现基线 | 首屏/交互基线 |
| 安全测试 | ZAP / Burp | 手工/工具 | 计划中 | 基础安全覆盖 |

---

## 3. 测试环境与数据

### 3.1 后端测试环境

- **配置文件**: `backend/.env.test`
- **测试DB**: `aftersales_test`（PostgreSQL）
- **Redis**: `REDIS_DB=1`
- **环境初始化**: `tests/backend/setup.ts`
  - 测试前自动建表（`synchronize: true`）
  - 测试后自动清理表与 Redis
- **跳过初始化**: `SKIP_TEST_ENV_SETUP=true`（适用于纯Mock/无需DB场景）

### 3.2 前端E2E环境

- **Base URL**: `E2E_BASE_URL`（默认 `http://localhost:5173`）
- **API URL**: `E2E_API_BASE_URL`（默认 `http://localhost:8080`）
- **Agent URL**: `E2E_AGENT_BASE_URL`（默认 `http://localhost:5000`）
- **是否启动Web Server**: `E2E_NO_WEB_SERVER=true`（仅连接已启动服务）

### 3.3 测试数据来源

- **账号种子**: `backend/scripts/seed-demo-user.sql`
- **测试DB初始化**: `backend/scripts/setup-test-db.sh`
- **数据工厂**: `tests/backend/helpers.ts`

详情参见：[测试数据准备](./TEST_DATA.md)

---

## 4. 覆盖率与质量门槛

### 4.1 覆盖率基线（后端）

来自 `backend/vitest.config.ts`：

- **branches/functions/lines/statements** ≥ 80%
- 覆盖报告输出：`coverage/`
- 排除目录：`tests/backend/`、`dist/`、`migrations/` 等

### 4.2 质量门槛（建议）

- P0 场景必须通过
- CI 阶段无阻断级别缺陷
- 关键路径 E2E 不允许回归

---

## 5. 执行顺序与门禁

推荐执行顺序：

1. **后端集成测试**（`backend` 内）
2. **后端E2E测试**（关键业务流）
3. **前端E2E测试**（Playwright）
4. **系统集成脚本**（质检流程）

门禁规则（CI建议）：

- `backend npm run test:integration` 必须通过
- `backend npm run test:e2e` 必须通过
- `npm run test:e2e` 关键用例必须通过

---

## 6. 责任分工与输出

- **QA**：用例维护、自动化回归、缺陷跟踪
- **研发**：单元/集成测试编写与维护
- **输出产物**：
  - 测试报告（Playwright / Vitest）
  - 覆盖率报告（Vitest）
  - 缺陷单（Bug模板）

---

**文档维护者**: QA团队
