# 环境配置文档 (Environment Setup)

> **文档版本**: v1.0
> **创建日期**: 2025-12-30
> **维护团队**: DevOps团队
> **适用版本**: v0.5+ (开发环境) → v1.0 (生产环境)

> 注意：本文档包含旧架构样例（NestJS/agent-service/Milvus/8000）。当前仓库实现为 Fastify + agentscope-service + PostgreSQL/Redis，端口分别为 8080/5000/5173（Docker 映射前端到 3000）。部署与环境变量请优先参考根目录 `docker-compose.yml` 与 `backend/.env.example`。

---

## 📋 目录

- [1. 环境概览](#1-环境概览)
- [2. 开发环境 (Development)](#2-开发环境-development)
- [3. 预发布环境 (Staging)](#3-预发布环境-staging)
- [4. 生产环境 (Production)](#4-生产环境-production)
- [5. 环境变量配置](#5-环境变量配置)
- [6. 数据库配置](#6-数据库配置)
- [7. Redis配置](#7-redis配置)
- [8. 向量数据库配置](#8-向量数据库配置)
- [9. Agent服务配置](#9-agent服务配置)
- [10. 第三方服务配置](#10-第三方服务配置)
- [11. 环境切换](#11-环境切换)
- [12. 常见问题](#12-常见问题)

---

## 1. 环境概览

### 1.1 环境列表

| 环境 | 用途 | 域名 | 分支 | 部署方式 |
|------|------|------|------|---------|
| **Local** | 本地开发 | localhost | feature/* | Docker Compose |
| **Dev** | 开发联调 | dev-api.after-sales.com | develop | K8s (单节点) |
| **Staging** | 预发布测试 | staging-api.after-sales.com | release/* | K8s (小集群) |
| **Production** | 生产环境 | api.after-sales.com | main | K8s (高可用集群) |

### 1.2 环境特性对比

| 特性 | Local | Dev | Staging | Production |
|------|-------|-----|---------|------------|
| **数据隔离** | ✅ | ✅ | ✅ | ✅ |
| **HTTPS** | ❌ | ✅ | ✅ | ✅ |
| **监控** | ❌ | ⚠️ 基础 | ✅ 完整 | ✅ 完整 |
| **日志保留** | 7天 | 30天 | 60天 | 180天 |
| **备份** | ❌ | ⚠️ 每周 | ✅ 每天 | ✅ 实时+每天 |
| **客户等级** | - | - | 99% | 99.95% |
| **资源** | 最小 | 小 | 中 | 大 |

---

## 2. 开发环境 (Development)

### 2.1 本地开发环境 (Local)

#### 2.1.1 系统要求

```yaml
硬件要求:
  - CPU: 4核+
  - 内存: 8GB+
  - 磁盘: 50GB+可用空间

软件要求:
  - Docker: 24.0+
  - Docker Compose: 2.20+
  - Node.js: 18.x LTS
  - Python: 3.10+
  - Git: 2.40+
```

#### 2.1.2 环境变量配置

创建 `.env.local` 文件：

```bash
# .env.local

# ============================================
# 环境标识
# ============================================
NODE_ENV=development
ENVIRONMENT=local

# ============================================
# 服务端口
# ============================================
BACKEND_PORT=3000
FRONTEND_PORT=3001
AGENT_SERVICE_PORT=8000

# ============================================
# 数据库配置
# ============================================
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=after_sales_dev
DATABASE_USER=admin
DATABASE_PASSWORD=dev123456

# 完整连接字符串
DATABASE_URL=postgresql://admin:dev123456@localhost:5432/after_sales_dev

# ============================================
# Redis配置
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123
REDIS_DB=0

# 完整连接字符串
REDIS_URL=redis://:redis123@localhost:6379/0

# ============================================
# Milvus配置
# ============================================
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_USERNAME=
MILVUS_PASSWORD=

# ============================================
# JWT配置
# ============================================
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ============================================
# Agent服务配置
# ============================================
AGENT_SERVICE_URL=http://localhost:8000
CLAUDE_API_KEY=sk-ant-xxx  # 从环境变量或.env.local.secret读取

# ============================================
# 日志配置
# ============================================
LOG_LEVEL=debug
LOG_FORMAT=pretty

# ============================================
# CORS配置
# ============================================
CORS_ORIGINS=http://localhost:3001,http://localhost:3000

# ============================================
# 文件上传配置
# ============================================
UPLOAD_MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,application/pdf

# ============================================
# 第三方服务 (开发环境使用Mock)
# ============================================
FEISHU_APP_ID=cli_xxx_dev
FEISHU_APP_SECRET=xxx_dev
WECOM_CORP_ID=xxx_dev
WECOM_CORP_SECRET=xxx_dev

# ============================================
# 功能开关
# ============================================
ENABLE_SWAGGER=true
ENABLE_DEBUG=true
ENABLE_HOT_RELOAD=true
```

#### 2.1.3 启动本地环境

```bash
# 1. 克隆代码
git clone https://github.com/your-org/after-sales.git
cd after-sales

# 2. 复制环境变量文件
cp .env.example .env.local

# 3. 启动基础设施（PostgreSQL + Redis + Milvus）
docker-compose -f docker-compose.dev.yml up -d postgres redis milvus-standalone

# 4. 等待服务就绪
docker-compose -f docker-compose.dev.yml ps

# 5. 初始化数据库
cd backend
npm install
npm run migration:run
npm run seed:dev  # 导入开发测试数据

# 6. 启动Backend
npm run start:dev

# 7. 启动Agent服务（新终端）
cd ../agent-service
pip install -r requirements.txt
python main.py

# 8. 启动Frontend（新终端）
cd ../frontend
npm install
npm run dev

# 9. 访问应用
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
# Swagger文档: http://localhost:3000/api/docs
# Agent服务: http://localhost:8000
```

#### 2.1.4 开发工具配置

##### VSCode配置 (.vscode/settings.json)

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.validate": [
    "javascript",
    "typescript"
  ],
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black"
}
```

##### VSCode调试配置 (.vscode/launch.json)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "python",
      "request": "launch",
      "name": "Debug Agent Service",
      "program": "${workspaceFolder}/agent-service/main.py",
      "console": "integratedTerminal"
    }
  ]
}
```

---

### 2.2 共享开发环境 (Dev)

#### 2.2.1 环境信息

```yaml
环境URL:
  - Frontend: https://dev-app.after-sales.com
  - Backend API: https://dev-api.after-sales.com
  - Swagger: https://dev-api.after-sales.com/api/docs

K8s集群:
  - 命名空间: after-sales-dev
  - 节点数: 1个Worker节点
  - 资源配额: 8核16GB

部署方式:
  - 自动部署: 推送到develop分支自动部署
  - 手动部署: kubectl apply -f k8s/dev/
```

#### 2.2.2 环境变量 (K8s ConfigMap)

```yaml
# k8s/dev/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: after-sales-config
  namespace: after-sales-dev
data:
  NODE_ENV: "development"
  ENVIRONMENT: "dev"

  # 数据库
  DATABASE_HOST: "postgres-dev.rds.aliyuncs.com"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "after_sales_dev"

  # Redis
  REDIS_HOST: "redis-dev.redis.rds.aliyuncs.com"
  REDIS_PORT: "6379"

  # Milvus
  MILVUS_HOST: "milvus-dev-service"
  MILVUS_PORT: "19530"

  # 日志
  LOG_LEVEL: "debug"
  LOG_FORMAT: "json"

  # CORS
  CORS_ORIGINS: "https://dev-app.after-sales.com"

  # 功能开关
  ENABLE_SWAGGER: "true"
  ENABLE_DEBUG: "true"
```

#### 2.2.3 访问Dev环境

```bash
# 配置kubectl访问Dev集群
export KUBECONFIG=~/.kube/config-dev
kubectl config use-context dev-cluster

# 查看Dev环境Pod状态
kubectl get pods -n after-sales-dev

# 查看日志
kubectl logs -f deployment/backend -n after-sales-dev

# 进入Pod调试
kubectl exec -it <pod-name> -n after-sales-dev -- sh
```

---

## 3. 预发布环境 (Staging)

### 3.1 环境信息

```yaml
环境URL:
  - Frontend: https://staging-app.after-sales.com
  - Backend API: https://staging-api.after-sales.com

K8s集群:
  - 命名空间: after-sales-staging
  - 节点数: 3个Worker节点
  - 资源配额: 24核48GB
  - 高可用: 多副本部署

部署方式:
  - 自动部署: 创建release分支自动部署
  - 需要审批: QA团队审批后发布
```

### 3.2 环境变量配置

```yaml
# k8s/staging/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: after-sales-config
  namespace: after-sales-staging
data:
  NODE_ENV: "production"
  ENVIRONMENT: "staging"

  # 数据库（使用生产级RDS）
  DATABASE_HOST: "postgres-staging.rds.aliyuncs.com"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "after_sales_staging"

  # Redis Cluster
  REDIS_HOST: "redis-staging.redis.rds.aliyuncs.com"
  REDIS_PORT: "6379"

  # Milvus
  MILVUS_HOST: "milvus-staging-service"
  MILVUS_PORT: "19530"

  # 日志
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"

  # CORS
  CORS_ORIGINS: "https://staging-app.after-sales.com"

  # 功能开关
  ENABLE_SWAGGER: "true"
  ENABLE_DEBUG: "false"
```

### 3.3 Staging环境特性

```yaml
数据策略:
  - 使用匿名化的生产数据
  - 每周从生产环境同步一次（脱敏后）
  - 不允许访问生产数据库

测试范围:
  - 完整E2E测试
  - 性能测试
  - 安全测试
  - 集成测试

监控:
  - Prometheus + Grafana
  - ELK日志聚合
  - Sentry错误追踪
  - 性能APM

备份:
  - 每天全量备份
  - 保留30天
```

---

## 4. 生产环境 (Production)

### 4.1 环境信息

```yaml
环境URL:
  - Frontend: https://app.after-sales.com
  - Backend API: https://api.after-sales.com

K8s集群:
  - 命名空间: after-sales-prod
  - 节点数: 5+个Worker节点
  - 资源配额: 64核128GB+
  - 高可用: 多区域部署
  - 自动扩缩容: HPA配置

部署方式:
  - 手动部署: 仅通过CI/CD流水线
  - 需要审批: Tech Lead + CTO审批
  - 灰度发布: 支持金丝雀发布
```

### 4.2 环境变量配置

```yaml
# k8s/prod/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: after-sales-config
  namespace: after-sales-prod
data:
  NODE_ENV: "production"
  ENVIRONMENT: "production"

  # 数据库（高可用RDS）
  DATABASE_HOST: "postgres-prod.rds.aliyuncs.com"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "after_sales_prod"
  DATABASE_POOL_MIN: "10"
  DATABASE_POOL_MAX: "100"

  # Redis Cluster（高可用）
  REDIS_HOST: "redis-prod.redis.rds.aliyuncs.com"
  REDIS_PORT: "6379"
  REDIS_CLUSTER_MODE: "true"

  # Milvus（集群模式）
  MILVUS_HOST: "milvus-prod-service"
  MILVUS_PORT: "19530"

  # 日志
  LOG_LEVEL: "warn"
  LOG_FORMAT: "json"

  # CORS
  CORS_ORIGINS: "https://app.after-sales.com"

  # 性能优化
  CACHE_TTL: "3600"
  ENABLE_COMPRESSION: "true"

  # 功能开关
  ENABLE_SWAGGER: "false"
  ENABLE_DEBUG: "false"
  ENABLE_PROFILING: "false"
```

### 4.3 生产环境Secret管理

```bash
# 使用K8s Secrets存储敏感信息
# 生产环境Secret应通过Vault/AWS Secrets Manager管理

# 创建数据库密码（示例）
kubectl create secret generic postgres-prod-secret \
  --from-literal=username=prod_admin \
  --from-literal=password='<strong-random-password>' \
  --from-literal=url='postgresql://prod_admin:<password>@postgres-prod.rds.aliyuncs.com:5432/after_sales_prod' \
  -n after-sales-prod

# 创建JWT密钥
kubectl create secret generic jwt-prod-secret \
  --from-literal=secret='<strong-random-jwt-secret>' \
  -n after-sales-prod

# 创建Claude API密钥
kubectl create secret generic claude-api-prod-secret \
  --from-literal=api-key='sk-ant-xxx' \
  -n after-sales-prod

# 创建第三方服务密钥
kubectl create secret generic third-party-secrets \
  --from-literal=feishu-app-id='cli_xxx' \
  --from-literal=feishu-app-secret='xxx' \
  --from-literal=wecom-corp-id='xxx' \
  --from-literal=wecom-corp-secret='xxx' \
  -n after-sales-prod
```

### 4.4 生产环境监控

```yaml
监控指标:
  业务指标:
    - 对话量 (QPS)
    - 响应时间 (P95/P99)
    - 错误率
    - Agent调用成功率

  系统指标:
    - CPU使用率
    - 内存使用率
    - 磁盘I/O
    - 网络流量

  告警规则:
    - P0: API错误率 > 1% → 立即电话
    - P1: API P95 > 500ms → 短信+飞书
    - P2: CPU > 80% → 飞书
    - P3: 磁盘空间 < 20% → 飞书

日志聚合:
  - ELK Stack (Elasticsearch + Logstash + Kibana)
  - 保留180天
  - 日志采样率: 100%

链路追踪:
  - Jaeger/Zipkin
  - 分布式追踪
  - 性能分析
```

### 4.5 生产环境备份策略

```yaml
数据库备份:
  实时备份:
    - WAL归档（Write-Ahead Logging）
    - 每5分钟归档到OSS
    - RPO: <10秒

  全量备份:
    - 每天凌晨2点
    - 保留30天
    - 每周日备份保留1年

  备份验证:
    - 每周自动恢复测试
    - 每月灾难恢复演练

Redis备份:
  - AOF持久化
  - 每小时RDB快照
  - 保留7天

Milvus备份:
  - 每天全量备份
  - 保留30天
```

---

## 5. 环境变量配置

### 5.1 Backend环境变量完整清单

```bash
# ============================================
# 基础配置
# ============================================
NODE_ENV=production|development
ENVIRONMENT=local|dev|staging|production
PORT=3000

# ============================================
# 数据库配置
# ============================================
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=after_sales
DATABASE_USER=admin
DATABASE_PASSWORD=xxx
DATABASE_URL=postgresql://user:pass@host:port/dbname

# 连接池配置
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_POOL_IDLE_TIMEOUT=10000

# ============================================
# Redis配置
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=xxx
REDIS_DB=0
REDIS_URL=redis://:password@host:port/db

# 集群模式
REDIS_CLUSTER_MODE=false
REDIS_CLUSTER_NODES=redis1:6379,redis2:6379

# ============================================
# Milvus配置
# ============================================
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_USERNAME=
MILVUS_PASSWORD=

# 集合配置
MILVUS_COLLECTION_KNOWLEDGE=knowledge_base
MILVUS_COLLECTION_CONVERSATION=conversation_vectors

# ============================================
# JWT配置
# ============================================
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# Agent服务配置
# ============================================
AGENT_SERVICE_URL=http://localhost:8000
AGENT_TIMEOUT=30000
AGENT_RETRY_TIMES=3

# ============================================
# Claude API配置
# ============================================
CLAUDE_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-3-sonnet-20240229
CLAUDE_MAX_TOKENS=4096
CLAUDE_TEMPERATURE=0.7

# ============================================
# 飞书配置
# ============================================
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_ENCRYPT_KEY=xxx
FEISHU_VERIFICATION_TOKEN=xxx

# ============================================
# 企业微信配置
# ============================================
WECOM_CORP_ID=xxx
WECOM_CORP_SECRET=xxx
WECOM_AGENT_ID=xxx

# ============================================
# OSS配置（文件上传）
# ============================================
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx
OSS_BUCKET=after-sales-attachments

# ============================================
# 日志配置
# ============================================
LOG_LEVEL=debug|info|warn|error
LOG_FORMAT=json|pretty
LOG_DIR=./logs

# ============================================
# CORS配置
# ============================================
CORS_ORIGINS=http://localhost:3001,https://app.after-sales.com

# ============================================
# 上传配置
# ============================================
UPLOAD_MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,application/pdf

# ============================================
# 功能开关
# ============================================
ENABLE_SWAGGER=true|false
ENABLE_DEBUG=true|false
ENABLE_HOT_RELOAD=true|false
ENABLE_COMPRESSION=true|false

# ============================================
# 监控配置
# ============================================
SENTRY_DSN=https://xxx@sentry.io/xxx
APM_SERVER_URL=http://apm:8200
```

### 5.2 Agent服务环境变量

```bash
# ============================================
# 基础配置
# ============================================
ENVIRONMENT=local|dev|staging|production
HOST=0.0.0.0
PORT=8000

# ============================================
# 数据库配置
# ============================================
DATABASE_URL=postgresql://user:pass@host:port/dbname

# ============================================
# Redis配置
# ============================================
REDIS_URL=redis://:password@host:port/db

# ============================================
# Milvus配置
# ============================================
MILVUS_HOST=localhost
MILVUS_PORT=19530

# ============================================
# Claude API配置
# ============================================
CLAUDE_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-3-sonnet-20240229

# ============================================
# AgentScope配置
# ============================================
AGENTSCOPE_LOG_LEVEL=INFO
AGENTSCOPE_MODEL_CONFIG_PATH=./configs/model_configs.json

# ============================================
# 日志配置
# ============================================
LOG_LEVEL=DEBUG|INFO|WARNING|ERROR
LOG_DIR=./logs
```

---

## 6. 数据库配置

### 6.1 PostgreSQL配置文件

#### 开发环境

```ini
# postgresql.conf (Development)

# 连接配置
max_connections = 100
superuser_reserved_connections = 3

# 内存配置
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL配置
wal_level = replica
max_wal_size = 1GB
min_wal_size = 80MB

# 查询优化
random_page_cost = 1.1  # SSD
effective_io_concurrency = 200

# 日志配置
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_duration_statement = 1000  # 记录>1秒的查询
```

#### 生产环境

```ini
# postgresql.conf (Production)

# 连接配置
max_connections = 500
superuser_reserved_connections = 5

# 内存配置
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 16MB
maintenance_work_mem = 1GB

# WAL配置
wal_level = replica
max_wal_size = 4GB
min_wal_size = 2GB
wal_compression = on

# 复制配置
max_wal_senders = 10
wal_keep_size = 1GB

# 查询优化
random_page_cost = 1.1
effective_io_concurrency = 200
max_worker_processes = 8
max_parallel_workers_per_gather = 4

# 日志配置
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_min_duration_statement = 500
log_line_prefix = '%m [%p] %q%u@%d '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

### 6.2 数据库索引策略

```sql
-- 对话表索引
CREATE INDEX idx_conversation_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversation_status ON conversations(status);
CREATE INDEX idx_conversation_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversation_assigned_to ON conversations(assigned_to);

-- 消息表索引
CREATE INDEX idx_message_conversation_id ON messages(conversation_id);
CREATE INDEX idx_message_created_at ON messages(created_at DESC);
CREATE INDEX idx_message_sender_type ON messages(sender_type);

-- 全文搜索索引
CREATE INDEX idx_message_content_fts ON messages USING gin(to_tsvector('simple', content));

-- 客户表索引
CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_customer_phone ON customers(phone);
CREATE INDEX idx_customer_tier ON customers(tier);
```

---

## 7. Redis配置

### 7.1 Redis配置文件

#### 开发环境

```conf
# redis.conf (Development)

# 网络配置
bind 0.0.0.0
port 6379
timeout 300

# 密码
requirepass dev_redis_password

# 内存配置
maxmemory 1gb
maxmemory-policy allkeys-lru

# 持久化
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# 日志
loglevel notice
logfile "/var/log/redis/redis.log"
```

#### 生产环境

```conf
# redis.conf (Production)

# 网络配置
bind 0.0.0.0
port 6379
timeout 300
tcp-backlog 511

# 密码
requirepass <strong-password>

# 内存配置
maxmemory 8gb
maxmemory-policy allkeys-lru

# 持久化（AOF + RDB双保险）
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

save 900 1
save 300 10
save 60 10000

# 复制配置
replica-serve-stale-data yes
replica-read-only yes

# 慢查询日志
slowlog-log-slower-than 10000
slowlog-max-len 128

# 客户端连接数
maxclients 10000
```

### 7.2 Redis键命名规范

```bash
# 缓存键命名规范
# {namespace}:{resource}:{identifier}:{field}

# 用户会话
session:user:123456

# 对话缓存
cache:conversation:789

# Agent结果缓存
cache:agent:orchestrator:query:abc123
cache:agent:assistant:response:def456

# 速率限制
ratelimit:api:/api/chat:192.168.1.1

# 分布式锁
lock:conversation:789
lock:knowledge:update:456

# 计数器
counter:api:calls:2024-12-30
counter:agent:orchestrator:success
```

---

## 8. 向量数据库配置

### 8.1 Milvus集合配置

```python
# milvus_collections.py

from pymilvus import CollectionSchema, FieldSchema, DataType

# 知识库集合
knowledge_schema = CollectionSchema(
    fields=[
        FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
        FieldSchema(name="knowledge_id", dtype=DataType.VARCHAR, max_length=100),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=1024),  # Claude Embeddings
        FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="category", dtype=DataType.VARCHAR, max_length=50),
        FieldSchema(name="created_at", dtype=DataType.INT64),
    ],
    description="Knowledge base embeddings"
)

# 对话向量集合
conversation_schema = CollectionSchema(
    fields=[
        FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
        FieldSchema(name="conversation_id", dtype=DataType.VARCHAR, max_length=100),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=1024),
        FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="created_at", dtype=DataType.INT64),
    ],
    description="Conversation history embeddings"
)
```

### 8.2 Milvus索引配置

```python
# 创建IVF_FLAT索引（适合中小规模数据）
index_params = {
    "metric_type": "COSINE",  # 余弦相似度
    "index_type": "IVF_FLAT",
    "params": {"nlist": 1024}
}

# 创建HNSW索引（适合大规模数据，更快但占用更多内存）
index_params_hnsw = {
    "metric_type": "COSINE",
    "index_type": "HNSW",
    "params": {
        "M": 16,
        "efConstruction": 256
    }
}

# 搜索参数
search_params = {
    "metric_type": "COSINE",
    "params": {"nprobe": 10}  # IVF_FLAT
    # "params": {"ef": 64}  # HNSW
}
```

---

## 9. Agent服务配置

### 9.1 AgentScope模型配置

```json
// configs/model_configs.json
[
  {
    "model_type": "anthropic_chat",
    "config_name": "claude-sonnet",
    "model_name": "claude-3-sonnet-20240229",
    "api_key": "${CLAUDE_API_KEY}",
    "organization": "",
    "client_args": {
      "timeout": 30,
      "max_retries": 3
    },
    "generate_args": {
      "temperature": 0.7,
      "max_tokens": 4096,
      "top_p": 0.9
    }
  },
  {
    "model_type": "anthropic_chat",
    "config_name": "claude-opus",
    "model_name": "claude-3-opus-20240229",
    "api_key": "${CLAUDE_API_KEY}",
    "generate_args": {
      "temperature": 0.8,
      "max_tokens": 4096
    }
  }
]
```

### 9.2 Agent配置文件

```yaml
# configs/agent_config.yaml

orchestrator:
  name: "Orchestrator"
  model: "claude-sonnet"
  system_prompt_path: "./prompts/orchestrator_system.txt"
  max_retries: 2
  timeout: 10

assistant:
  name: "AssistantAgent"
  model: "claude-sonnet"
  system_prompt_path: "./prompts/assistant_system.txt"
  knowledge_top_k: 5
  max_context_messages: 10

engineer:
  name: "EngineerAgent"
  model: "claude-sonnet"
  system_prompt_path: "./prompts/engineer_system.txt"
  diagnosis_depth: 3

inspector:
  name: "InspectorAgent"
  model: "claude-opus"  # 使用更强大的模型进行质检
  system_prompt_path: "./prompts/inspector_system.txt"
  scoring_dimensions:
    - response_speed
    - professionalism
    - friendliness
    - compliance
    - resolution_ability
```

---

## 10. 第三方服务配置

### 10.1 飞书集成配置

```typescript
// config/feishu.config.ts

export const feishuConfig = {
  development: {
    appId: process.env.FEISHU_APP_ID_DEV,
    appSecret: process.env.FEISHU_APP_SECRET_DEV,
    verificationToken: process.env.FEISHU_VERIFICATION_TOKEN_DEV,
    encryptKey: process.env.FEISHU_ENCRYPT_KEY_DEV,
    apiBaseUrl: 'https://open.feishu.cn',
  },
  production: {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    verificationToken: process.env.FEISHU_VERIFICATION_TOKEN,
    encryptKey: process.env.FEISHU_ENCRYPT_KEY,
    apiBaseUrl: 'https://open.feishu.cn',
  },
};
```

### 10.2 企业微信集成配置

```typescript
// config/wecom.config.ts

export const wecomConfig = {
  development: {
    corpId: process.env.WECOM_CORP_ID_DEV,
    corpSecret: process.env.WECOM_CORP_SECRET_DEV,
    agentId: process.env.WECOM_AGENT_ID_DEV,
    apiBaseUrl: 'https://qyapi.weixin.qq.com',
  },
  production: {
    corpId: process.env.WECOM_CORP_ID,
    corpSecret: process.env.WECOM_CORP_SECRET,
    agentId: process.env.WECOM_AGENT_ID,
    apiBaseUrl: 'https://qyapi.weixin.qq.com',
  },
};
```

---

## 11. 环境切换

### 11.1 本地环境切换

```bash
# 使用不同的.env文件
cp .env.local .env    # 本地开发
cp .env.dev .env      # 连接Dev环境
cp .env.staging .env  # 连接Staging环境

# 或使用dotenv-cli
npm install -g dotenv-cli

# 使用特定环境变量启动
dotenv -e .env.local npm run start:dev
dotenv -e .env.staging npm run start:dev
```

### 11.2 K8s环境切换

```bash
# 查看当前context
kubectl config current-context

# 切换到Dev环境
kubectl config use-context dev-cluster
kubectl config set-context --current --namespace=after-sales-dev

# 切换到Staging环境
kubectl config use-context staging-cluster
kubectl config set-context --current --namespace=after-sales-staging

# 切换到Production环境
kubectl config use-context prod-cluster
kubectl config set-context --current --namespace=after-sales-prod

# 创建别名简化操作
alias k-dev='kubectl config use-context dev-cluster && kubectl config set-context --current --namespace=after-sales-dev'
alias k-staging='kubectl config use-context staging-cluster && kubectl config set-context --current --namespace=after-sales-staging'
alias k-prod='kubectl config use-context prod-cluster && kubectl config set-context --current --namespace=after-sales-prod'
```

---

## 12. 常见问题

### 12.1 环境变量未生效

**问题**: 修改了.env文件，但应用未读取到新值

**解决方案**:
```bash
# 1. 确认.env文件位置正确
ls -la .env

# 2. 重启应用
npm run start:dev

# 3. 检查是否有缓存
rm -rf node_modules/.cache
rm -rf dist/

# 4. K8s环境需要更新ConfigMap/Secret并重启Pod
kubectl rollout restart deployment/backend -n after-sales-dev
```

### 12.2 无法连接数据库

**问题**: `ECONNREFUSED` 或 `Connection timeout`

**排查步骤**:
```bash
# 1. 检查数据库是否运行
docker ps | grep postgres
kubectl get pod postgres-0 -n after-sales-dev

# 2. 测试数据库连接
psql -h localhost -U admin -d after_sales

# 3. 检查防火墙规则
telnet localhost 5432

# 4. 检查环境变量
echo $DATABASE_URL

# 5. 检查数据库日志
docker logs postgres
kubectl logs postgres-0 -n after-sales-dev
```

### 12.3 Redis连接失败

```bash
# 测试Redis连接
redis-cli -h localhost -p 6379 -a <password> ping

# 检查Redis状态
docker ps | grep redis
kubectl get pod redis-0 -n after-sales-dev

# 查看Redis日志
docker logs redis
kubectl logs redis-0 -n after-sales-dev
```

### 12.4 Agent服务调用超时

**问题**: Backend调用Agent服务超时

**排查**:
```bash
# 1. 检查Agent服务健康状态
curl http://localhost:8000/health

# 2. 检查Claude API密钥是否有效
# 在agent服务容器内测试

# 3. 增加超时时间
AGENT_TIMEOUT=60000  # 60秒

# 4. 查看Agent服务日志
tail -f agent-service/logs/app.log
kubectl logs agent-<pod-id> -n after-sales-dev
```

---

## 📞 相关文档

- [部署指南](./DEPLOYMENT_GUIDE.md) - 完整部署流程
- 数据库迁移（待补充，见[部署文档索引](./README.md)）
- CI/CD流水线（待补充，见[部署文档索引](./README.md)）
- [故障排查指南](../operations/TROUBLESHOOTING_GUIDE.md) - 常见问题解决

---

**文档维护者**: DevOps团队
**最后更新**: 2025-12-30
**下次审查**: 2026-01-30
