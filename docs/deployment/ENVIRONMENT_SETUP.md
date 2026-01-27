# 环境配置指南

> **文档版本**: v2.0
> **更新日期**: 2026-01-27
> **适用实现**: Fastify (backend) + agentscope-service (FastAPI)

---

## 1. 概览

当前仓库以 Docker Compose 为标准运行方式，配置以 `docker-compose.yml` 与 `backend/.env.example` 为准。

---

## 2. 后端环境变量（backend/.env）

示例（最小可运行）：

```
DATABASE_URL=postgresql://admin:admin123@localhost:5432/aftersales
REDIS_URL=redis://:redis123@localhost:6379
JWT_SECRET=change-me-in-production
AGENTSCOPE_URL=http://localhost:5000
WORKFLOW_ENGINE_ENABLED=true
WORKFLOW_ENGINE_MODE=full
```

---

## 3. AgentScope 环境变量

根据 `agentscope-service/src/config/settings.py`：

```
NODE_BACKEND_URL=http://localhost:8080
BACKEND_EVENT_BRIDGE_PATH=/agentscope/events
BACKEND_EVENT_BRIDGE_TIMEOUT=10
AGENTSCOPE_MCP_ENABLED=true
AGENTSCOPE_MCP_TRANSPORT=streamable_http
AGENTSCOPE_PREFETCH_ENABLED=false
```

---

## 4. Docker Compose 模式

```bash
# 启动依赖

docker compose up -d postgres redis

# 启动全部服务

docker compose up -d --build
```

---

## 5. 本地开发模式（非容器）

1) 启动数据库与 Redis
2) 后端：`cd backend && npm run dev`
3) AgentScope：`cd agentscope-service && uvicorn src.api.main:app --reload --port 5000`
4) 前端：`npm run dev`

---

## 📞 相关文档

- [部署指南](./DEPLOYMENT_GUIDE.md)
- [数据库迁移](./DATABASE_MIGRATION.md)
- [CI/CD流水线](./CI_CD_PIPELINE.md)
- [故障排查指南](../operations/TROUBLESHOOTING_GUIDE.md)

---

**维护团队**: DevOps
