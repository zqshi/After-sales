# 智能售后工作台 - 生产就绪落地计划

> **版本**: v1.0
> **创建日期**: 2024-12-14
> **预计完成**: 20周（5个月）
> **设计理念**: DDD（领域驱动设计）+ TDD（测试驱动开发）

---

## 📋 目录

- [1. 核心技术栈](#1-核心技术栈)
- [2. 架构设计原则](#2-架构设计原则)
- [3. 开发范式](#3-开发范式)
- [4. 实施路线图](#4-实施路线图)
- [5. 详细执行计划](#5-详细执行计划)
- [6. 质量保障](#6-质量保障)
- [7. 部署策略](#7-部署策略)
- [8. 验收标准](#8-验收标准)

---

## 1. 核心技术栈

### 1.1 技术栈选型原则

**聚焦核心，减少维护成本**：
- ✅ 前后端统一语言（TypeScript）
- ✅ 统一测试框架（Vitest）
- ✅ 统一包管理器（npm）
- ✅ 最小化技术栈种类

### 1.2 最终技术栈

```
┌─────────────────────────────────────────────────────────┐
│                      前端层                              │
├─────────────────────────────────────────────────────────┤
│ 语言        │ TypeScript 5.x                            │
│ 框架        │ Vanilla TS (ES Modules)                   │
│ 构建        │ Vite 5.x                                  │
│ 样式        │ Tailwind CSS 3.x                          │
│ 测试        │ Vitest + Testing Library                  │
│ E2E         │ Playwright                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      后端层                              │
├─────────────────────────────────────────────────────────┤
│ 语言        │ TypeScript 5.x                            │
│ 运行时      │ Node.js 18+ LTS                           │
│ 框架        │ Fastify 4.x（高性能、TypeScript友好）      │
│ ORM         │ TypeORM 0.3.x（DDD支持良好）              │
│ 验证        │ Zod（类型安全）                            │
│ 测试        │ Vitest                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     数据存储                             │
├─────────────────────────────────────────────────────────┤
│ 主数据库    │ PostgreSQL 15.x                           │
│ 缓存        │ Redis 7.x                                 │
│ 消息队列    │ Redis Streams（统一技术栈）                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   DevOps & 基础设施                      │
├─────────────────────────────────────────────────────────┤
│ 容器化      │ Docker + Docker Compose                   │
│ CI/CD       │ GitHub Actions                            │
│ 监控        │ Prometheus + Grafana                      │
│ 日志        │ Winston + Loki                            │
│ 错误追踪    │ Sentry                                    │
└─────────────────────────────────────────────────────────┘
```

### 1.3 选型理由

| 技术 | 理由 |
|------|------|
| **TypeScript** | 前后端统一、类型安全、IDE支持好、维护成本低 |
| **Fastify** | 性能优秀（比Express快2倍）、TypeScript原生支持、插件生态好 |
| **TypeORM** | DDD友好、支持Repository模式、Active Record/Data Mapper双模式 |
| **Vitest** | 前后端统一测试框架、快速、Vite生态 |
| **PostgreSQL** | 成熟稳定、支持JSON、事务能力强、开源 |
| **Redis** | 缓存 + 消息队列统一技术栈、减少组件数量 |

---

## 2. 架构设计原则

### 2.1 DDD 分层架构

```
┌───────────────────────────────────────────────────────┐
│                 Presentation Layer                     │  展示层
│            (Controllers, DTOs, Validators)             │  - HTTP路由
│                                                        │  - DTO转换
└────────────────────────┬──────────────────────────────┘  - 请求验证
                         │
┌────────────────────────▼──────────────────────────────┐
│                 Application Layer                      │  应用层
│         (Use Cases, Application Services)              │  - 业务流程编排
│                                                        │  - 事务管理
└────────────────────────┬──────────────────────────────┘  - 权限检查
                         │
┌────────────────────────▼──────────────────────────────┐
│                   Domain Layer                         │  领域层
│   (Aggregates, Entities, Value Objects, Events,        │  - 核心业务逻辑
│              Domain Services)                          │  - 领域规则
│                                                        │  - 领域事件
└────────────────────────┬──────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────┐
│               Infrastructure Layer                     │  基础设施层
│  (Repositories, EventBus, ApiClient, Cache, DB)        │  - 数据持久化
│                                                        │  - 外部服务
└───────────────────────────────────────────────────────┘  - 技术实现
```

### 2.2 限界上下文划分

```
智能售后工作台
├── Conversation Context（对话上下文）
│   ├── Conversation（聚合根）
│   ├── Message（实体）
│   ├── Channel（值对象）
│   └── SLACalculatorService（领域服务）
│
├── Customer Context（客户上下文）
│   ├── CustomerProfile（聚合根）
│   ├── ContactInfo, SLAInfo, Metrics（值对象）
│   └── HealthScoreCalculator（领域服务）
│
├── Requirement Context（需求上下文）
│   ├── Requirement（聚合根）
│   ├── RequirementCategory（值对象）
│   └── RequirementDetector（领域服务）
│
├── Task Context（任务上下文）
│   ├── Task（聚合根）
│   ├── QualityScore（值对象）
│   └── TaskAssignmentService（领域服务）
│
└── Knowledge Context（知识库上下文）
    ├── KnowledgeItem（聚合根）
    └── KnowledgeRecommender（领域服务）
```

---

## 3. 开发范式

### 3.1 TDD 流程（红-绿-重构）

```
┌──────────────────────────────────────────────────────┐
│ 1. 红灯（Red）- 编写失败的测试                          │
│    - 先写单元测试                                      │
│    - 测试运行失败（红灯）                               │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│ 2. 绿灯（Green）- 编写最少代码使测试通过                 │
│    - 实现功能代码                                      │
│    - 测试运行成功（绿灯）                               │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│ 3. 重构（Refactor）- 优化代码                          │
│    - 消除重复                                          │
│    - 提高可读性                                        │
│    - 保持测试通过                                      │
└──────────────────────────────────────────────────────┘
```

### 3.2 TDD 最佳实践

#### 测试金字塔

```
        /\
       /  \       E2E Tests (10%)
      /----\      - 关键用户流程
     /      \     - Playwright
    /--------\
   /          \   Integration Tests (20%)
  /------------\  - API + DB
 /              \ - Repository + Service
/________________\
                  Unit Tests (70%)
                  - Domain Models
                  - Domain Services
                  - Value Objects
```

#### TDD 开发顺序

```
1. 领域模型单元测试
   └─> 聚合根、实体、值对象、领域服务

2. 仓储集成测试
   └─> Repository + Database

3. 应用服务集成测试
   └─> Use Cases + Domain + Repository

4. API 端到端测试
   └─> HTTP Request → Response
```

---

## 4. 实施路线图

### 4.1 总体时间表（20周）

```
Phase 1: 基础设施搭建（第 1-2 周）
├── 后端项目脚手架
├── 数据库设计
├── Docker环境
└── CI/CD基础

Phase 2: 对话上下文（第 3-5 周）
├── TDD：Conversation领域模型
├── TDD：对话相关API
├── 集成测试
└── E2E测试

Phase 3: 客户上下文（第 6-8 周）
├── TDD：CustomerProfile领域模型
├── TDD：客户画像API
├── 集成测试
└── E2E测试

Phase 4: 需求上下文（第 9-11 周）
├── TDD：Requirement领域模型
├── TDD：需求采集API
├── 集成测试
└── E2E测试

Phase 5: 任务&质检上下文（第 12-14 周）
├── TDD：Task领域模型
├── TDD：任务管理API
├── 集成测试
└── E2E测试

Phase 6: 知识库&AI上下文（第 15-16 周）
├── TDD：Knowledge领域模型
├── TDD：知识库API
├── AI服务集成
└── 测试

Phase 7: 监控&安全加固（第 17-18 周）
├── 监控系统部署
├── 安全测试
├── 性能优化
└── 压力测试

Phase 8: 上线准备（第 19-20 周）
├── 灰度发布
├── 生产环境部署
├── 应急演练
└── 文档完善
```

### 4.2 里程碑

| 里程碑 | 时间 | 验收标准 |
|--------|------|----------|
| **M1: 基础设施就绪** | 第2周末 | ✅ Docker环境运行<br>✅ CI/CD流水线通过<br>✅ 数据库迁移脚本可执行 |
| **M2: 对话功能完成** | 第5周末 | ✅ 测试覆盖率>80%<br>✅ API可用<br>✅ E2E测试通过 |
| **M3: 客户画像完成** | 第8周末 | ✅ 测试覆盖率>80%<br>✅ API可用<br>✅ E2E测试通过 |
| **M4: 需求采集完成** | 第11周末 | ✅ 测试覆盖率>80%<br>✅ API可用<br>✅ E2E测试通过 |
| **M5: 任务管理完成** | 第14周末 | ✅ 测试覆盖率>80%<br>✅ API可用<br>✅ E2E测试通过 |
| **M6: 知识库完成** | 第16周末 | ✅ 测试覆盖率>80%<br>✅ API可用<br>✅ E2E测试通过 |
| **M7: 性能达标** | 第18周末 | ✅ API P99 < 500ms<br>✅ 并发1000+<br>✅ 无内存泄漏 |
| **M8: 生产就绪** | 第20周末 | ✅ 所有测试通过<br>✅ 监控告警正常<br>✅ 安全审计通过 |

---

## 5. 详细执行计划

### 5.1 Phase 1: 基础设施搭建（第 1-2 周）

#### 第 1 周：项目脚手架 + 数据库设计

**Day 1-2: 后端项目初始化**

```bash
# 1. 创建后端项目目录
mkdir -p backend/{src,tests}
cd backend

# 2. 初始化 TypeScript 项目
npm init -y
npm install --save-dev typescript @types/node tsx vitest
npx tsc --init

# 3. 安装核心依赖
npm install fastify @fastify/cors @fastify/helmet
npm install typeorm pg redis ioredis
npm install zod dotenv winston

# 4. 安装开发依赖
npm install --save-dev @types/pg eslint prettier
npm install --save-dev @vitest/ui @faker-js/faker
```

**目录结构**：

```
backend/
├── src/
│   ├── domain/                      # 领域层
│   │   ├── conversation/
│   │   │   ├── models/
│   │   │   │   ├── Conversation.ts  # 聚合根
│   │   │   │   └── Message.ts       # 实体
│   │   │   ├── value-objects/
│   │   │   │   └── Channel.ts
│   │   │   ├── events/
│   │   │   │   └── MessageSentEvent.ts
│   │   │   ├── services/
│   │   │   │   └── SLACalculator.ts
│   │   │   └── repositories/
│   │   │       └── IConversationRepository.ts  # 接口
│   │   ├── customer/
│   │   ├── requirement/
│   │   └── task/
│   │
│   ├── application/                 # 应用层
│   │   ├── use-cases/
│   │   │   └── conversation/
│   │   │       ├── CreateConversationUseCase.ts
│   │   │       └── SendMessageUseCase.ts
│   │   └── dto/
│   │       └── ConversationDTO.ts
│   │
│   ├── infrastructure/              # 基础设施层
│   │   ├── database/
│   │   │   ├── entities/            # TypeORM实体
│   │   │   ├── migrations/
│   │   │   └── data-source.ts
│   │   ├── repositories/
│   │   │   └── ConversationRepository.ts  # 实现
│   │   ├── cache/
│   │   │   └── RedisCache.ts
│   │   ├── events/
│   │   │   └── RedisEventBus.ts
│   │   └── external/
│   │       └── FeishuApi.ts
│   │
│   ├── presentation/                # 表示层
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   │   └── ConversationController.ts
│   │   │   ├── routes/
│   │   │   │   └── conversation.routes.ts
│   │   │   └── middlewares/
│   │   │       ├── auth.middleware.ts
│   │   │       └── error.middleware.ts
│   │   └── validators/
│   │       └── conversation.validator.ts
│   │
│   ├── shared/                      # 共享代码
│   │   ├── types/
│   │   ├── utils/
│   │   └── constants/
│   │
│   ├── config/                      # 配置
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── app.config.ts
│   │
│   └── server.ts                    # 入口文件
│
├── tests/
│   ├── unit/                        # 单元测试
│   │   └── domain/
│   ├── integration/                 # 集成测试
│   │   └── repositories/
│   └── e2e/                         # E2E测试
│       └── api/
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── .env.example
├── .eslintrc.json
├── .prettierrc.json
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

**Day 3-4: 数据库设计**

创建数据库迁移脚本：

```sql
-- migrations/001_create_conversations.sql

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(50) NOT NULL,
    agent_id VARCHAR(50),
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    sla_status VARCHAR(20) DEFAULT 'normal',
    sla_deadline TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_conversations_customer ON conversations(customer_id);
CREATE INDEX idx_conversations_agent ON conversations(agent_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);

-- Messages表
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id VARCHAR(50) NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);

-- Customer Profiles表
CREATE TABLE customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    health_score INTEGER DEFAULT 0,
    contact_info JSONB DEFAULT '{}'::jsonb,
    sla_info JSONB DEFAULT '{}'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_profiles_customer_id ON customer_profiles(customer_id);

-- Requirements表
CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    source VARCHAR(50),
    created_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_requirements_conversation ON requirements(conversation_id);
CREATE INDEX idx_requirements_status ON requirements(status);

-- Tasks表
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assignee_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    quality_score INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Domain Events表（事件溯源）
CREATE TABLE domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL
);

CREATE INDEX idx_domain_events_aggregate ON domain_events(aggregate_id, version);
CREATE INDEX idx_domain_events_type ON domain_events(event_type);
```

**Day 5: Docker 环境配置**

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: aftersales-postgres
    environment:
      POSTGRES_DB: aftersales
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: aftersales-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # 后端服务
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: aftersales-backend
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://admin:admin123@postgres:5432/aftersales
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev

  # 前端服务
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: aftersales-frontend
    ports:
      - "3000:3000"
    volumes:
      - ./assets:/app/assets
      - ./index.html:/app/index.html
    command: npm run dev

  # Prometheus（监控）
  prometheus:
    image: prom/prometheus:latest
    container_name: aftersales-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  # Grafana（可视化）
  grafana:
    image: grafana/grafana:latest
    container_name: aftersales-grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    depends_on:
      - prometheus

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

#### 第 2 周：CI/CD 配置 + 测试基础

**Day 6-7: GitHub Actions 配置**

创建 `.github/workflows/ci.yml`：

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'

jobs:
  # 代码质量检查
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies (Frontend)
        run: npm ci

      - name: Install dependencies (Backend)
        working-directory: ./backend
        run: npm ci

      - name: Lint Frontend
        run: npm run lint

      - name: Lint Backend
        working-directory: ./backend
        run: npm run lint

      - name: Check Format
        run: npm run format:check

  # 单元测试
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies (Backend)
        working-directory: ./backend
        run: npm ci

      - name: Run Unit Tests
        working-directory: ./backend
        run: npm run test:unit

      - name: Generate Coverage Report
        working-directory: ./backend
        run: npm run test:coverage

      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/coverage-final.json
          flags: unittests
          fail_ci_if_error: true

  # 集成测试
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: aftersales_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test123
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 3s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run Migrations
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://test:test123@localhost:5432/aftersales_test
        run: npm run migration:run

      - name: Run Integration Tests
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://test:test123@localhost:5432/aftersales_test
          REDIS_URL: redis://localhost:6379
        run: npm run test:integration

  # 构建测试
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, unit-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install Frontend Dependencies
        run: npm ci

      - name: Build Frontend
        run: npm run build

      - name: Install Backend Dependencies
        working-directory: ./backend
        run: npm ci

      - name: Build Backend
        working-directory: ./backend
        run: npm run build

      - name: Upload Build Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            dist/
            backend/dist/

  # E2E 测试
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start Docker Compose
        run: docker-compose up -d

      - name: Wait for Services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:8080/health; do sleep 2; done'

      - name: Run E2E Tests
        run: npx playwright test

      - name: Upload Playwright Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  # 部署到 Staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [integration-tests, e2e-tests]
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4

      - name: Download Build Artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts

      - name: Deploy to Staging
        run: |
          echo "部署到 Staging 环境"
          # 实际部署命令

  # 部署到 Production
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [integration-tests, e2e-tests]
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://aftersales.example.com
    steps:
      - uses: actions/checkout@v4

      - name: Download Build Artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts

      - name: Deploy to Production
        run: |
          echo "部署到生产环境"
          # 实际部署命令
```

**Day 8-10: 测试基础设施**

创建 `backend/vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/dist/**',
        '**/*.config.ts',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    include: [
      'tests/unit/**/*.spec.ts',
      'tests/integration/**/*.spec.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@domain': path.resolve(__dirname, './src/domain'),
      '@application': path.resolve(__dirname, './src/application'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
    },
  },
});
```

创建 `backend/tests/setup.ts`：

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { AppDataSource } from '@infrastructure/database/data-source';
import { RedisCache } from '@infrastructure/cache/RedisCache';

// 测试数据库连接
let dataSource: typeof AppDataSource;
let redisCache: RedisCache;

beforeAll(async () => {
  // 初始化测试数据库
  dataSource = await AppDataSource.initialize();

  // 初始化Redis缓存
  redisCache = new RedisCache({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  await redisCache.connect();
});

afterEach(async () => {
  // 清理测试数据
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }

  // 清理Redis缓存
  await redisCache.flush();
});

afterAll(async () => {
  // 关闭连接
  await dataSource.destroy();
  await redisCache.disconnect();
});

// 测试工具函数
export function createMockConversation(overrides = {}) {
  return {
    customerId: 'test-customer',
    channel: 'chat',
    priority: 'normal',
    ...overrides,
  };
}

export function createMockMessage(conversationId: string, overrides = {}) {
  return {
    conversationId,
    senderId: 'test-user',
    senderType: 'agent',
    content: 'Test message',
    ...overrides,
  };
}
```

### 5.2 Phase 2-6: 限界上下文实现（按TDD流程）

#### TDD 实施模板（以 Conversation 为例）

**步骤 1: 编写领域模型测试（红灯）**

`tests/unit/domain/conversation/Conversation.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Conversation } from '@domain/conversation/models/Conversation';
import { Message } from '@domain/conversation/models/Message';
import { Channel } from '@domain/conversation/value-objects/Channel';

describe('Conversation - 聚合根', () => {
  let conversation: Conversation;

  beforeEach(() => {
    conversation = Conversation.create({
      customerId: 'cust-001',
      channel: Channel.fromString('chat'),
    });
  });

  describe('创建对话', () => {
    it('应该成功创建对话并处于open状态', () => {
      expect(conversation.status).toBe('open');
      expect(conversation.customerId).toBe('cust-001');
      expect(conversation.channel.value).toBe('chat');
    });

    it('应该抛出MessageSentEvent领域事件', () => {
      const events = conversation.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ConversationCreated');
    });
  });

  describe('发送消息', () => {
    it('应该成功添加消息到对话中', () => {
      conversation.sendMessage({
        senderId: 'agent-001',
        senderType: 'agent',
        content: 'Hello',
      });

      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].content).toBe('Hello');
    });

    it('发送消息后应该发布MessageSentEvent', () => {
      conversation.clearEvents(); // 清除创建事件

      conversation.sendMessage({
        senderId: 'agent-001',
        senderType: 'agent',
        content: 'Hello',
      });

      const events = conversation.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('MessageSent');
    });

    it('关闭的对话不能发送消息', () => {
      conversation.close('resolved');

      expect(() => {
        conversation.sendMessage({
          senderId: 'agent-001',
          senderType: 'agent',
          content: 'Hello',
        });
      }).toThrow('无法向已关闭的对话发送消息');
    });
  });

  describe('SLA 管理', () => {
    it('应该正确设置SLA截止时间', () => {
      const deadline = new Date(Date.now() + 3600000); // 1小时后
      conversation.setSLADeadline(deadline);

      expect(conversation.slaDeadline).toEqual(deadline);
      expect(conversation.slaStatus).toBe('normal');
    });

    it('超过SLA时间应该标记为violated', () => {
      const pastDeadline = new Date(Date.now() - 1000); // 过去时间
      conversation.setSLADeadline(pastDeadline);
      conversation.checkSLAStatus();

      expect(conversation.slaStatus).toBe('violated');
    });

    it('SLA违规应该发布SLAViolatedEvent', () => {
      conversation.clearEvents();

      const pastDeadline = new Date(Date.now() - 1000);
      conversation.setSLADeadline(pastDeadline);
      conversation.checkSLAStatus();

      const events = conversation.getUncommittedEvents();
      expect(events.some(e => e.eventType === 'SLAViolated')).toBe(true);
    });
  });

  describe('关闭对话', () => {
    it('应该成功关闭对话', () => {
      conversation.close('resolved');

      expect(conversation.status).toBe('closed');
      expect(conversation.closedAt).toBeInstanceOf(Date);
    });

    it('关闭对话应该发布ConversationClosedEvent', () => {
      conversation.clearEvents();

      conversation.close('resolved');

      const events = conversation.getUncommittedEvents();
      expect(events.some(e => e.eventType === 'ConversationClosed')).toBe(true);
    });

    it('已关闭的对话不能再次关闭', () => {
      conversation.close('resolved');

      expect(() => {
        conversation.close('resolved');
      }).toThrow('对话已关闭');
    });
  });
});
```

**步骤 2: 实现领域模型（绿灯）**

`src/domain/conversation/models/Conversation.ts`:

```typescript
import { AggregateRoot } from '@domain/shared/AggregateRoot';
import { Message } from './Message';
import { Channel } from '../value-objects/Channel';
import { ConversationCreatedEvent } from '../events/ConversationCreatedEvent';
import { MessageSentEvent } from '../events/MessageSentEvent';
import { SLAViolatedEvent } from '../events/SLAViolatedEvent';
import { ConversationClosedEvent } from '../events/ConversationClosedEvent';

export type ConversationStatus = 'open' | 'pending' | 'closed';
export type SLAStatus = 'normal' | 'warning' | 'violated';

interface ConversationProps {
  customerId: string;
  agentId?: string;
  channel: Channel;
  status: ConversationStatus;
  priority: string;
  slaStatus: SLAStatus;
  slaDeadline?: Date;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export class Conversation extends AggregateRoot<ConversationProps> {
  private constructor(props: ConversationProps, id?: string) {
    super(props, id);
  }

  // 工厂方法
  public static create(data: {
    customerId: string;
    channel: Channel;
    agentId?: string;
    priority?: string;
  }): Conversation {
    const conversation = new Conversation({
      customerId: data.customerId,
      agentId: data.agentId,
      channel: data.channel,
      status: 'open',
      priority: data.priority || 'normal',
      slaStatus: 'normal',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 发布领域事件
    conversation.addDomainEvent(
      new ConversationCreatedEvent({
        conversationId: conversation.id,
        customerId: data.customerId,
        channel: data.channel.value,
      })
    );

    return conversation;
  }

  // Getters
  get customerId(): string {
    return this.props.customerId;
  }

  get agentId(): string | undefined {
    return this.props.agentId;
  }

  get channel(): Channel {
    return this.props.channel;
  }

  get status(): ConversationStatus {
    return this.props.status;
  }

  get slaStatus(): SLAStatus {
    return this.props.slaStatus;
  }

  get slaDeadline(): Date | undefined {
    return this.props.slaDeadline;
  }

  get messages(): Message[] {
    return [...this.props.messages]; // 返回副本
  }

  get closedAt(): Date | undefined {
    return this.props.closedAt;
  }

  // 业务方法
  public sendMessage(data: {
    senderId: string;
    senderType: 'agent' | 'customer';
    content: string;
    contentType?: string;
  }): void {
    if (this.props.status === 'closed') {
      throw new Error('无法向已关闭的对话发送消息');
    }

    const message = Message.create({
      conversationId: this.id,
      senderId: data.senderId,
      senderType: data.senderType,
      content: data.content,
      contentType: data.contentType || 'text',
    });

    this.props.messages.push(message);
    this.props.updatedAt = new Date();

    // 发布领域事件
    this.addDomainEvent(
      new MessageSentEvent({
        conversationId: this.id,
        messageId: message.id,
        senderId: data.senderId,
        content: data.content,
      })
    );
  }

  public setSLADeadline(deadline: Date): void {
    this.props.slaDeadline = deadline;
    this.checkSLAStatus();
  }

  public checkSLAStatus(): void {
    if (!this.props.slaDeadline) {
      return;
    }

    const now = new Date();
    const timeLeft = this.props.slaDeadline.getTime() - now.getTime();

    let newStatus: SLAStatus = 'normal';

    if (timeLeft < 0) {
      newStatus = 'violated';
      // 发布SLA违规事件
      this.addDomainEvent(
        new SLAViolatedEvent({
          conversationId: this.id,
          deadline: this.props.slaDeadline,
          violatedAt: now,
        })
      );
    } else if (timeLeft < 15 * 60 * 1000) {
      // 15分钟内
      newStatus = 'warning';
    }

    this.props.slaStatus = newStatus;
  }

  public assignAgent(agentId: string): void {
    if (this.props.status === 'closed') {
      throw new Error('无法为已关闭的对话分配客服');
    }

    this.props.agentId = agentId;
    this.props.updatedAt = new Date();
  }

  public close(resolution: string): void {
    if (this.props.status === 'closed') {
      throw new Error('对话已关闭');
    }

    this.props.status = 'closed';
    this.props.closedAt = new Date();
    this.props.updatedAt = new Date();

    // 发布领域事件
    this.addDomainEvent(
      new ConversationClosedEvent({
        conversationId: this.id,
        resolution,
        closedAt: this.props.closedAt,
      })
    );
  }
}
```

**步骤 3: 运行测试确保通过**

```bash
cd backend
npm run test:unit -- Conversation.spec.ts
```

**步骤 4: 重构代码**

优化代码结构、提取重复逻辑、改进命名等。

---

**步骤 5: 编写仓储集成测试**

`tests/integration/repositories/ConversationRepository.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationRepository } from '@infrastructure/repositories/ConversationRepository';
import { Conversation } from '@domain/conversation/models/Conversation';
import { Channel } from '@domain/conversation/value-objects/Channel';
import { AppDataSource } from '@infrastructure/database/data-source';

describe('ConversationRepository - 集成测试', () => {
  let repository: ConversationRepository;

  beforeEach(async () => {
    repository = new ConversationRepository(AppDataSource);
  });

  describe('save', () => {
    it('应该成功保存对话到数据库', async () => {
      const conversation = Conversation.create({
        customerId: 'cust-001',
        channel: Channel.fromString('chat'),
      });

      await repository.save(conversation);

      const found = await repository.findById(conversation.id);
      expect(found).toBeDefined();
      expect(found!.customerId).toBe('cust-001');
    });

    it('应该持久化领域事件', async () => {
      const conversation = Conversation.create({
        customerId: 'cust-001',
        channel: Channel.fromString('chat'),
      });

      conversation.sendMessage({
        senderId: 'agent-001',
        senderType: 'agent',
        content: 'Hello',
      });

      await repository.save(conversation);

      // 验证事件已保存
      const events = await repository.getEvents(conversation.id);
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('findById', () => {
    it('应该根据ID查找对话', async () => {
      const conversation = Conversation.create({
        customerId: 'cust-002',
        channel: Channel.fromString('email'),
      });

      await repository.save(conversation);

      const found = await repository.findById(conversation.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(conversation.id);
    });

    it('不存在的ID应该返回null', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByCustomerId', () => {
    it('应该查找客户的所有对话', async () => {
      const conv1 = Conversation.create({
        customerId: 'cust-003',
        channel: Channel.fromString('chat'),
      });

      const conv2 = Conversation.create({
        customerId: 'cust-003',
        channel: Channel.fromString('email'),
      });

      await repository.save(conv1);
      await repository.save(conv2);

      const conversations = await repository.findByCustomerId('cust-003');
      expect(conversations).toHaveLength(2);
    });
  });
});
```

**步骤 6: 实现仓储**

`src/infrastructure/repositories/ConversationRepository.ts`:

```typescript
import { DataSource, Repository } from 'typeorm';
import { IConversationRepository } from '@domain/conversation/repositories/IConversationRepository';
import { Conversation } from '@domain/conversation/models/Conversation';
import { ConversationEntity } from '@infrastructure/database/entities/ConversationEntity';
import { DomainEventEntity } from '@infrastructure/database/entities/DomainEventEntity';
import { ConversationMapper } from './mappers/ConversationMapper';

export class ConversationRepository implements IConversationRepository {
  private repository: Repository<ConversationEntity>;
  private eventRepository: Repository<DomainEventEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(ConversationEntity);
    this.eventRepository = dataSource.getRepository(DomainEventEntity);
  }

  async save(conversation: Conversation): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 保存聚合
      const entity = ConversationMapper.toEntity(conversation);
      await queryRunner.manager.save(entity);

      // 保存领域事件
      const events = conversation.getUncommittedEvents();
      for (const event of events) {
        const eventEntity = new DomainEventEntity();
        eventEntity.aggregateId = conversation.id;
        eventEntity.aggregateType = 'Conversation';
        eventEntity.eventType = event.eventType;
        eventEntity.eventData = event.payload;
        eventEntity.occurredAt = event.occurredAt;
        eventEntity.version = event.version;

        await queryRunner.manager.save(eventEntity);
      }

      conversation.clearEvents();

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string): Promise<Conversation | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['messages'],
    });

    if (!entity) {
      return null;
    }

    return ConversationMapper.toDomain(entity);
  }

  async findByCustomerId(customerId: string): Promise<Conversation[]> {
    const entities = await this.repository.find({
      where: { customerId },
      relations: ['messages'],
      order: { createdAt: 'DESC' },
    });

    return entities.map(entity => ConversationMapper.toDomain(entity));
  }

  async getEvents(conversationId: string): Promise<any[]> {
    const events = await this.eventRepository.find({
      where: {
        aggregateId: conversationId,
        aggregateType: 'Conversation',
      },
      order: { version: 'ASC' },
    });

    return events;
  }
}
```

**步骤 7: 编写 API 端到端测试**

`tests/e2e/api/conversation.spec.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '@/server';

describe('Conversation API - E2E', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/conversations', () => {
    it('应该成功创建对话', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        payload: {
          customerId: 'cust-001',
          channel: 'chat',
          priority: 'high',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.code).toBe(201);
      expect(body.data).toHaveProperty('id');
      expect(body.data.status).toBe('open');
    });

    it('缺少必填字段应该返回400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        payload: {
          channel: 'chat',
          // 缺少 customerId
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/conversations/:id/messages', () => {
    it('应该成功发送消息', async () => {
      // 先创建对话
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        payload: {
          customerId: 'cust-002',
          channel: 'chat',
        },
      });

      const { id } = JSON.parse(createRes.body).data;

      // 发送消息
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${id}/messages`,
        payload: {
          senderId: 'agent-001',
          senderType: 'agent',
          content: 'Hello, how can I help you?',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('id');
      expect(body.data.content).toBe('Hello, how can I help you?');
    });
  });

  describe('PATCH /api/v1/conversations/:id/close', () => {
    it('应该成功关闭对话', async () => {
      // 先创建对话
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        payload: {
          customerId: 'cust-003',
          channel: 'email',
        },
      });

      const { id } = JSON.parse(createRes.body).data;

      // 关闭对话
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/conversations/${id}/close`,
        payload: {
          resolution: 'resolved',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe('closed');
    });
  });
});
```

**步骤 8: 实现 API 控制器和路由**

（按照相同的TDD流程实现 Controller、Use Cases、Routes）

---

### 5.3 Phase 7-8: 监控、安全、部署

（详细步骤见后续章节）

---

## 6. 质量保障

### 6.1 测试覆盖率要求

| 测试类型 | 覆盖率目标 | 强制要求 |
|---------|-----------|---------|
| 单元测试 | ≥ 80% | ✅ CI门禁 |
| 集成测试 | ≥ 70% | ✅ CI门禁 |
| E2E测试 | 关键流程全覆盖 | ✅ CI门禁 |

### 6.2 代码质量检查

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "type-check": "tsc --noEmit"
  }
}
```

### 6.3 代码审查规范

- ✅ 至少2人审查通过
- ✅ 所有测试通过
- ✅ 覆盖率达标
- ✅ 无安全漏洞
- ✅ 符合编码规范

---

## 7. 部署策略

### 7.1 环境划分

```
Development → Staging → Production
   ↓            ↓          ↓
 本地开发      预发布     生产环境
```

### 7.2 灰度发布策略

```
阶段1: 5% 流量  （观察24小时）
阶段2: 25% 流量 （观察24小时）
阶段3: 50% 流量 （观察24小时）
阶段4: 100% 流量
```

---

## 8. 验收标准

### 8.1 功能验收

- [ ] 所有API端点可用
- [ ] 所有业务流程正常
- [ ] 所有限界上下文实现完整

### 8.2 性能验收

- [ ] API P99响应时间 < 500ms
- [ ] 支持1000+并发
- [ ] 数据库慢查询 < 100ms

### 8.3 安全验收

- [ ] 无高危漏洞
- [ ] 通过渗透测试
- [ ] HTTPS强制启用

### 8.4 稳定性验收

- [ ] 7x24小时稳定运行
- [ ] 错误率 < 0.1%
- [ ] 可用性 > 99.9%

---

## 附录：快速启动清单

### Week 1-2 检查清单

- [ ] 后端项目初始化
- [ ] 数据库设计完成
- [ ] Docker Compose运行
- [ ] CI/CD流水线配置
- [ ] 测试框架就绪

### Week 3-5 检查清单

- [ ] Conversation领域模型测试
- [ ] Conversation领域模型实现
- [ ] ConversationRepository测试
- [ ] ConversationRepository实现
- [ ] Conversation API测试
- [ ] Conversation API实现

### Week 6-20 检查清单

（重复上述流程，覆盖其他限界上下文）

---

**文档维护**: 每周更新进度，记录问题和解决方案
**沟通机制**: 每周例会，同步进展和风险
**风险管理**: 及时识别风险，制定应对措施

