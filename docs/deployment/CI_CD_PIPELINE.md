# CI/CD 流水线说明

> **CI 文件**: `.github/workflows/ci.yml`
> **适用范围**: backend + agentscope-service

---

## 1. 触发条件

- `main` 分支 push
- `main` 分支 PR

---

## 2. Backend 作业

### 2.1 依赖服务

CI 使用 GitHub Actions Service 启动依赖：

- PostgreSQL 15 (端口 5432)
- Redis 7 (端口 6379，密码 `redis123`)

### 2.2 环境变量

```
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=aftersales_test
TEST_DB_USER=admin
TEST_DB_PASSWORD=admin123
DATABASE_URL=postgresql://admin:admin123@localhost:5432/aftersales_test
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123
REDIS_DB=1
```

### 2.3 执行步骤

- 安装依赖：`npm ci`
- Lint：`npm run lint`
- 单元测试：`npm run test:unit`
- 集成测试：`npm run test:integration`
- E2E 测试：`npm run test:e2e`
- 构建：`npm run build`

---

## 3. AgentScope Service 作业

### 3.1 环境变量

```
ENVIRONMENT=test
AI_SERVICE_API_KEY=test-api-key
DEEPSEEK_BASE_URL=https://api.test.com
BACKEND_MCP_URL=http://localhost:3000
AGENTSCOPE_PREFETCH_ENABLED=false
```

### 3.2 执行步骤

- 安装依赖：`pip install -e ".[dev]"`
- 格式检查：`ruff format --check .`
- Lint：`ruff check .`
- 类型检查：`mypy src/`
- 测试：`pytest`
- 覆盖率上报：`codecov` (如配置)

---

## 4. 后续扩展建议

- 增加前端构建与静态检查
- 增加数据库迁移校验（`npm run migration:run`）
- 增加镜像构建与部署阶段（CD）

---

**维护者**: DevOps 团队
**最后更新**: 2026-01-27
