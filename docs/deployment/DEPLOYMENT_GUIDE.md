# 部署指南 (Deployment Guide)

> **文档版本**: v1.0
> **创建日期**: 2025-12-30
> **维护团队**: DevOps团队
> **适用版本**: v0.5+ (基础部署) → v1.0 (生产环境)

> 注意：本文档包含旧架构样例（NestJS/agent-service/Milvus/8000）。当前仓库实现为 Fastify + agentscope-service + PostgreSQL/Redis，端口分别为 8080/5000/5173（Docker 映射前端到 3000）。部署请优先参考根目录 `docker-compose.yml`。

---

## 📋 目录

- [1. 部署架构总览](#1-部署架构总览)
- [2. 系统要求](#2-系统要求)
- [3. Docker部署](#3-docker部署)
- [4. Kubernetes部署](#4-kubernetes部署)
- [5. 数据库部署](#5-数据库部署)
- [6. 中间件部署](#6-中间件部署)
- [7. Agent服务部署](#7-agent服务部署)
- [8. 前端部署](#8-前端部署)
- [9. 健康检查与验证](#9-健康检查与验证)
- [10. 常见问题](#10-常见问题)

---

## 1. 部署架构总览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         负载均衡 (Nginx/ALB)                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐   ┌───▼────┐   ┌───▼────┐
│Frontend│   │Frontend│   │Frontend│  (React/Next.js)
│  Pod1  │   │  Pod2  │   │  Pod3  │
└────────┘   └────────┘   └────────┘
    │             │             │
    └─────────────┼─────────────┘
                  │
    ┌─────────────▼─────────────┐
    │      API Gateway (可选)     │
    └─────────────┬─────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐   ┌───▼────┐   ┌───▼────┐
│Backend │   │Backend │   │Backend │  (NestJS)
│  Pod1  │   │  Pod2  │   │  Pod3  │
└───┬────┘   └───┬────┘   └───┬────┘
    │             │             │
    └─────────────┼─────────────┘
                  │
    ┌─────────────┼─────────────────────┐
    │             │                     │
┌───▼─────┐  ┌───▼─────┐       ┌──────▼──────┐
│ Postgres│  │  Redis  │       │AgentScope   │  (Python)
│ Primary │  │ Cluster │       │  Service    │
└───┬─────┘  └─────────┘       └──────┬──────┘
    │                                  │
┌───▼─────┐                    ┌──────▼──────┐
│ Postgres│                    │   Milvus    │  (向量数据库)
│ Replica │                    │   Cluster   │
└─────────┘                    └─────────────┘
```

### 1.2 组件清单

| 组件 | 技术栈 | 部署方式 | 副本数 |
|------|--------|---------|--------|
| **Frontend** | React/Next.js | K8s Pod | 3+ (可HPA) |
| **Backend** | NestJS + TypeScript | K8s Pod | 3+ (可HPA) |
| **Agent服务** | AgentScope + Python | K8s Pod | 2+ |
| **数据库** | PostgreSQL 14+ | StatefulSet/RDS | 1主2从 |
| **缓存** | Redis 7+ | StatefulSet/ElastiCache | 3节点集群 |
| **向量数据库** | Milvus 2.3+ | Helm Chart | 3节点 |
| **消息队列** | Redis Pub/Sub | 同Redis | - |
| **负载均衡** | Nginx/ALB | Ingress/Service | - |

---

## 2. 系统要求

### 2.1 硬件要求

#### v0.5 (MVP环境)
```yaml
最低配置:
  - CPU: 4核
  - 内存: 8GB
  - 磁盘: 100GB SSD
  - 网络: 10Mbps

推荐配置:
  - CPU: 8核
  - 内存: 16GB
  - 磁盘: 200GB SSD
  - 网络: 100Mbps
```

#### v0.8 (生产环境)
```yaml
最低配置:
  - CPU: 16核
  - 内存: 32GB
  - 磁盘: 500GB SSD
  - 网络: 1Gbps

推荐配置:
  - CPU: 32核
  - 内存: 64GB
  - 磁盘: 1TB SSD
  - 网络: 10Gbps
```

#### v1.0 (企业级)
```yaml
K8s集群:
  Master节点:
    - 3个节点
    - 每节点: 4核8GB

  Worker节点:
    - 5+个节点
    - 每节点: 8核16GB

数据库:
  - 主库: 8核32GB
  - 从库: 8核32GB × 2

缓存:
  - Redis: 4核16GB × 3

向量数据库:
  - Milvus: 8核32GB × 3
```

### 2.2 软件要求

```yaml
必需软件:
  - Docker: 24.0+
  - Kubernetes: 1.27+
  - Helm: 3.12+
  - kubectl: 1.27+

可选软件:
  - k9s: 终端UI管理工具
  - Lens: K8s图形化管理
  - Terraform: IaC工具
```

---

## 3. Docker部署

### 3.1 准备工作

#### 3.1.1 安装Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 验证安装
docker --version
docker-compose --version
```

#### 3.1.2 配置镜像加速（可选）

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 3.2 使用Docker Compose部署

#### 3.2.1 创建docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL数据库
  postgres:
    image: postgres:14-alpine
    container_name: after-sales-postgres
    environment:
      POSTGRES_DB: after_sales
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-admin123}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: after-sales-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis123}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  # Milvus向量数据库
  milvus-etcd:
    image: quay.io/coreos/etcd:v3.5.5
    container_name: milvus-etcd
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
    volumes:
      - milvus_etcd:/etcd
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd

  milvus-minio:
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    container_name: milvus-minio
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    volumes:
      - milvus_minio:/minio_data
    command: minio server /minio_data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  milvus-standalone:
    image: milvusdb/milvus:v2.3.3
    container_name: milvus-standalone
    depends_on:
      - milvus-etcd
      - milvus-minio
    environment:
      ETCD_ENDPOINTS: milvus-etcd:2379
      MINIO_ADDRESS: milvus-minio:9000
    volumes:
      - milvus_data:/var/lib/milvus
    ports:
      - "19530:19530"
      - "9091:9091"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9091/healthz"]
      interval: 30s
      start_period: 90s
      timeout: 20s
      retries: 3
    restart: unless-stopped

  # AgentScope Python服务
  agent-service:
    build:
      context: ./agent-service
      dockerfile: Dockerfile
    container_name: after-sales-agent
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      milvus-standalone:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://admin:${POSTGRES_PASSWORD:-admin123}@postgres:5432/after_sales
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis123}@redis:6379/0
      - MILVUS_HOST=milvus-standalone
      - MILVUS_PORT=19530
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
    volumes:
      - ./agent-service:/app
      - agent_logs:/app/logs
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # NestJS后端
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: after-sales-backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      agent-service:
        condition: service_healthy
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:${POSTGRES_PASSWORD:-admin123}@postgres:5432/after_sales
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis123}@redis:6379/0
      - AGENT_SERVICE_URL=http://agent-service:8000
      - JWT_SECRET=${JWT_SECRET:-your-secret-key}
    volumes:
      - ./backend:/app
      - backend_logs:/app/logs
      - /app/node_modules
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Frontend (可选，生产环境通常单独部署)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: after-sales-frontend
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3000
    ports:
      - "3001:3000"
    restart: unless-stopped

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: after-sales-nginx
    depends_on:
      - backend
      - frontend
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  milvus_etcd:
  milvus_minio:
  milvus_data:
  agent_logs:
  backend_logs:

networks:
  default:
    name: after-sales-network
```

#### 3.2.2 创建.env配置文件

```bash
# .env
POSTGRES_PASSWORD=your_postgres_password
REDIS_PASSWORD=your_redis_password
CLAUDE_API_KEY=your_claude_api_key
JWT_SECRET=your_jwt_secret_key
```

#### 3.2.3 启动服务

```bash
# 1. 构建镜像
docker-compose build

# 2. 启动所有服务
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f backend
docker-compose logs -f agent-service

# 5. 停止服务
docker-compose down

# 6. 停止并清理数据
docker-compose down -v
```

---

## 4. Kubernetes部署

### 4.1 准备工作

#### 4.1.1 安装kubectl

```bash
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# 验证
kubectl version --client
```

#### 4.1.2 安装Helm

```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# 验证
helm version
```

#### 4.1.3 配置kubectl

```bash
# 配置集群访问（以阿里云ACK为例）
export KUBECONFIG=/path/to/your/kubeconfig.yaml

# 验证连接
kubectl cluster-info
kubectl get nodes
```

### 4.2 创建命名空间

```bash
kubectl create namespace after-sales-prod
kubectl create namespace after-sales-staging
kubectl create namespace after-sales-dev

# 设置默认命名空间
kubectl config set-context --current --namespace=after-sales-prod
```

### 4.3 创建ConfigMap和Secret

#### 4.3.1 ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: after-sales-config
  namespace: after-sales-prod
data:
  NODE_ENV: "production"
  DATABASE_HOST: "postgres-service"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "after_sales"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  MILVUS_HOST: "milvus-service"
  MILVUS_PORT: "19530"
  AGENT_SERVICE_URL: "http://agent-service:8000"
```

#### 4.3.2 Secret

```bash
# 创建数据库密码
kubectl create secret generic postgres-secret \
  --from-literal=password=your_postgres_password \
  -n after-sales-prod

# 创建Redis密码
kubectl create secret generic redis-secret \
  --from-literal=password=your_redis_password \
  -n after-sales-prod

# 创建JWT密钥
kubectl create secret generic jwt-secret \
  --from-literal=secret=your_jwt_secret \
  -n after-sales-prod

# 创建Claude API密钥
kubectl create secret generic claude-api-secret \
  --from-literal=api-key=your_claude_api_key \
  -n after-sales-prod
```

### 4.4 部署PostgreSQL

#### 4.4.1 使用StatefulSet部署

```yaml
# k8s/postgres-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: after-sales-prod
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
  clusterIP: None
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: after-sales-prod
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: after_sales
        - name: POSTGRES_USER
          value: admin
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - admin
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - admin
          initialDelaySeconds: 5
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "ssd"
      resources:
        requests:
          storage: 100Gi
```

```bash
kubectl apply -f k8s/postgres-statefulset.yaml
```

#### 4.4.2 或使用云数据库（推荐生产环境）

```yaml
# 使用阿里云RDS/AWS RDS等托管数据库
# 仅需在ConfigMap中配置外部数据库地址
DATABASE_HOST: "rm-xxxxx.mysql.rds.aliyuncs.com"
DATABASE_PORT: "5432"
```

### 4.5 部署Redis

```yaml
# k8s/redis-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: after-sales-prod
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: after-sales-prod
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
          - redis-server
          - --appendonly
          - "yes"
          - --requirepass
          - "$(REDIS_PASSWORD)"
        ports:
        - containerPort: 6379
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
```

```bash
kubectl apply -f k8s/redis-deployment.yaml
```

### 4.6 部署Milvus

```bash
# 使用Helm安装Milvus
helm repo add milvus https://milvus-io.github.io/milvus-helm/
helm repo update

# 创建values.yaml配置
cat > milvus-values.yaml <<EOF
cluster:
  enabled: false

standalone:
  replicas: 1
  resources:
    requests:
      memory: "4Gi"
      cpu: "2000m"
    limits:
      memory: "8Gi"
      cpu: "4000m"

etcd:
  replicaCount: 1
  persistence:
    storageClass: "ssd"
    size: 10Gi

minio:
  mode: standalone
  persistence:
    storageClass: "ssd"
    size: 50Gi
EOF

# 安装Milvus
helm install milvus milvus/milvus \
  -f milvus-values.yaml \
  -n after-sales-prod

# 查看状态
kubectl get pods -l app.kubernetes.io/name=milvus -n after-sales-prod
```

### 4.7 部署Backend (NestJS)

```yaml
# k8s/backend-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: after-sales-prod
spec:
  selector:
    app: backend
  ports:
    - port: 3000
      targetPort: 3000
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: after-sales-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/after-sales-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: after-sales-config
              key: NODE_ENV
        - name: DATABASE_HOST
          valueFrom:
            configMapKeyRef:
              name: after-sales-config
              key: DATABASE_HOST
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
# HPA自动扩缩容
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: after-sales-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```bash
kubectl apply -f k8s/backend-deployment.yaml
```

### 4.8 部署Agent服务

```yaml
# k8s/agent-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: agent-service
  namespace: after-sales-prod
spec:
  selector:
    app: agent
  ports:
    - port: 8000
      targetPort: 8000
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent
  namespace: after-sales-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: agent
  template:
    metadata:
      labels:
        app: agent
    spec:
      containers:
      - name: agent
        image: your-registry/after-sales-agent:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: "postgresql://admin:$(DATABASE_PASSWORD)@postgres-service:5432/after_sales"
        - name: REDIS_URL
          value: "redis://:$(REDIS_PASSWORD)@redis-service:6379/0"
        - name: MILVUS_HOST
          valueFrom:
            configMapKeyRef:
              name: after-sales-config
              key: MILVUS_HOST
        - name: CLAUDE_API_KEY
          valueFrom:
            secretKeyRef:
              name: claude-api-secret
              key: api-key
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
```

```bash
kubectl apply -f k8s/agent-deployment.yaml
```

### 4.9 部署Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: after-sales-ingress
  namespace: after-sales-prod
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
  - hosts:
    - api.after-sales.example.com
    - app.after-sales.example.com
    secretName: after-sales-tls
  rules:
  - host: api.after-sales.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3000
  - host: app.after-sales.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 3000
```

```bash
kubectl apply -f k8s/ingress.yaml
```

---

## 5. 数据库部署

### 5.1 数据库初始化

#### 5.1.1 创建初始化脚本

```sql
-- scripts/init-db.sql

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 全文搜索

-- 创建数据库（如果使用docker-compose）
-- CREATE DATABASE after_sales;

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建基础表结构会由TypeORM迁移自动创建
-- 这里仅创建必要的扩展和配置
```

#### 5.1.2 运行TypeORM迁移

```bash
# 进入backend容器
kubectl exec -it <backend-pod-name> -n after-sales-prod -- sh

# 运行迁移
npm run migration:run

# 查看迁移状态
npm run migration:show

# 如果需要回滚
npm run migration:revert
```

### 5.2 数据库备份策略

#### 5.2.1 创建备份CronJob

```yaml
# k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: after-sales-prod
spec:
  schedule: "0 2 * * *"  # 每天凌晨2点
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:14-alpine
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              pg_dump -h postgres-service -U admin -d after_sales > /backup/backup_${TIMESTAMP}.sql
              # 上传到S3/OSS
              # aws s3 cp /backup/backup_${TIMESTAMP}.sql s3://your-bucket/backups/
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

---

## 6. 中间件部署

### 6.1 Redis集群部署（生产环境）

```bash
# 使用Helm安装Redis Cluster
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install redis bitnami/redis-cluster \
  --set cluster.nodes=6 \
  --set cluster.replicas=1 \
  --set password=your_redis_password \
  --set persistence.size=10Gi \
  -n after-sales-prod
```

### 6.2 监控部署

#### 6.2.1 Prometheus + Grafana

```bash
# 安装Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace

# 访问Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# 默认用户名: admin
# 默认密码: prom-operator
```

---

## 7. Agent服务部署

### 7.1 构建Agent服务镜像

#### 7.1.1 Dockerfile

```dockerfile
# agent-service/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 7.1.2 requirements.txt

```txt
agentscope==0.0.3
fastapi==0.104.1
uvicorn[standard]==0.24.0
psycopg2-binary==2.9.9
redis==5.0.1
pymilvus==2.3.3
anthropic==0.7.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
```

#### 7.1.3 构建并推送

```bash
cd agent-service

# 构建镜像
docker build -t your-registry/after-sales-agent:v1.0 .

# 推送到镜像仓库
docker push your-registry/after-sales-agent:v1.0
```

---

## 8. 前端部署

### 8.1 构建前端镜像

#### 8.1.1 Dockerfile

```dockerfile
# frontend/Dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

### 8.2 部署到K8s

```yaml
# k8s/frontend-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: after-sales-prod
spec:
  selector:
    app: frontend
  ports:
    - port: 3000
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: after-sales-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/after-sales-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.after-sales.example.com"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
```

---

## 9. 健康检查与验证

### 9.1 服务健康检查

```bash
# 检查所有Pod状态
kubectl get pods -n after-sales-prod

# 检查特定服务
kubectl get deployment backend -n after-sales-prod
kubectl get svc -n after-sales-prod

# 查看Pod日志
kubectl logs -f <pod-name> -n after-sales-prod

# 进入Pod调试
kubectl exec -it <pod-name> -n after-sales-prod -- sh
```

### 9.2 端到端测试

```bash
# 测试Backend API
curl -X GET https://api.after-sales.example.com/health

# 测试Agent服务
curl -X POST https://api.after-sales.example.com/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'

# 测试数据库连接
kubectl exec -it postgres-0 -n after-sales-prod -- \
  psql -U admin -d after_sales -c "SELECT version();"

# 测试Redis连接
kubectl exec -it redis-<pod-id> -n after-sales-prod -- \
  redis-cli -a <password> ping
```

---

## 10. 常见问题

### 10.1 Pod无法启动

**现象**: Pod状态一直是`Pending`或`CrashLoopBackOff`

**排查步骤**:
```bash
# 查看Pod详情
kubectl describe pod <pod-name> -n after-sales-prod

# 查看Pod日志
kubectl logs <pod-name> -n after-sales-prod

# 查看前一次容器日志
kubectl logs <pod-name> -n after-sales-prod --previous

# 常见原因:
# 1. 镜像拉取失败 → 检查镜像仓库权限
# 2. 资源不足 → 检查节点资源
# 3. 配置错误 → 检查ConfigMap/Secret
```

### 10.2 数据库连接失败

```bash
# 检查数据库Pod状态
kubectl get pod postgres-0 -n after-sales-prod

# 测试数据库连接
kubectl run -it --rm debug --image=postgres:14 --restart=Never -- \
  psql -h postgres-service -U admin -d after_sales

# 检查Secret配置
kubectl get secret postgres-secret -n after-sales-prod -o yaml
```

### 10.3 Ingress无法访问

```bash
# 检查Ingress状态
kubectl get ingress -n after-sales-prod

# 检查Ingress Controller日志
kubectl logs -n ingress-nginx <ingress-controller-pod>

# 验证DNS解析
nslookup api.after-sales.example.com

# 验证证书
curl -v https://api.after-sales.example.com
```

---

## 📞 相关文档

- [环境配置文档](./ENVIRONMENT_SETUP.md) - 各环境配置详情
- [数据库迁移文档](./DATABASE_MIGRATION.md) - TypeORM迁移指南
- [CI/CD流水线文档](./CI_CD_PIPELINE.md) - 自动化部署
- [监控告警文档](./MONITORING_SETUP.md) - Prometheus配置
- [运维手册](../operations/OPERATIONS_RUNBOOK.md) - 日常运维

---

**文档维护者**: DevOps团队
**最后更新**: 2025-12-30
**下次审查**: 2026-01-30
