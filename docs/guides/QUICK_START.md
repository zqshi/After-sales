# 智能售后工作台 - 快速启动指南

> **项目状态**: Phase 1 基础设施已完成 ✅
> **当前版本**: v0.1.0
> **架构**: DDD + TDD
> **技术栈**: TypeScript + Fastify + PostgreSQL + Redis

---

## 🎯 项目概述

智能售后工作台是一个企业级售后管理平台，采用领域驱动设计（DDD）和测试驱动开发（TDD）范式，提供：

- 多渠道对话管理
- 智能客户画像
- 需求自动采集
- 任务质检管理
- AI辅助决策

---

## 📦 已完成的工作（Phase 1）

### ✅ 后端项目初始化
- TypeScript + Fastify 项目结构
- DDD 分层架构目录
- 核心基础类（AggregateRoot、Entity、ValueObject、DomainEvent）
- 配置管理（app.config.ts）

### ✅ 数据库设计
- 6张核心表设计完成
- TypeORM 实体类
- 数据库迁移脚本（001-init-database.sql）
- 测试数据

### ✅ Docker 环境
- docker-compose.yml（7个服务）
- Dockerfile（多阶段构建）
- 开发/生产环境配置
- 监控服务（Prometheus + Grafana）
- AgentScope FastAPI 服务与 MCP/事件桥接容器

### ✅ CI/CD 流程
- GitHub Actions 配置
- 8个自动化流程（Lint、测试、构建、部署）
- 质量门禁
- 自动化镜像构建

### ✅ 测试基础设施
- Vitest 配置
- 测试环境设置（setup.ts）
- 测试数据工厂（helpers.ts）
- 单元/集成/E2E 测试结构

---

## 🚀 快速启动（Docker）

### Docker 一键启动（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd After-sales

# 2. 配置 Docker 镜像加速器（首次使用，强烈推荐）
# macOS/Docker Desktop: 打开 Docker Desktop → Settings → Docker Engine
# 添加镜像加速器配置（详见 docs/DOCKER_GUIDE.md）
# 或运行自动配置脚本：
./scripts/setup-docker-mirror.sh

# 3. 拉取所有镜像（可选，但推荐）
./scripts/pull-docker-images.sh
# 或手动拉取：
# docker-compose pull

# 4. 启动所有服务
docker compose up -d --build

# 5. 等待服务就绪
docker compose logs -f backend

# 6. 访问服务
# 前端: http://localhost:3000
# 后端: http://localhost:8080
# Grafana: http://localhost:3001
# AgentScope FastAPI: http://localhost:5000/health
```

### Workflow 与 Prefetch（可选）

默认开启 Workflow（可手动关闭）：
```
WORKFLOW_ENGINE_ENABLED=true
WORKFLOW_ENGINE_MODE=full
```

AgentScope 侧可选启用 MCP 预取（会把上下文注入提示词）：
```
AGENTSCOPE_PREFETCH_ENABLED=false
```

**遇到镜像拉取问题？** 查看 [Docker 故障排查指南](docs/DOCKER_GUIDE.md#拉取镜像故障排查)

---

## 📋 核心命令速查

### Docker 操作

```bash
docker compose up -d --build           # 启动所有服务
docker compose down                    # 停止所有服务
docker compose logs -f backend         # 查看后端日志
docker compose exec backend sh         # 进入后端容器
docker compose exec postgres psql -U admin -d aftersales  # 进入数据库
```

### 拉取镜像故障排查

如果 `docker compose pull` 或 `docker compose up -d` 报 `Get "https://registry-1.docker.io/v2/": EOF`，说明 Docker Hub 镜像暂时不可用：

- 重试 `docker compose pull` 或尝试逐个 `docker pull prom/prometheus:latest` 等。
- 检查本地网络/代理，必要时设置 `DOCKER_BUILDKIT=0`。
- 只要能成功拉取 `prom/prometheus`, `grafana/grafana`, `postgres:15-alpine`, `redis:7-alpine`，就可以重新运行 `docker compose up -d`。
- 如果构建过程中提示访问 `docker.mirrors.ustc.edu.cn` 但无法解析（如 `lookup docker.mirrors.ustc.edu.cn: no such host`），说明 Docker Desktop 正在使用不可用的镜像加速器或代理：
  - 打开 Docker Desktop → Settings → Docker Engine，检查 `registry-mirrors` 配置，移除或替换为能解析的镜像源。
  - 如果使用了系统代理，确保 Docker Desktop 的代理设置（Settings → Resources → Proxies）与本地网络一致或设置成 “No proxy”。
- 重新运行 `docker pull node:18-alpine`/`docker compose pull` 确认元数据读取成功。

---

## 📁 项目结构

```
After-sales/
├── backend/                     # 后端服务（DDD架构）
│   ├── src/
│   │   ├── domain/              # 领域层
│   │   │   ├── shared/          # DDD基础类 ✅
│   │   │   ├── conversation/    # 对话上下文 🔄
│   │   │   ├── customer/        # 客户上下文 ⏳
│   │   │   ├── requirement/     # 需求上下文 ⏳
│   │   │   ├── task/            # 任务上下文 ⏳
│   │   │   └── knowledge/       # 知识库上下文 ⏳
│   │   ├── application/         # 应用层
│   │   ├── infrastructure/      # 基础设施层
│   │   │   ├── database/        # 数据库 ✅
│   │   │   │   ├── entities/    # TypeORM实体 ✅
│   │   │   │   └── migrations/  # 迁移脚本 ✅
│   │   │   ├── repositories/    # 仓储实现 ⏳
│   │   │   ├── cache/           # Redis缓存 ⏳
│   │   │   └── events/          # 事件总线 ⏳
│   │   ├── presentation/        # 表示层
│   │   ├── config/              # 配置 ✅
│   │   └── server.ts            # 入口文件 ⏳
│   ├── tests/                   # 测试 ✅
│   │   ├── setup.ts             # 测试设置 ✅
│   │   ├── helpers.ts           # 测试工具 ✅
│   │   ├── unit/                # 单元测试
│   │   ├── integration/         # 集成测试
│   │   └── e2e/                 # E2E测试
│   ├── Dockerfile               # Docker配置 ✅
│   └── package.json             # 依赖配置 ✅
│
├── assets/                      # 前端资源
│   └── js/                      # 已有的前端代码
│
├── docs/                        # 项目文档
│   ├── PRODUCTION_READINESS_PLAN.md    # 落地计划 ✅
│   ├── DOCKER_GUIDE.md                 # Docker指南 ✅
│   ├── API_DESIGN.md                   # API设计 ✅
│   └── architecture/                   # 架构文档 ✅
│
├── .github/
│   └── workflows/
│       └── ci.yml               # CI/CD配置 ✅
│
├── docker-compose.yml           # Docker Compose ✅
├── IMPLEMENTATION_PROGRESS.md   # 进度跟踪 ✅
├── QUICK_START.md               # 本文档 ✅
└── README.md                    # 项目说明 ✅

✅ 已完成  🔄 进行中  ⏳ 待开始
```

---

## 📚 核心文档导航

### 必读文档
1. **[生产就绪落地计划](./docs/PRODUCTION_READINESS_PLAN.md)** - 完整的20周实施计划
2. **[实施进度跟踪](./IMPLEMENTATION_PROGRESS.md)** - 当前进度和下一步计划
3. **[后端README](./backend/README.md)** - 后端开发详细说明

### 架构文档
- [API设计规范](./docs/API_DESIGN.md)
- [DDD战略设计](./docs/architecture/DDD_STRATEGIC_DESIGN.md)
- [分层架构设计](./docs/architecture/LAYERED_ARCHITECTURE.md)
- [领域事件设计](./docs/architecture/DOMAIN_EVENTS.md)

### 运维文档
- [Docker部署指南](./docs/DOCKER_GUIDE.md)
- [技术方案设计](./docs/TECHNICAL_SOLUTIONS.md)

---

## 🧪 测试策略

### 测试金字塔

```
        /\
       /  \       E2E Tests (10%)
      /----\      - 关键用户流程
     /      \     - Playwright
    /--------\
   /          \   Integration Tests (20%)
  /------------\  - API + Database
 /              \ - Repository + Service
/________________\
                  Unit Tests (70%)
                  - Domain Models
                  - Domain Services
                  - Value Objects
```

### 当前测试状态

- **单元测试**: 0 个测试（待编写）
- **集成测试**: 0 个测试（待编写）
- **E2E测试**: 0 个测试（待编写）
- **测试覆盖率**: 0% (目标: >80%)

### TDD 工作流程

```
1. 红灯（Red）   → 先写测试，测试失败
2. 绿灯（Green） → 实现功能，测试通过
3. 重构（Refactor）→ 优化代码，保持测试通过
```

---

## 🎯 下一步计划（Phase 2）

### Week 3-5: Conversation 对话上下文

#### Task 6: Conversation 领域模型 TDD实现
```bash
# 1. 编写测试
cd backend
# 创建 tests/unit/domain/conversation/Conversation.spec.ts

# 2. 运行测试（应该失败）
npm run test:unit

# 3. 实现代码
# 创建 src/domain/conversation/models/Conversation.ts

# 4. 再次运行测试（应该通过）
npm run test:unit
```

#### Task 7: Conversation Repository 集成测试
```bash
# 创建 tests/integration/repositories/ConversationRepository.spec.ts
# 实现 src/infrastructure/repositories/ConversationRepository.ts
```

#### Task 8: Conversation API E2E测试
```bash
# 创建 tests/e2e/api/conversation.spec.ts
# 实现 src/presentation/http/controllers/ConversationController.ts
```

---

## ⚙️ 配置说明

### 环境变量

复制 `backend/.env.example` 到 `backend/.env` 并配置：

```bash
# 应用配置
NODE_ENV=development
PORT=8080
LOG_LEVEL=debug

# 数据库
DATABASE_URL=postgresql://admin:admin123@localhost:5432/aftersales

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
```

### 端口映射

| 服务 | 容器端口 | 主机端口 | 说明 |
|------|----------|----------|------|
| 前端 | 3000 | 3000 | Vite开发服务器 |
| 后端 | 8080 | 8080 | Fastify API服务器 |
| PostgreSQL | 5432 | 5432 | 数据库 |
| Redis | 6379 | 6379 | 缓存/消息队列 |
| Prometheus | 9090 | 9090 | 监控指标 |
| Grafana | 3000 | 3001 | 可视化面板 |
| AgentScope | 5000 | 5000 | FastAPI AgentScope 服务 |

---

## 🐛 故障排查

### 问题 1: 端口被占用

```bash
# 查看端口占用
lsof -i :8080

# 修改端口（docker-compose.yml）
ports:
  - "新端口:8080"
```

### 问题 2: 数据库连接失败

```bash
# 检查数据库是否运行
docker-compose ps postgres

# 查看数据库日志
docker-compose logs postgres

# 重启数据库
docker-compose restart postgres
```

### 问题 3: 依赖安装失败

```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 或使用 Docker
docker-compose build --no-cache backend
```

---

## 📞 获取帮助

- **Issue**: [GitHub Issues](https://github.com/your-org/after-sales/issues)
- **文档**: 查看 `docs/` 目录
- **邮件**: support@yourcompany.com

---

## 📊 项目进度

```
Phase 1: 基础设施搭建           [██████████] 100% ✅
Phase 2: 对话上下文实现         [░░░░░░░░░░]   0% ⏳
Phase 3: 客户上下文实现         [░░░░░░░░░░]   0% ⏳
Phase 4: 需求上下文实现         [░░░░░░░░░░]   0% ⏳
Phase 5: 任务&质检上下文实现    [░░░░░░░░░░]   0% ⏳
Phase 6: 知识库&AI上下文实现    [░░░░░░░░░░]   0% ⏳
Phase 7: 监控&安全加固          [░░░░░░░░░░]   0% ⏳
Phase 8: 上线准备              [░░░░░░░░░░]   0% ⏳

总体进度: 12.5% (1/8 阶段完成)
预计完成: 19 周后
```

---

## 🤖 Multi-Agent功能演示

### Agent列表查询

```bash
# 查看所有可用Agent
curl http://localhost:5000/api/agents/list

# 预期输出
{
  "agents": [
    "AssistantAgent",
    "EngineerAgent",
    "InspectorAgent",
    "HumanAgent"
  ]
}
```

---

### 智能路由演示

**场景1: 简单咨询（Simple模式）**

```bash
curl -X POST http://localhost:5000/api/orchestrator/route \
  -H "Content-Type: application/json" \
  -d '{
    "message": "开票功能怎么用？",
    "conversation_id": "conv-001",
    "customer_id": "customer-001"
  }'

# Agent选择: AssistantAgent
# 执行模式: simple
# 响应时间: ~3秒
```

**场景2: 故障诊断（Parallel模式）**

```bash
curl -X POST http://localhost:5000/api/orchestrator/route \
  -H "Content-Type: application/json" \
  -d '{
    "message": "系统报500错误，无法登录",
    "conversation_id": "conv-002",
    "customer_id": "customer-002"
  }'

# Agent选择: AssistantAgent + EngineerAgent（并行执行）
# 执行模式: parallel
# 响应时间: ~15秒
# 返回: 情感分析 + 故障诊断 + 技术方案
```

---

### 质检功能演示

**触发质检**：

```bash
# 1. 创建对话并发送消息（通过Backend API）
# 2. 关闭对话（自动触发质检）

# 3. 查询质检报告
curl http://localhost:8080/api/quality-reports/conv-001

# 预期输出
{
  "success": true,
  "report": {
    "quality_score": 85,
    "dimensions": {
      "completeness": 90,
      "professionalism": 85,
      "compliance": 90,
      "tone": 75
    },
    "customer_satisfaction_prediction": 4.2,
    "need_follow_up": false
  }
}
```

**运行集成测试**：

```bash
# 完整的质检流程测试
./tests/integration/test-quality-inspection.sh

# 输出:
# ✓ Backend服务检查通过
# ✓ AgentScope服务检查通过
# ✓ 创建测试对话
# ✓ 关闭对话 (耗时: 320ms)
# ✓ 质检已完成，质量分: 78
# ✓ 质检集成测试全部通过
```

---

## 🎉 恭喜！

**Phase 1 & 2 已完成！** 现在您可以：

1. ✅ 使用 Multi-Agent 智能客服系统
2. ✅ 体验并行执行和智能路由
3. ✅ 自动质检对话质量
4. ✅ 使用 Docker 一键启动整个开发环境
5. ✅ 利用 CI/CD 自动化测试和部署

**了解更多**：
- [Multi-Agent架构设计](../architecture/AGENT_ARCHITECTURE_DESIGN.md)
- [Phase 1实施报告](../implementation/PHASE_1_AGENTS_IMPLEMENTATION.md)
- [Phase 2实施报告](../implementation/PHASE_2_QUALITY_INSPECTION.md)
- [API文档](../api/API_REFERENCE.md)

**开始体验Multi-Agent智能客服吧！** 🚀

---

**最后更新**: 2025-12-27
**维护者**: After-Sales开发团队
