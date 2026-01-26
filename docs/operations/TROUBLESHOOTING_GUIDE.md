# 故障排查指南 (Troubleshooting Guide)

> **文档版本**: v1.0
> **创建日期**: 2025-12-30
> **维护团队**: SRE团队

---

## 📋 故障分类快速导航

| 故障类型 | 常见现象 | 快速定位 |
|---------|---------|---------|
| [服务启动失败](#1-服务启动失败) | Pod状态CrashLoopBackOff | 查看Pod日志 |
| [API响应超时](#2-api响应超时) | 请求>5秒超时 | 检查数据库/Agent服务 |
| [数据库连接失败](#3-数据库连接失败) | ECONNREFUSED | 检查数据库状态/网络 |
| [Redis连接失败](#4-redis连接失败) | ECONNREFUSED | 检查Redis状态 |
| [Agent调用失败](#5-agent调用失败) | 500错误 | 检查Agent服务/Claude API |
| [消息无法发送](#6-消息无法发送) | WebSocket断开 | 检查Redis Pub/Sub |
| [磁盘空间不足](#7-磁盘空间不足) | No space left | 清理日志/备份文件 |
| [CPU/内存过高](#8-cpu内存过高) | Pod被OOM Kill | 检查资源配置/代码泄漏 |

---

## 1. 服务启动失败

### 问题现象

```bash
$ kubectl get pods -n after-sales-prod
NAME                       READY   STATUS             RESTARTS   AGE
backend-7d9f8b5c4f-abcde   0/1     CrashLoopBackOff   5          3m
```

### 排查步骤

#### Step 1: 查看Pod详情

```bash
kubectl describe pod backend-7d9f8b5c4f-abcde -n after-sales-prod

# 关注以下信息:
# - Events: 查看启动失败原因
# - Last State: 查看上次容器状态
# - Exit Code: 退出码
```

#### Step 2: 查看容器日志

```bash
# 查看当前日志
kubectl logs backend-7d9f8b5c4f-abcde -n after-sales-prod

# 查看上一次崩溃日志
kubectl logs backend-7d9f8b5c4f-abcde -n after-sales-prod --previous

# 常见错误模式
grep -i "error\|exception\|fatal" logs.txt
```

#### Step 3: 常见原因与解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `ImagePullBackOff` | 镜像拉取失败 | 1. 检查镜像名称是否正确<br>2. 检查镜像仓库权限<br>3. 检查网络连接 |
| `DATABASE_URL is not defined` | 环境变量缺失 | 检查ConfigMap/Secret配置 |
| `ECONNREFUSED` | 无法连接数据库 | 检查数据库服务状态 |
| `OOMKilled` | 内存不足 | 增加内存限制 |
| `Cannot find module` | 依赖缺失 | 重新构建镜像 |

#### Step 4: 验证配置

```bash
# 检查ConfigMap
kubectl get configmap after-sales-config -n after-sales-prod -o yaml

# 检查Secret
kubectl get secret postgres-secret -n after-sales-prod -o yaml

# 检查环境变量注入
kubectl exec -it <pod-name> -n after-sales-prod -- env | grep DATABASE
```

### 解决方案

**方案1: 修复配置后重启**

```bash
# 1. 更新ConfigMap/Secret
kubectl edit configmap after-sales-config -n after-sales-prod

# 2. 重启Deployment
kubectl rollout restart deployment/backend -n after-sales-prod
```

**方案2: 回滚到上一版本**

```bash
kubectl rollout undo deployment/backend -n after-sales-prod
```

---

## 2. API响应超时

### 问题现象

```
用户反馈: API请求超过5秒无响应
监控告警: API P95 > 5000ms
```

### 排查步骤

#### Step 1: 定位慢接口

```bash
# 查看后端日志，找出慢查询
kubectl logs deployment/backend -n after-sales-prod | grep "duration.*[5-9][0-9][0-9][0-9]ms"

# 查看Grafana性能面板
# URL: https://grafana.after-sales.com/d/api-performance
```

#### Step 2: 排查数据库

```bash
# 1. 检查数据库连接数
kubectl exec -it postgres-0 -n after-sales-prod -- \
  psql -U admin -d after_sales -c "SELECT count(*) FROM pg_stat_activity;"

# 2. 查看慢查询
kubectl exec -it postgres-0 -n after-sales-prod -- \
  psql -U admin -d after_sales -c "
    SELECT query, mean_time, calls
    FROM pg_stat_statements
    ORDER BY mean_time DESC
    LIMIT 10;
  "

# 3. 查看锁等待
kubectl exec -it postgres-0 -n after-sales-prod -- \
  psql -U admin -d after_sales -c "
    SELECT pid, usename, query, state, wait_event_type
    FROM pg_stat_activity
    WHERE wait_event_type IS NOT NULL;
  "
```

#### Step 3: 排查Agent服务

```bash
# 检查Agent服务状态
curl -f http://agentscope-service:5000/health

# 查看Agent服务日志
kubectl logs deployment/agent -n after-sales-prod --tail=100

# 检查Claude API调用延迟
# 查找日志中的"claude_api_duration"
```

#### Step 4: 排查Redis

```bash
# 检查Redis慢查询
kubectl exec -it redis-0 -n after-sales-prod -- \
  redis-cli -a <password> SLOWLOG GET 10

# 检查Redis内存使用
kubectl exec -it redis-0 -n after-sales-prod -- \
  redis-cli -a <password> INFO memory
```

### 常见原因与解决方案

| 原因 | 现象 | 解决方案 |
|------|------|---------|
| **数据库慢查询** | 特定API很慢 | 1. 添加索引<br>2. 优化SQL<br>3. 增加数据库连接池 |
| **数据库连接池耗尽** | 所有API都慢 | 增加连接池大小 |
| **Agent服务超时** | /api/chat 很慢 | 1. 检查Claude API<br>2. 增加Agent超时时间<br>3. 增加Agent Pod数量 |
| **Redis慢查询** | 缓存相关API慢 | 1. 避免大key操作<br>2. 优化Redis数据结构 |
| **Pod资源不足** | CPU/内存接近限制 | 增加Pod资源配置 |

### 解决方案示例

**优化数据库查询**:

```sql
-- 添加索引
CREATE INDEX idx_conversation_customer_id ON conversations(customer_id);
CREATE INDEX idx_message_conversation_id ON messages(conversation_id);

-- 分析查询计划
EXPLAIN ANALYZE SELECT * FROM conversations WHERE customer_id = '123';
```

**增加Pod数量**:

```bash
kubectl scale deployment/backend --replicas=5 -n after-sales-prod
```

---

## 3. 数据库连接失败

### 问题现象

```
Error: connect ECONNREFUSED 10.0.1.100:5432
或
Error: password authentication failed for user "admin"
```

### 排查步骤

```bash
# 1. 检查数据库Pod状态
kubectl get pod postgres-0 -n after-sales-prod

# 2. 检查数据库是否Ready
kubectl exec -it postgres-0 -n after-sales-prod -- pg_isready -U admin

# 3. 测试连接
kubectl exec -it postgres-0 -n after-sales-prod -- \
  psql -U admin -d after_sales -c "SELECT 1;"

# 4. 检查Service
kubectl get svc postgres-service -n after-sales-prod

# 5. 检查网络连通性 (从Backend Pod测试)
kubectl exec -it <backend-pod> -n after-sales-prod -- \
  nc -zv postgres-service 5432
```

### 常见原因与解决方案

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `ECONNREFUSED` | 数据库未启动 | 检查Pod状态，重启数据库 |
| `password authentication failed` | 密码错误 | 检查Secret配置 |
| `database "xxx" does not exist` | 数据库不存在 | 创建数据库或运行迁移 |
| `too many connections` | 连接数超限 | 1. 增加max_connections<br>2. 关闭空闲连接 |
| `connection timeout` | 网络问题 | 检查网络策略/防火墙 |

---

## 4. Redis连接失败

### 问题现象

```
Error: connect ECONNREFUSED 10.0.1.200:6379
或
Error: NOAUTH Authentication required
```

### 排查步骤

```bash
# 1. 检查Redis Pod状态
kubectl get pod redis-0 -n after-sales-prod

# 2. 测试连接
kubectl exec -it redis-0 -n after-sales-prod -- redis-cli ping

# 3. 使用密码连接
kubectl exec -it redis-0 -n after-sales-prod -- \
  redis-cli -a <password> ping

# 4. 检查Redis日志
kubectl logs redis-0 -n after-sales-prod --tail=50

# 5. 检查内存使用
kubectl exec -it redis-0 -n after-sales-prod -- \
  redis-cli -a <password> INFO memory
```

### 解决方案

```bash
# 重启Redis
kubectl delete pod redis-0 -n after-sales-prod

# 检查Secret配置
kubectl get secret redis-secret -n after-sales-prod -o yaml
```

---

## 5. Agent调用失败

### 问题现象

```
POST /api/agent/chat
Response: 500 Internal Server Error
或超时无响应
```

### 排查步骤

```bash
# 1. 检查Agent服务状态
kubectl get pods -l app=agent -n after-sales-prod

# 2. 测试Agent服务健康
curl -f http://agent-service:8000/health

# 3. 查看Agent日志
kubectl logs deployment/agent -n after-sales-prod --tail=100

# 4. 检查Claude API密钥
kubectl get secret claude-api-secret -n after-sales-prod -o yaml

# 5. 测试Claude API连接 (从Agent Pod内)
kubectl exec -it <agent-pod> -n after-sales-prod -- \
  curl -X POST https://api.anthropic.com/v1/messages \
    -H "x-api-key: $CLAUDE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"claude-3-sonnet-20240229","max_tokens":100,"messages":[{"role":"user","content":"test"}]}'
```

### 常见原因与解决方案

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `401 Unauthorized` | API密钥无效 | 更新Claude API密钥 |
| `429 Too Many Requests` | 超过速率限制 | 1. 增加重试机制<br>2. 限流 |
| `timeout` | Agent响应慢 | 1. 增加超时时间<br>2. 优化Prompt |
| `500 Internal Server Error` | Agent内部错误 | 查看Agent日志排查 |

---

## 6. 消息无法发送

### 问题现象

```
用户反馈: 发送消息后无响应
前端错误: WebSocket connection failed
```

### 排查步骤

```bash
# 1. 检查WebSocket连接
# 浏览器Console查看WS连接状态

# 2. 检查Redis Pub/Sub
kubectl exec -it redis-0 -n after-sales-prod -- \
  redis-cli -a <password> PUBSUB CHANNELS

# 3. 测试消息发布订阅
# Terminal 1: 订阅
kubectl exec -it redis-0 -n after-sales-prod -- \
  redis-cli -a <password> SUBSCRIBE test_channel

# Terminal 2: 发布
kubectl exec -it redis-0 -n after-sales-prod -- \
  redis-cli -a <password> PUBLISH test_channel "hello"

# 4. 查看Backend日志
kubectl logs deployment/backend -n after-sales-prod | grep "websocket\|message"
```

### 解决方案

```bash
# 重启Backend服务
kubectl rollout restart deployment/backend -n after-sales-prod

# 检查Ingress WebSocket配置
kubectl get ingress after-sales-ingress -n after-sales-prod -o yaml
# 确保有以下annotation:
# nginx.ingress.kubernetes.io/websocket-services: "backend-service"
```

---

## 7. 磁盘空间不足

### 问题现象

```
Pod日志: No space left on device
监控告警: Disk usage > 90%
```

### 排查步骤

```bash
# 1. 检查磁盘使用情况
kubectl exec -it <pod-name> -n after-sales-prod -- df -h

# 2. 查找大文件
kubectl exec -it <pod-name> -n after-sales-prod -- \
  du -sh /* | sort -rh | head -10

# 3. 查找日志文件
kubectl exec -it <pod-name> -n after-sales-prod -- \
  find /var/log -type f -size +100M
```

### 解决方案

```bash
# 方案1: 清理日志
kubectl exec -it <pod-name> -n after-sales-prod -- \
  find /var/log -name "*.log" -mtime +7 -delete

# 方案2: 扩容磁盘 (需要云平台操作)
# 阿里云: 在控制台扩容磁盘
# AWS: 扩容EBS卷

# 方案3: 配置日志轮转
# 在Deployment中添加volume配置
```

---

## 8. CPU/内存过高

### 问题现象

```
监控告警: CPU usage > 80%
或
Pod状态: OOMKilled
```

### 排查步骤

```bash
# 1. 查看资源使用
kubectl top pod -n after-sales-prod

# 2. 查看Pod资源限制
kubectl describe pod <pod-name> -n after-sales-prod

# 3. 查看进程占用 (进入Pod)
kubectl exec -it <pod-name> -n after-sales-prod -- top

# 4. 查看Node资源
kubectl top node

# 5. 排查内存泄漏 (Node.js)
kubectl exec -it <backend-pod> -n after-sales-prod -- \
  node --expose-gc --inspect=0.0.0.0:9229 dist/main.js
# 然后使用Chrome DevTools连接
```

### 解决方案

```bash
# 方案1: 增加Pod资源限制
kubectl edit deployment backend -n after-sales-prod
# 修改:
resources:
  limits:
    cpu: "2000m"
    memory: "2Gi"
  requests:
    cpu: "1000m"
    memory: "1Gi"

# 方案2: 水平扩容
kubectl scale deployment/backend --replicas=5 -n after-sales-prod

# 方案3: 代码优化
# - 修复内存泄漏
# - 优化算法
# - 添加缓存
```

---

## 9. 常用诊断命令

### 9.1 K8s诊断

```bash
# 查看Pod状态
kubectl get pods -n after-sales-prod -o wide

# 查看Pod事件
kubectl get events -n after-sales-prod --sort-by='.lastTimestamp'

# 查看Pod资源使用
kubectl top pod -n after-sales-prod

# 进入Pod调试
kubectl exec -it <pod-name> -n after-sales-prod -- /bin/sh

# 端口转发 (本地调试)
kubectl port-forward <pod-name> 8080:3000 -n after-sales-prod

# 查看Service Endpoints
kubectl get endpoints -n after-sales-prod
```

### 9.2 日志查询

```bash
# 实时查看日志
kubectl logs -f deployment/backend -n after-sales-prod

# 查看多个Pod日志
kubectl logs -l app=backend -n after-sales-prod --all-containers=true

# 导出日志
kubectl logs deployment/backend -n after-sales-prod --since=24h > backend.log

# 在ELK中查询 (Kibana)
# 访问: https://kibana.after-sales.com
# 查询语法:
# kubernetes.namespace: "after-sales-prod" AND level: "ERROR"
```

### 9.3 网络诊断

```bash
# 测试DNS解析
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nslookup postgres-service

# 测试端口连通性
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nc -zv postgres-service 5432

# 测试HTTP连通性
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://backend-service:3000/health
```

---

## 📞 相关文档

- [运维手册](./OPERATIONS_RUNBOOK.md) - 日常运维操作
- [部署指南](../deployment/DEPLOYMENT_GUIDE.md) - 部署流程
- [环境配置](../deployment/ENVIRONMENT_SETUP.md) - 环境配置

---

## 🆘 获取帮助

如果以上方法都无法解决问题：

1. **查看相关文档**: 检查本文档和相关文档
2. **搜索历史问题**: 在GitHub Issues/飞书文档搜索
3. **联系值班工程师**: 138-xxxx-1111
4. **升级至Tech Lead**: 137-xxxx-3333
5. **创建事故报告**: P0/P1事件需要事后复盘

---

**文档维护者**: SRE团队
**最后更新**: 2025-12-30
