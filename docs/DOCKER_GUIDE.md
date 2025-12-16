# Docker 部署指南

## 快速启动

### 1. 启动所有服务

```bash
# 启动开发环境（前端 + 后端 + 数据库 + Redis + 监控）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 拉取镜像故障排查

如果在 `docker-compose up -d` 之前执行 `docker-compose pull` 报错（例如 `Get "https://registry-1.docker.io/v2/": EOF`），说明 Docker Hub 镜像拉取临时失败，可能与网络或注册表状态有关。

##### 解决方案 1：配置 Docker 镜像加速器（推荐）

**macOS / Docker Desktop：**

1. 打开 Docker Desktop
2. 点击右上角齿轮图标 → Settings → Docker Engine
3. 在 JSON 配置中添加（合并到现有配置）：
   ```json
   {
     "registry-mirrors": [
       "https://docker.mirrors.ustc.edu.cn",
       "https://hub-mirror.c.163.com",
       "https://mirror.baidubce.com"
     ]
   }
   ```
4. 点击 Apply & Restart
5. 等待 Docker 重启完成后重试拉取

**Linux：**

```bash
# 运行配置脚本
./scripts/setup-docker-mirror.sh

# 或者手动配置
sudo nano /etc/docker/daemon.json
# 添加上述 JSON 配置
sudo systemctl restart docker
```

##### 解决方案 2：使用自动拉取脚本

```bash
# 使用带重试机制的拉取脚本
./scripts/pull-docker-images.sh
```

该脚本会：
- 自动拉取所有需要的镜像
- 失败时自动重试（最多 3 次）
- 提供详细的进度和错误信息

##### 解决方案 3：手动重试

1. 重试 `docker-compose pull`，或逐个拉取受影响的镜像（`docker pull prom/prometheus:latest` 等），有时只需间隔 1-2 分钟即可恢复。
2. 检查本地代理/VPN 设置，确保 Docker daemon 能够访问外网；必要时在命令前加 `DOCKER_BUILDKIT=0`。
3. 拉取成功后再运行 `docker-compose up -d`；否则 Prometheus/Grafana/Postgres/Redis 可能一直处于 `Created` / `Exited` 状态，并阻塞后续验证。

##### 常见问题

- **EOF 错误持续出现**：通常是网络连接问题，建议配置镜像加速器
- **镜像拉取速度慢**：使用国内镜像加速器可显著提升速度
- **特定镜像无法拉取**：尝试使用其他镜像加速器或检查镜像名称是否正确

### 2. 访问服务

- **前端**: http://localhost:3000
- **后端API**: http://localhost:8080
- **API文档**: http://localhost:8080/documentation
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### 3. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（谨慎使用！）
docker-compose down -v
```

## 单独启动服务

```bash
# 只启动数据库和Redis
docker-compose up -d postgres redis

# 只启动后端
docker-compose up -d backend

# 只启动前端
docker-compose up -d frontend
```

## 初始化数据库

```bash
# 进入后端容器
docker-compose exec backend sh

# 运行数据库迁移
npm run migration:run

# 退出容器
exit
```

## 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs postgres

# 实时查看日志
docker-compose logs -f backend
```

## 进入容器调试

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入PostgreSQL容器
docker-compose exec postgres psql -U admin -d aftersales

# 进入Redis容器
docker-compose exec redis redis-cli -a redis123
```

## 生产环境部署

```bash
# 使用生产配置启动（包含Nginx）
docker-compose --profile production up -d

# 构建生产镜像
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# 启动生产环境
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 常见问题

### 端口冲突

如果端口被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "新端口:容器端口"
```

### 数据持久化

数据存储在Docker卷中：
- `postgres_data`: PostgreSQL数据
- `redis_data`: Redis数据
- `prometheus_data`: Prometheus数据
- `grafana_data`: Grafana配置

查看卷：
```bash
docker volume ls
```

### 重置环境

```bash
# 删除所有容器、网络、卷
docker-compose down -v

# 重新启动
docker-compose up -d
```

## 健康检查

```bash
# 检查后端健康状态
curl http://localhost:8080/health

# 检查PostgreSQL
docker-compose exec postgres pg_isready -U admin

# 检查Redis
docker-compose exec redis redis-cli -a redis123 ping
```

## 性能优化

### 限制资源使用

在 `docker-compose.yml` 中添加：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 查看资源使用

```bash
docker stats
```
