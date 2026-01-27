# 🛠️ 项目脚本工具

本目录包含用于简化 Docker 配置和镜像管理的实用脚本。

## 📋 脚本列表

### 1. setup-docker-mirror.sh
**用途**：配置 Docker 镜像加速器

**使用场景**：
- 首次设置开发环境
- Docker Hub 镜像拉取速度慢
- 遇到 Docker 镜像拉取超时或 EOF 错误

**使用方法**：
```bash
./scripts/setup-docker-mirror.sh
```

**功能**：
- 自动检测操作系统（macOS/Linux）
- macOS：提供 Docker Desktop 配置指南
- Linux：自动配置 `/etc/docker/daemon.json`
- 配置完成后测试镜像拉取功能

**配置的镜像加速器**：
- 中科大镜像：`https://docker.mirrors.ustc.edu.cn`
- 网易镜像：`https://hub-mirror.c.163.com`
- 百度镜像：`https://mirror.baidubce.com`

---

### 2. pull-docker-images.sh
**用途**：批量拉取项目所需的 Docker 镜像

**使用场景**：
- 在运行 `docker-compose up` 之前预先拉取镜像
- 网络不稳定时，需要重试机制
- 验证所有镜像是否可用

**使用方法**：
```bash
./scripts/pull-docker-images.sh
```

**功能**：
- 批量拉取以下镜像：
  - `postgres:15-alpine`
  - `redis:7-alpine`
  - `prom/prometheus:latest`
  - `grafana/grafana:latest`
  - `nginx:alpine`
  - `node:18-alpine`
- 每个镜像失败时自动重试（最多 3 次）
- 提供彩色进度输出
- 拉取结果统计和失败镜像列表
- 失败时提供解决建议

**输出示例**：
```
🚀 After-Sales Docker 镜像拉取脚本
================================

需要拉取 6 个镜像

📥 正在拉取: postgres:15-alpine
✅ 成功: postgres:15-alpine

📥 正在拉取: redis:7-alpine
✅ 成功: redis:7-alpine

...

================================
📊 拉取结果统计
================================
✅ 成功: 6/6

🎉 所有镜像拉取成功！

现在可以运行：
  docker-compose up -d
```

---

## 🚨 故障排除

### 问题：Docker Hub 拉取失败（EOF 错误）

**错误信息**：
```
Error response from daemon: Get "https://registry-1.docker.io/v2/": EOF
```

**解决步骤**：

1. **配置镜像加速器**（推荐）
   ```bash
   ./scripts/setup-docker-mirror.sh
   ```

2. **使用拉取脚本重试**
   ```bash
   ./scripts/pull-docker-images.sh
   ```

3. **手动配置（macOS/Docker Desktop）**
   - 打开 Docker Desktop
   - Settings → Docker Engine
   - 添加镜像加速器配置：
     ```json
     {
       "registry-mirrors": [
         "https://docker.mirrors.ustc.edu.cn",
         "https://hub-mirror.c.163.com",
         "https://mirror.baidubce.com"
       ]
     }
     ```
   - Apply & Restart

4. **验证配置**
   ```bash
   # 测试拉取小镜像
   docker pull alpine:latest

   # 查看 Docker 信息
   docker info | grep -A 5 "Registry Mirrors"
   ```

### 问题：脚本无执行权限

**错误信息**：
```
Permission denied: ./scripts/setup-docker-mirror.sh
```

**解决方法**：
```bash
# 添加执行权限
chmod +x scripts/*.sh

# 或单个脚本
chmod +x scripts/setup-docker-mirror.sh
```

### 问题：镜像拉取速度仍然很慢

**可能原因**：
1. 镜像加速器未生效（需要重启 Docker）
2. 网络环境问题
3. 镜像加速器本身负载高

**解决方法**：
1. 确认 Docker 已重启
2. 尝试其他镜像加速器
3. 使用 VPN
4. 考虑使用企业内部镜像仓库

---

## 📚 相关文档

- [部署文档索引](../docs/deployment/README.md)
- [快速开始](../docs/QUICK_START.md)
- [生产就绪检查](../docs/PRODUCTION_AUDIT.md)

---

## 💡 最佳实践

1. **首次设置时**：
   ```bash
   # 步骤 1：配置镜像加速器
   ./scripts/setup-docker-mirror.sh

   # 步骤 2：拉取所有镜像
   ./scripts/pull-docker-images.sh

   # 步骤 3：启动服务
   docker-compose up -d
   ```

2. **定期更新镜像**：
   ```bash
   # 拉取最新镜像
   ./scripts/pull-docker-images.sh

   # 重启服务以使用新镜像
   docker-compose up -d --force-recreate
   ```

3. **CI/CD 环境**：
   - 在 CI 流程中配置镜像加速器
   - 使用缓存机制减少重复拉取
   - 考虑使用私有镜像仓库

---

## 🤝 贡献

如果您有改进建议或发现问题，欢迎提交 Issue 或 Pull Request。
