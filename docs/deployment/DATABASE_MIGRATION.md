# 数据库迁移指南 (TypeORM)

> **适用范围**: backend (Fastify + TypeORM)
> **迁移目录**: `backend/src/infrastructure/database/migrations`
> **数据源**: `backend/src/infrastructure/database/data-source.ts`

---

## 1. 前置条件

- 已配置后端环境变量（`.env`）
- PostgreSQL 已启动并可连接

推荐的最小配置：
```
DATABASE_URL=postgresql://admin:admin123@localhost:5432/aftersales
```

---

## 2. 运行已有迁移

在后端目录执行：

```bash
cd backend
npm run migration:run
```

如需在 Docker Compose 环境内执行：

```bash
docker compose exec backend npm run migration:run
```

---

## 3. 回滚迁移

```bash
cd backend
npm run migration:revert
```

---

## 4. 生成新迁移

> 生成迁移前确保实体已更新且数据库连接指向目标环境。

```bash
cd backend
npm run migration:generate -- -n AddNewFeature
```

生成文件会出现在 `backend/src/infrastructure/database/migrations`。

---

## 5. 本地开发建议

- **测试库**：CI 使用 `aftersales_test`，本地集成测试建议使用同名数据库。
- **初始化策略**：Docker Compose 会挂载 `migrations/` 到 `docker-entrypoint-initdb.d`，仅在数据库首次初始化时执行。
- **版本一致性**：推荐以 TypeORM 迁移为唯一准入，避免 SQL 初始化脚本与迁移并行演进导致偏差。

---

## 6. 常见问题

### 6.1 迁移命令报错：无法加载 TS/ESM

可用 `tsx` 运行 TypeORM CLI：

```bash
cd backend
./node_modules/.bin/tsx ./node_modules/typeorm/cli.js migration:run -d src/infrastructure/database/data-source.ts
```

### 6.2 迁移执行成功但无效果

请确认数据库连接与目标环境一致，且数据库不是首次启动（首次启动会走 `docker-entrypoint-initdb.d`）。

---

**维护者**: DevOps / 后端团队
**最后更新**: 2026-01-27
