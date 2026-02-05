# 智能售后工作台 - 后端服务

> DDD（领域驱动设计）+ TDD（测试驱动开发）架构

## 技术栈

- **运行时**: Node.js 18+ LTS
- **语言**: TypeScript 5.x
- **Web框架**: Fastify 4.x
- **ORM**: TypeORM 0.3.x
- **数据库**: PostgreSQL 15.x
- **缓存/消息队列**: Redis 7.x
- **测试框架**: Vitest
- **代码质量**: ESLint + Prettier

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和Redis连接
```

### 3. 启动数据库（Docker）

```bash
cd ..
docker-compose up -d postgres redis
```

### 4. 运行数据库迁移

```bash
npm run migration:run
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:8080

## 目录结构

```
backend/
├── src/
│   ├── domain/                      # 领域层（核心业务逻辑）
│   │   ├── shared/                  # DDD基础类
│   │   ├── conversation/            # 对话上下文
│   │   ├── customer/                # 客户上下文
│   │   ├── requirement/             # 需求上下文
│   │   ├── task/                    # 任务上下文
│   │   └── knowledge/               # 知识库上下文
│   │
│   ├── application/                 # 应用层（用例编排）
│   │   ├── use-cases/               # 用例
│   │   └── dto/                     # 数据传输对象
│   │
│   ├── infrastructure/              # 基础设施层
│   │   ├── database/                # 数据库
│   │   ├── repositories/            # 仓储实现
│   │   ├── cache/                   # 缓存
│   │   ├── events/                  # 事件总线
│   │   └── external/                # 外部服务
│   │
│   ├── presentation/                # 表示层（HTTP接口）
│   │   ├── http/                    # HTTP相关
│   │   └── validators/              # 请求验证
│   │
│   ├── shared/                      # 共享代码
│   ├── config/                      # 配置
│   └── server.ts                    # 入口文件
│
├── tests/                           # 测试
│   ├── unit/                        # 单元测试
│   ├── integration/                 # 集成测试
│   └── e2e/                         # E2E测试
│
└── package.json
```

## 开发命令

```bash
# 开发
npm run dev              # 启动开发服务器（热重载）

# 构建
npm run build            # 构建生产版本
npm start                # 启动生产服务器

# 测试
npm test                 # 运行所有测试
npm run test:unit        # 单元测试
npm run test:integration # 集成测试
npm run test:e2e         # E2E测试
npm run test:coverage    # 测试覆盖率
npm run test:ui          # 测试UI界面

# 代码质量
npm run lint             # 代码检查
npm run lint:fix         # 自动修复
npm run format           # 格式化代码
npm run type-check       # 类型检查

# 数据库
npm run migration:generate # 生成迁移文件
npm run migration:run      # 运行迁移
npm run migration:revert   # 回滚迁移
```

## DDD 架构说明

### 分层架构

1. **领域层（Domain Layer）**：核心业务逻辑
   - 聚合根（Aggregate Root）
   - 实体（Entity）
   - 值对象（Value Object）
   - 领域服务（Domain Service）
   - 领域事件（Domain Event）

2. **应用层（Application Layer）**：用例编排
   - Use Cases
   - Application Services
   - DTOs

3. **基础设施层（Infrastructure Layer）**：技术实现
   - Repository实现
   - 数据库映射
   - 外部服务集成
   - 事件总线

4. **表示层（Presentation Layer）**：对外接口
   - HTTP Controllers
   - Request Validation
   - Response Formatting

### TDD 开发流程

```
1. 红灯（Red）
   └─> 编写测试 → 测试失败

2. 绿灯（Green）
   └─> 实现功能 → 测试通过

3. 重构（Refactor）
   └─> 优化代码 → 保持测试通过
```

## API 文档

启动服务器后访问：http://localhost:8080/docs

## 许可证

MIT
