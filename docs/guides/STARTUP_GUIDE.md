# After-Sales System 启动指南

本指南帮助你快速启动售后系统的所有服务。

> **统一 Docker 启动**：项目已切换为 Docker Compose 统一启动与编排，文中“手动启动/本地开发”步骤仅作参考，实际以 Docker Compose 为准。

**版本**: v2.0
**更新日期**: 2025-12-27
**架构**: Multi-Agent (Phase 1 & 2 完成)

---

## 一、系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    After-Sales System                        │
└─────────────────────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ↓                  ↓                  ↓
┌──────────────────┐ ┌──────────────┐ ┌────────────────────┐
│   Frontend       │ │  Node Backend│ │ AgentScope Service │
│   (Vite)         │ │  (TypeScript)│ │   (Python/FastAPI) │
│   Port: 3000     │ │  Port: 8080  │ │   Port: 5000       │
└──────────────────┘ └──────────────┘ └────────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ↓
          ┌──────────────────┴──────────────────┐
          ↓                                      ↓
┌──────────────────┐                   ┌────────────────────┐
│   PostgreSQL     │                   │   Redis            │
│   Port: 5432     │                   │   Port: 6379       │
└──────────────────┘                   └────────────────────┘
```

---

## 1.5 Multi-Agent架构说明

**After-Sales系统采用Multi-Agent架构，包含4个智能Agent：**

### Agent列表

| Agent | 职责 | 触发时机 |
|-------|------|---------|
| **AssistantAgent** | 情感分析、需求提取、回复生成 | 所有对话场景 |
| **EngineerAgent** | 故障诊断、知识检索、技术方案 | 故障场景 |
| **InspectorAgent** | 质量评分、报告生成、客户回访 | 对话关闭后（异步） |
| **OrchestratorAgent** | 智能路由、执行模式决策 | 所有对话入口 |

### 执行模式

- **Simple**: 单AssistantAgent处理（简单咨询）
- **Parallel**: Assistant+Engineer并行（故障场景）
- **Supervised**: Agent处理+人工审核（中高复杂度）
- **HumanFirst**: 人工优先+Agent建议（高风险/VIP/投诉）

### 质检异步化

对话关闭后，系统通过**事件驱动架构**自动触发InspectorAgent进行质检：

1. 用户/系统关闭对话
2. Backend发布`ConversationClosedEvent`
3. ConversationTaskCoordinator监听事件
4. 异步调用AgentScope质检API
5. InspectorAgent执行质检并保存报告

**性能优势**：对话关闭延迟从3-5秒降至<500ms（降低90%）

**详细架构**：参见 [AGENT_ARCHITECTURE_DESIGN.md](../architecture/AGENT_ARCHITECTURE_DESIGN.md)

---

## 二、前置要求

### 2.1 软件版本

| 软件 | 版本要求 | 检查命令 |
|------|---------|---------|
| Node.js | ≥18.0.0 | `node --version` |
| npm | ≥9.0.0 | `npm --version` |
| Python | ≥3.10 | `python3 --version` |
| PostgreSQL | ≥14.0 | `psql --version` |
| Redis | ≥6.0 | `redis-server --version` |

### 2.2 安装依赖

**macOS (使用Homebrew)**:
```bash
brew install node postgresql redis python@3.10
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install nodejs npm postgresql redis-server python3.10
```

---

## 三、环境配置

### 3.1 PostgreSQL配置

**启动PostgreSQL**:
```bash
# macOS
brew services start postgresql

# Ubuntu
sudo systemctl start postgresql
```

**创建数据库**:
```bash
# 创建数据库用户
psql postgres
CREATE USER admin WITH PASSWORD 'admin123';
CREATE DATABASE aftersales OWNER admin;
GRANT ALL PRIVILEGES ON DATABASE aftersales TO admin;
\q

# 或使用一条命令
psql -U postgres -c "CREATE USER admin WITH PASSWORD 'admin123';"
psql -U postgres -c "CREATE DATABASE aftersales OWNER admin;"
```

**验证连接**:
```bash
psql -U admin -d aftersales -h localhost
# 密码: admin123
```

---

### 3.2 Redis配置

**启动Redis**:
```bash
# macOS
brew services start redis

# Ubuntu
sudo systemctl start redis

# 或直接启动
redis-server
```

**验证连接**:
```bash
redis-cli ping
# 预期输出: PONG
```

---

### 3.3 环境变量配置

#### 后端环境变量

复制并编辑`.env`文件：

```bash
cd backend
cp .env.example .env
```

**编辑`.env`**:
```bash
# 数据库配置
DATABASE_URL=postgresql://admin:admin123@localhost:5432/aftersales
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=aftersales
DATABASE_USER=admin
DATABASE_PASSWORD=admin123

# Redis配置
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# AgentScope服务配置
AGENTSCOPE_URL=http://localhost:5000
AGENTSCOPE_TIMEOUT=30000

# Workflow配置（默认启用，设置为 false 可关闭）
WORKFLOW_ENGINE_ENABLED=true
WORKFLOW_ENGINE_MODE=full
WORKFLOWS_DIR=./workflows

# AI服务配置（可选）
AI_SERVICE_PROVIDER=ksyun
AI_SERVICE_URL=https://llm.cn-beijing.ksyun.com/v1
AI_SERVICE_API_KEY=your-api-key-here
AI_MODEL=deepseek-v3.1
AI_SERVICE_TIMEOUT=30000
AI_SERVICE_MAX_RETRIES=3

# 应用配置
NODE_ENV=development
PORT=8080
APP_BASE_URL=http://localhost:3000
LOG_LEVEL=info

# JWT配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# 监控配置（可选）
PROMETHEUS_ENABLED=true
SENTRY_DSN=
```

---

#### AgentScope环境变量

```bash
cd agentscope-service
# 本仓库不提供 .env.example，请按下方示例手动创建 .env
```

**编辑`.env`**:
```bash
# DeepSeek LLM配置
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# 后端服务配置
NODE_BACKEND_URL=http://localhost:8080
BACKEND_EVENT_BRIDGE_PATH=/agentscope/events
BACKEND_EVENT_BRIDGE_TIMEOUT=10

# 服务配置
HOST=0.0.0.0
PORT=5000
LOG_LEVEL=info

# AgentScope预取上下文（可选，显式调用MCP工具）
AGENTSCOPE_PREFETCH_ENABLED=false
```

---

## 四、启动服务

### 4.1 方式1: 手动启动（推荐用于开发）

#### 步骤1: 启动数据库服务

**Terminal 1 - PostgreSQL**:
```bash
# macOS
brew services start postgresql

# Ubuntu
sudo systemctl start postgresql

# 验证
psql -U admin -d aftersales -h localhost -c "SELECT 1;"
```

**Terminal 2 - Redis**:
```bash
# macOS
brew services start redis

# Ubuntu
sudo systemctl start redis

# 验证
redis-cli ping
```

---

#### 步骤2: 运行数据库迁移

```bash
cd backend

# 安装依赖（首次）
npm install

# 运行数据库迁移
npm run migration:run

# 预期输出:
# ✓ Migration 001-init-schema.sql executed successfully
# ✓ Migration 002-add-conversation-mode.sql executed successfully
```

---

#### 步骤3: 启动后端服务

**Terminal 3 - Node Backend**:
```bash
cd backend

# 开发模式（热重载）
npm run dev

# 或生产模式
npm run build
npm start

# 预期输出:
# [INFO] Server running on port 8080
# [INFO] Database connected
# [INFO] Redis connected
```

**验证后端**:
```bash
curl http://localhost:8080/api/health
# 预期输出: {"status":"ok","timestamp":"..."}
```

---

#### 步骤4: 启动AgentScope服务

**Terminal 4 - AgentScope**:
```bash
cd agentscope-service

# 创建虚拟环境（首次）
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

# 安装依赖（首次）
pip install -r requirements.txt

# 启动服务
uvicorn src.api.main:app --host 0.0.0.0 --port 5000 --reload

# 预期输出:
# INFO:     Uvicorn running on http://0.0.0.0:5000
# INFO:     Application startup complete
# INFO:     [AgentManager] Initializing agents...
# INFO:     [AgentManager] AssistantAgent initialized
# INFO:     [AgentManager] EngineerAgent initialized
# INFO:     [AgentManager] InspectorAgent initialized
# INFO:     [AgentManager] HumanAgent initialized
# INFO:     [AgentManager] All agents ready
```

**验证AgentScope**:
```bash
# 健康检查
curl http://localhost:5000/health
# 预期输出: {"status":"healthy","agents_ready":true}

# 查看可用Agent列表
curl http://localhost:5000/api/agents/list
# 预期输出: {"agents":["AssistantAgent","EngineerAgent","InspectorAgent","HumanAgent"]}
```

**⚠️ 重要提示**：
- **DeepSeek API Key必须配置**：AgentScope依赖DeepSeek v3进行推理
- **Agent初始化需要5-10秒**：首次启动时Agent需要连接LLM和MCP服务
- **MCP工具依赖Backend**：确保Backend服务先启动

---

#### 步骤5: 启动前端服务

**Terminal 5 - Frontend**:
```bash
cd .  # 项目根目录

# 安装依赖（首次）
npm install

# 启动开发服务器
npm run dev

# 预期输出:
# VITE v5.x.x ready in xxx ms
# ➜ Local:   http://localhost:3000/
# ➜ Network: http://192.168.x.x:3000/
```

**访问应用**:
```
打开浏览器访问: http://localhost:3000
```

---

### 4.2 方式2: Docker Compose启动

**启动所有服务**:
```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

**服务端口映射**:
- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- AgentScope: http://localhost:5000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

---

### 4.3 方式3: 快速启动脚本

创建`start-all.sh`脚本：

```bash
#!/bin/bash

# 快速启动所有服务

set -e

echo "========================================"
echo "After-Sales System - 快速启动"
echo "========================================"
echo ""

# 检查服务
echo "[1] 检查数据库服务..."
brew services list | grep postgresql || brew services start postgresql
brew services list | grep redis || brew services start redis
sleep 2

# 启动后端
echo "[2] 启动Node后端服务..."
cd backend
npm install > /dev/null 2>&1
npm run migration:run
npm run dev &
BACKEND_PID=$!
cd ..
sleep 3

# 启动AgentScope
echo "[3] 启动AgentScope服务..."
cd agentscope-service
source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
uvicorn src.api.main:app --host 0.0.0.0 --port 5000 &
AGENTSCOPE_PID=$!
cd ..
sleep 3

# 启动前端
echo "[4] 启动前端服务..."
npm install > /dev/null 2>&1
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "所有服务已启动！"
echo "========================================"
echo ""
echo "服务地址:"
echo "  - 前端: http://localhost:3000"
echo "  - 后端: http://localhost:8080"
echo "  - AgentScope: http://localhost:5000"
echo ""
echo "进程ID:"
echo "  - Backend PID: $BACKEND_PID"
echo "  - AgentScope PID: $AGENTSCOPE_PID"
echo "  - Frontend PID: $FRONTEND_PID"
echo ""
echo "停止服务: kill $BACKEND_PID $AGENTSCOPE_PID $FRONTEND_PID"
echo ""
```

使用方法：
```bash
chmod +x start-all.sh
./start-all.sh
```

---

## 五、验证服务

### 5.1 健康检查

**检查所有服务状态**:
```bash
# 后端
curl http://localhost:8080/api/health

# AgentScope
curl http://localhost:5000/health

# 前端（浏览器）
open http://localhost:3000
```

---

### 5.2 运行测试脚本

**端到端质检流程测试**:
```bash
./tests/system/test-quality-inspection.sh
```

**预期输出**:
```
============================================
Phase 2 质检流程集成测试
============================================

[1] 检查服务状态...
  ✓ AgentScope服务正常运行
  ✓ Node后端服务正常运行

[2] 准备测试数据...
  ✓ 对话创建成功: abc123...
  ✓ 对话消息添加成功 (共3条消息)

[3] 触发对话关闭...
  ✓ 对话关闭成功，ConversationClosedEvent已发布

[4] 等待异步质检完成...
  等待InspectorAgent处理中...

[5] 验证质检结果...
  ✓ 质检接口调用成功
    质量评分: 82/100

============================================
测试完成！
============================================
```

---

## 六、常见问题

### 6.1 数据库连接失败

**问题**: `FATAL: password authentication failed for user "admin"`

**解决**:
```bash
# 重置密码
psql -U postgres
ALTER USER admin WITH PASSWORD 'admin123';
\q

# 或重新创建用户
DROP USER IF EXISTS admin;
CREATE USER admin WITH PASSWORD 'admin123';
GRANT ALL PRIVILEGES ON DATABASE aftersales TO admin;
```

---

### 6.2 Redis连接失败

**问题**: `Error: Redis connection failed`

**解决**:
```bash
# 检查Redis是否运行
redis-cli ping

# 如果未运行，启动Redis
brew services start redis  # macOS
sudo systemctl start redis # Ubuntu

# 检查端口占用
lsof -i :6379
```

---

### 6.3 AgentScope启动失败

**问题**: `ModuleNotFoundError: No module named 'agentscope'`

**解决**:
```bash
cd agentscope-service

# 激活虚拟环境
source venv/bin/activate

# 重新安装依赖
pip install -r requirements.txt

# 验证安装
python -c "import agentscope; print(agentscope.__version__)"
```

---

### 6.4 端口被占用

**问题**: `Error: Port 8080 is already in use`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :8080

# 杀死进程
kill -9 <PID>

# 或修改端口
export PORT=8081
npm run dev
```

---

### 6.5 数据库迁移失败

**问题**: `Migration failed: relation "conversations" already exists`

**解决**:
```bash
# 方式1: 删除所有表重新迁移（开发环境）
psql -U admin -d aftersales -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run migration:run

# 方式2: 检查迁移状态
psql -U admin -d aftersales -c "SELECT * FROM migrations;"
```

---

## 七、开发工作流

### 7.1 日常开发

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装/更新依赖
cd backend && npm install && cd ..
cd agentscope-service && pip install -r requirements.txt && cd ..

# 3. 运行迁移（如有新迁移）
cd backend && npm run migration:run && cd ..

# 4. 启动服务（3个Terminal）
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd agentscope-service && uvicorn src.api.main:app --reload
# Terminal 3: npm run dev

# 5. 开发完成后运行测试
./tests/system/test-quality-inspection.sh
```

---

### 7.2 代码提交前检查

```bash
# 1. 代码格式化
cd backend
npm run lint:fix

# 2. 类型检查
npm run typecheck

# 3. 运行测试
npm test

# 4. 构建验证
npm run build
```

---

## 八、监控和日志

### 8.1 查看日志

**后端日志**:
```bash
cd backend
npm run dev  # 开发模式会输出到控制台

# 或查看日志文件
tail -f logs/app.log
```

**AgentScope日志**:
```bash
cd agentscope-service
uvicorn src.api.main:app --log-level debug
```

**前端日志**:
```bash
# 浏览器控制台 (F12)
# Network标签查看API请求
```

---

### 8.2 Prometheus监控

访问: http://localhost:9090

**常用查询**:
```promql
# HTTP请求速率
rate(agentscope_http_requests_total[5m])

# 请求延迟P95
histogram_quantile(0.95, rate(agentscope_http_request_duration_seconds_bucket[5m]))

# 错误率
rate(agentscope_http_requests_total{status="500"}[5m])
```

---

### 8.3 Grafana仪表板

访问: http://localhost:3001

**默认凭据**:
- 用户名: admin
- 密码: admin

**预配置仪表板**:
- After-Sales Dashboard: 系统整体监控
- Agent Performance: Agent性能指标
- Quality Inspection: 质检统计

---

## 九、生产部署

### 9.1 环境变量

**生产环境.env**:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/aftersales
REDIS_URL=redis://prod-redis:6379
AGENTSCOPE_URL=http://agentscope:5000
AI_SERVICE_API_KEY=<production-key>
JWT_SECRET=<strong-random-secret>
SENTRY_DSN=<sentry-dsn>
```

---

### 9.2 构建和部署

```bash
# 后端构建
cd backend
npm run build
npm start

# 前端构建
npm run build
# 产物在 dist/ 目录

# AgentScope部署
cd agentscope-service
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.api.main:app
```

---

### 9.3 Docker部署

```bash
# 构建镜像
docker-compose -f docker-compose.prod.yml build

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 扩容
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

---

## 十、故障排查

### 10.1 快速诊断

```bash
# 检查所有服务端口
lsof -i :3000  # Frontend
lsof -i :8080  # Backend
lsof -i :5000  # AgentScope
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# 检查进程
ps aux | grep node
ps aux | grep uvicorn
ps aux | grep postgres
ps aux | grep redis
```

---

### 10.2 日志分析

**查找错误**:
```bash
# 后端错误日志
cd backend
grep -r "ERROR" logs/

# AgentScope错误
cd agentscope-service
grep -r "ERROR" logs/

# 系统日志
tail -f /var/log/syslog | grep aftersales
```

---

### 10.3 性能分析

**慢查询**:
```sql
-- PostgreSQL慢查询
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Redis监控**:
```bash
redis-cli --stat
redis-cli --bigkeys
```

---

## 十一、快速参考

### 11.1 服务端口

| 服务 | 端口 | 协议 | 用途 |
|------|------|------|------|
| Frontend | 3000 | HTTP | Web界面 |
| Backend | 8080 | HTTP | REST API |
| AgentScope | 5000 | HTTP | Agent服务 |
| PostgreSQL | 5432 | TCP | 数据库 |
| Redis | 6379 | TCP | 缓存 |
| Prometheus | 9090 | HTTP | 监控 |
| Grafana | 3001 | HTTP | 可视化 |

---

### 11.2 关键命令

```bash
# 启动服务
npm run dev                    # 前端
cd backend && npm run dev      # 后端
cd agentscope-service && uvicorn src.api.main:app --reload  # AgentScope

# 数据库
psql -U admin -d aftersales    # 连接数据库
npm run migration:run          # 运行迁移
npm run migration:revert       # 回滚迁移

# 测试
npm test                       # 运行测试
./tests/system/test-quality-inspection.sh   # 质检流程测试

# 构建
npm run build                  # 构建所有

# 监控
docker-compose logs -f         # 查看日志
curl http://localhost:9090/metrics  # Prometheus指标
```

---

## 十二、联系支持

**文档**: https://github.com/your-org/after-sales
**问题反馈**: https://github.com/your-org/after-sales/issues
**开发团队**: dev-team@example.com

---

**文档版本**: v2.0
**最后更新**: 2025-12-27
**适用系统版本**: Phase 1 & 2 (Multi-Agent架构)
