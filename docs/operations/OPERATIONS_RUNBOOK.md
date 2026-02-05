# 运维手册 (Operations Runbook)

> **文档版本**: v1.0
> **创建日期**: 2025-12-30
> **维护团队**: SRE团队

---

## 📋 目录

- [1. 日常运维](#1-日常运维)
- [2. 监控检查](#2-监控检查)
- [3. 备份管理](#3-备份管理)
- [4. 服务管理](#4-服务管理)
- [5. 定期任务](#5-定期任务)
- [6. 值班手册](#6-值班手册)
- [7. 应急响应](#7-应急响应)

---

## 1. 日常运维

### 1.1 服务健康检查

**每日早晨9:00检查清单**:

```bash
# 1. 检查所有Pod状态
kubectl get pods -n after-sales-prod

# 预期: 所有Pod状态为Running，READY列为1/1或2/2

# 2. 检查服务可用性
curl -f https://api.after-sales.com/health
curl -f https://app.after-sales.com

# 预期: 返回200 OK

# 3. 检查数据库连接
kubectl exec -it postgres-0 -n after-sales-prod -- \
  psql -U admin -d after_sales -c "SELECT version();"

# 预期: 返回PostgreSQL版本信息

# 4. 检查Redis
kubectl exec -it redis-0 -n after-sales-prod -- \
  redis-cli -a <password> ping

# 预期: 返回PONG

# 5. 检查磁盘空间
kubectl exec -it <pod-name> -n after-sales-prod -- df -h

# 预期: 所有分区使用率 <80%

# 6. 检查最近1小时错误日志
kubectl logs --since=1h deployment/backend -n after-sales-prod | grep ERROR

# 预期: 无严重错误
```

### 1.2 性能指标检查

```bash
# 访问Grafana Dashboard
https://grafana.after-sales.com

# 关键指标检查:
# - API P95响应时间 <200ms
# - 错误率 <0.1%
# - CPU使用率 <70%
# - 内存使用率 <85%
# - QPS正常范围 (100-2000)
```

### 1.3 关键配置检查

```bash
# 后端关键环境变量（生产建议）
# 1) JWT 强密钥（避免默认值）
JWT_SECRET=<32位以上随机字符串>
JWT_ENFORCE_STRONG_SECRET=true

# 2) Outbox 事件发布模式（生产建议 outbox_only）
OUTBOX_PROCESSOR_ENABLED=true
OUTBOX_PUBLISH_MODE=outbox_only
```

---

## 2. 监控检查

### 2.1 Prometheus告警规则

```yaml
# 关键告警规则
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "API错误率过高"

      - alert: SlowResponse
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API响应时间过长"

      - alert: HighCPU
        expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CPU使用率过高"
```

### 2.2 告警响应流程

| 告警级别 | 响应时间 | 通知方式 | 处理人 |
|---------|---------|---------|--------|
| **Critical** | <5分钟 | 电话+短信+飞书 | 值班工程师 |
| **Warning** | <15分钟 | 短信+飞书 | 值班工程师 |
| **Info** | <1小时 | 飞书 | 当日值班 |

---

## 3. 备份管理

### 3.1 数据库备份

**自动备份策略**:

```bash
# 每日全量备份 (凌晨2点)
# CronJob已配置，检查备份状态:
kubectl get cronjob postgres-backup -n after-sales-prod
kubectl logs -l job-name=postgres-backup-<timestamp> -n after-sales-prod

# 备份文件位置:
# S3: s3://after-sales-backups/postgres/daily/
# OSS: oss://after-sales-backups/postgres/daily/
```

**手动备份**:

```bash
# 1. 进入数据库Pod
kubectl exec -it postgres-0 -n after-sales-prod -- bash

# 2. 执行备份
pg_dump -U admin -d after_sales > /backup/manual_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. 上传到对象存储
aws s3 cp /backup/manual_backup_*.sql s3://after-sales-backups/postgres/manual/
```

**备份验证** (每周日执行):

```bash
# 1. 下载最新备份
aws s3 cp s3://after-sales-backups/postgres/daily/latest.sql /tmp/

# 2. 恢复到测试数据库
psql -U admin -d test_restore < /tmp/latest.sql

# 3. 验证数据完整性
psql -U admin -d test_restore -c "SELECT COUNT(*) FROM conversations;"
```

### 3.2 Redis备份

```bash
# Redis使用AOF + RDB双持久化
# 检查持久化状态:
kubectl exec -it redis-0 -n after-sales-prod -- \
  redis-cli -a <password> INFO persistence

# 手动触发RDB快照:
kubectl exec -it redis-0 -n after-sales-prod -- \
  redis-cli -a <password> BGSAVE
```

---

## 4. 服务管理

### 4.1 服务启动/停止/重启

```bash
# 重启Backend服务
kubectl rollout restart deployment/backend -n after-sales-prod

# 重启Agent服务
kubectl rollout restart deployment/agent -n after-sales-prod

# 查看重启状态
kubectl rollout status deployment/backend -n after-sales-prod

# 扩容Pod
kubectl scale deployment/backend --replicas=5 -n after-sales-prod

# 缩容Pod
kubectl scale deployment/backend --replicas=3 -n after-sales-prod
```

### 4.2 日志查看

```bash
# 查看实时日志
kubectl logs -f deployment/backend -n after-sales-prod

# 查看最近1小时日志
kubectl logs --since=1h deployment/backend -n after-sales-prod

# 查看指定Pod日志
kubectl logs <pod-name> -n after-sales-prod

# 查看上一次崩溃日志
kubectl logs <pod-name> -n after-sales-prod --previous

# 导出日志到文件
kubectl logs deployment/backend -n after-sales-prod > backend.log
```

### 4.3 数据库维护

```bash
# 查看数据库连接数
kubectl exec -it postgres-0 -n after-sales-prod -- \
  psql -U admin -d after_sales -c "SELECT count(*) FROM pg_stat_activity;"

# 查看慢查询
kubectl exec -it postgres-0 -n after-sales-prod -- \
  psql -U admin -d after_sales -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 手动VACUUM (每月执行)
kubectl exec -it postgres-0 -n after-sales-prod -- \
  psql -U admin -d after_sales -c "VACUUM ANALYZE;"

# 重建索引 (数据库性能下降时)
kubectl exec -it postgres-0 -n after-sales-prod -- \
  psql -U admin -d after_sales -c "REINDEX DATABASE after_sales;"
```

---

## 5. 定期任务

### 5.1 每日任务

| 时间 | 任务 | 负责人 | 验证方式 |
|------|------|--------|---------|
| 09:00 | 服务健康检查 | 值班工程师 | 检查清单完成 |
| 09:30 | 监控面板巡检 | 值班工程师 | Grafana截图 |
| 10:00 | 备份验证 | 值班工程师 | 备份文件存在 |
| 17:00 | 日志审查 | 值班工程师 | 无严重错误 |

### 5.2 每周任务

| 时间 | 任务 | 负责人 |
|------|------|--------|
| 周一 10:00 | 性能分析报告 | SRE团队 |
| 周三 14:00 | 安全补丁检查 | SRE团队 |
| 周五 16:00 | 容量规划评估 | Tech Lead |
| 周日 02:00 | 备份恢复演练 | 值班工程师 |

### 5.3 每月任务

| 时间 | 任务 | 负责人 |
|------|------|--------|
| 每月1号 | 月度运维报告 | SRE团队 |
| 每月5号 | 账单审查与优化 | DevOps团队 |
| 每月15号 | 数据库维护(VACUUM) | DBA |
| 每月最后一天 | 日志归档 | SRE团队 |

### 5.4 每季度任务

| 时间 | 任务 | 负责人 |
|------|------|--------|
| 季度末 | 容灾演练 | 全体技术团队 |
| 季度末 | 安全审计 | 安全团队 |
| 季度末 | 架构回顾 | 架构团队 |

---

## 6. 值班手册

### 6.1 值班职责

**7×24小时值班制度**:

- **工作日**: 9:00-18:00 (主值班) + 18:00-次日9:00 (备值班)
- **周末/节假日**: 全天值班

**值班职责**:

1. 监控告警响应 (5分钟内响应P0告警)
2. 服务健康检查 (每日3次: 9:00/14:00/20:00)
3. 用户问题处理 (30分钟内响应)
4. 事故记录与上报
5. 值班日志填写

### 6.2 值班交接

**交接清单**:

```markdown
# 值班交接单

## 基本信息
- 交接时间: 2025-12-30 18:00
- 交接人: 张三
- 接班人: 李四

## 服务状态
- [ ] 所有服务正常运行
- [ ] 监控面板无异常告警
- [ ] 最近24小时无重大事件

## 待处理事项
- [ ] 无
- [ ] 有 (详细说明):

## 最近变更
- [ ] 无
- [ ] 有 (详细说明):

## 备注
```

### 6.3 联系方式

| 角色 | 姓名 | 电话 | 飞书 |
|------|------|------|------|
| 值班工程师(主) | 张三 | 138xxxx1111 | @zhangsan |
| 值班工程师(备) | 李四 | 139xxxx2222 | @lisi |
| Tech Lead | 王五 | 137xxxx3333 | @wangwu |
| DBA | 赵六 | 136xxxx4444 | @zhaoliu |
| CTO | 钱七 | 135xxxx5555 | @qianqi |

---

## 7. 应急响应

### 7.1 服务完全不可用 (P0)

**响应流程**:

1. **确认故障** (1分钟):
   ```bash
   curl -f https://api.after-sales.com/health
   ```

2. **通知相关方** (2分钟):
   - 立即通知Tech Lead和CTO
   - 在飞书创建应急群

3. **故障定位** (5分钟):
   ```bash
   # 检查Pod状态
   kubectl get pods -n after-sales-prod

   # 查看Pod日志
   kubectl logs deployment/backend --tail=100 -n after-sales-prod

   # 检查数据库
   kubectl exec -it postgres-0 -n after-sales-prod -- psql -U admin -c "SELECT 1;"
   ```

4. **快速恢复** (10分钟):
   - 方案1: 重启服务
     ```bash
     kubectl rollout restart deployment/backend -n after-sales-prod
     ```

   - 方案2: 回滚到上一版本
     ```bash
     kubectl rollout undo deployment/backend -n after-sales-prod
     ```

5. **验证恢复** (3分钟):
   ```bash
   curl -f https://api.after-sales.com/health
   # 检查业务功能正常
   ```

6. **事后复盘** (24小时内):
   - 编写故障报告
   - 分析根本原因
   - 制定预防措施

### 7.2 数据库故障 (P0)

```bash
# 1. 检查主库状态
kubectl exec -it postgres-0 -n after-sales-prod -- pg_isready

# 2. 如果主库故障，切换到从库
kubectl exec -it postgres-1 -n after-sales-prod -- \
  psql -U admin -c "SELECT pg_promote();"

# 3. 更新应用配置指向新主库
kubectl set env deployment/backend DATABASE_HOST=postgres-1 -n after-sales-prod
```

### 7.3 Redis故障 (P1)

```bash
# 1. 检查Redis状态
kubectl exec -it redis-0 -n after-sales-prod -- redis-cli ping

# 2. 如果Redis不可用，重启
kubectl delete pod redis-0 -n after-sales-prod

# 3. 应用降级 (缓存失效不影响核心功能)
```

---

## 📞 紧急联系方式

### 电话

- **值班工程师**: 138-xxxx-1111 (7×24小时)
- **Tech Lead**: 137-xxxx-3333 (工作日9:00-21:00)
- **DBA**: 136-xxxx-4444 (数据库问题)
- **CTO**: 135-xxxx-5555 (P0事件)

### 飞书群

- **运维值班群**: 日常值班沟通
- **应急响应群**: P0/P1事件专用

---

## 📞 相关文档

- [部署指南](../deployment/DEPLOYMENT_GUIDE.md) - 部署流程
- [故障排查指南](./TROUBLESHOOTING_GUIDE.md) - 常见问题排查
- [监控告警配置](./MONITORING_SETUP.md) - 监控配置

---

**文档维护者**: SRE团队
**最后更新**: 2025-12-30
