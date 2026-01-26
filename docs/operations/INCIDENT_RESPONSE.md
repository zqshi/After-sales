# 事件响应流程 (Incident Response)

> **版本**: 1.0
> **最后更新**: 2026-01-26
> **负责团队**: After-Sales SRE团队

## 目录

1. [概述](#概述)
2. [事件分级](#事件分级)
3. [响应流程](#响应流程)
4. [角色和职责](#角色和职责)
5. [通信机制](#通信机制)
6. [常见事件处理](#常见事件处理)
7. [事后复盘](#事后复盘)

---

## 概述

### 目的

本文档定义了After-Sales系统的事件响应流程，确保在发生故障或异常时能够：
- 快速识别和定位问题
- 最小化业务影响
- 及时恢复服务
- 总结经验教训

### 适用范围

- 生产环境故障
- 性能严重下降
- 安全事件
- 数据异常

---

## 事件分级

### P0 - 紧急事件

**定义**: 核心服务完全不可用，影响所有用户

**示例**:
- 系统完全宕机
- 数据库不可访问
- 严重数据丢失
- 安全漏洞被利用

**响应时间**: 立即（5分钟内）
**解决时间**: 1小时内
**通知范围**: 所有相关人员 + 管理层

### P1 - 高优先级事件

**定义**: 核心功能受影响，部分用户无法使用

**示例**:
- 关键API响应超时
- 部分服务不可用
- 数据同步延迟严重
- 错误率显著上升

**响应时间**: 15分钟内
**解决时间**: 4小时内
**通知范围**: 技术团队 + 产品负责人

### P2 - 中优先级事件

**定义**: 非核心功能受影响，用户体验下降

**示例**:
- 次要功能异常
- 性能轻微下降
- 监控告警触发
- 日志错误增多

**响应时间**: 1小时内
**解决时间**: 1个工作日内
**通知范围**: 技术团队

### P3 - 低优先级事件

**定义**: 不影响用户，需要关注的问题

**示例**:
- 代码质量问题
- 文档缺失
- 配置优化建议
- 技术债务

**响应时间**: 1个工作日内
**解决时间**: 1周内
**通知范围**: 相关开发人员

---

## 响应流程

### 1. 检测 (Detection)

#### 自动检测
- Prometheus告警
- 健康检查失败
- 错误日志激增
- 用户投诉

#### 手动检测
- 值班人员巡检
- 用户反馈
- 内部测试发现

### 2. 确认 (Acknowledgment)

```bash
# 值班人员接到告警后立即确认
1. 在告警系统中点击"确认"
2. 在Slack #incidents频道发送消息：
   "P[级别] 事件确认：[简短描述] - 处理人：@your_name"
3. 创建事件工单（Jira/GitHub Issue）
```

### 3. 分类 (Triage)

**评估标准**:
- 影响范围（用户数量）
- 业务影响（核心功能 vs 次要功能）
- 数据风险（是否涉及数据丢失）
- 安全风险（是否涉及安全漏洞）

**分类决策树**:
```
服务完全不可用？
├─ 是 → P0
└─ 否 → 核心功能受影响？
    ├─ 是 → P1
    └─ 否 → 用户体验下降？
        ├─ 是 → P2
        └─ 否 → P3
```

### 4. 调查 (Investigation)

#### 快速诊断清单

```bash
# 1. 检查服务状态
kubectl get pods -n after-sales-prod
docker-compose ps

# 2. 查看最近日志
kubectl logs -n after-sales-prod deployment/backend --tail=100
docker-compose logs --tail=100 backend

# 3. 检查资源使用
kubectl top pods -n after-sales-prod
docker stats

# 4. 检查数据库
psql -U admin -d aftersales -c "SELECT COUNT(*) FROM pg_stat_activity;"

# 5. 检查网络连接
curl -v http://backend:3000/health
```

#### 常用诊断命令

```bash
# 查看错误日志
grep -i error /var/log/after-sales/*.log | tail -50

# 查看慢查询
psql -U admin -d aftersales -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;
"

# 查看系统负载
uptime
top -bn1 | head -20
```

### 5. 缓解 (Mitigation)

#### 临时措施

**P0事件**:
```bash
# 1. 快速回滚到上一个稳定版本
kubectl rollout undo deployment/backend -n after-sales-prod

# 2. 扩容资源
kubectl scale deployment/backend --replicas=10 -n after-sales-prod

# 3. 启用降级模式
kubectl set env deployment/backend FEATURE_FLAG_AI=false -n after-sales-prod

# 4. 切换到备用数据库
kubectl set env deployment/backend DATABASE_URL=$BACKUP_DB_URL -n after-sales-prod
```

**P1事件**:
```bash
# 1. 重启受影响的服务
kubectl rollout restart deployment/backend -n after-sales-prod

# 2. 清理缓存
kubectl exec -it redis-0 -n after-sales-prod -- redis-cli FLUSHDB

# 3. 增加资源限制
kubectl set resources deployment/backend --limits=cpu=2,memory=4Gi -n after-sales-prod
```

### 6. 解决 (Resolution)

#### 根本原因修复

1. **代码修复**
   ```bash
   # 创建hotfix分支
   git checkout -b hotfix/incident-123 main

   # 修复代码
   # ... 编写修复代码 ...

   # 测试
   npm test

   # 部署
   git push origin hotfix/incident-123
   # 触发CI/CD流程
   ```

2. **配置修复**
   ```bash
   # 更新ConfigMap
   kubectl edit configmap backend-config -n after-sales-prod

   # 重启服务使配置生效
   kubectl rollout restart deployment/backend -n after-sales-prod
   ```

3. **数据修复**
   ```bash
   # 备份当前数据
   pg_dump -U admin aftersales > backup_before_fix.sql

   # 执行修复SQL
   psql -U admin -d aftersales -f fix_data.sql

   # 验证修复结果
   psql -U admin -d aftersales -c "SELECT COUNT(*) FROM affected_table;"
   ```

### 7. 验证 (Verification)

```bash
# 1. 健康检查
curl http://api.after-sales.com/health

# 2. 功能测试
./scripts/smoke-test.sh

# 3. 监控指标
# 访问 Grafana 查看：
# - 错误率是否恢复正常
# - 响应时间是否正常
# - 资源使用是否稳定

# 4. 用户反馈
# 检查用户投诉是否减少
```

### 8. 关闭 (Closure)

```bash
# 1. 更新事件工单状态为"已解决"
# 2. 在Slack发送关闭通知：
   "P[级别] 事件已解决：[简短描述]
    - 根本原因：[原因]
    - 解决方案：[方案]
    - 影响时长：[时长]
    - 处理人：@your_name"
# 3. 安排事后复盘会议（P0/P1必须）
```

---

## 角色和职责

### 事件指挥官 (Incident Commander)

**职责**:
- 统筹事件响应
- 协调各方资源
- 做出关键决策
- 对外沟通

**权限**:
- 调动任何技术资源
- 决定是否回滚
- 决定是否启用降级

### 技术负责人 (Tech Lead)

**职责**:
- 技术调查和诊断
- 制定解决方案
- 执行修复操作
- 技术文档记录

### 通信协调员 (Communications Lead)

**职责**:
- 内部通知
- 用户通知
- 状态更新
- 文档记录

### 值班工程师 (On-Call Engineer)

**职责**:
- 第一响应人
- 初步诊断
- 升级决策
- 执行标准操作

---

## 通信机制

### 内部通信

#### Slack频道
- `#incidents`: 事件通知和协调
- `#after-sales-ops`: 运维日常沟通
- `#after-sales-dev`: 开发团队沟通

#### 通知模板

**事件开始**:
```
🚨 P[级别] 事件 #[编号]
标题：[简短描述]
影响：[影响范围]
状态：调查中
负责人：@[姓名]
工单：[链接]
```

**状态更新**:
```
📊 事件 #[编号] 更新
当前状态：[状态]
进展：[进展描述]
预计恢复时间：[时间]
```

**事件解决**:
```
✅ 事件 #[编号] 已解决
根本原因：[原因]
解决方案：[方案]
影响时长：[时长]
复盘会议：[时间]
```

### 外部通信

#### 用户通知

**严重故障（P0）**:
```
尊敬的用户：

我们的系统目前遇到技术问题，部分功能暂时无法使用。
我们的团队正在紧急处理，预计在[时间]恢复服务。

给您带来的不便，我们深表歉意。

After-Sales团队
[时间]
```

**服务恢复**:
```
尊敬的用户：

系统已恢复正常，所有功能现已可用。
感谢您的耐心等待。

如有任何问题，请联系我们的客服团队。

After-Sales团队
[时间]
```

---

## 常见事件处理

### 场景1: 数据库连接池耗尽

**症状**: "Too many connections" 错误

**快速处理**:
```bash
# 1. 终止空闲连接
psql -U admin -d aftersales -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND state_change < now() - interval '30 minutes';
"

# 2. 临时增加连接数
psql -U admin -c "ALTER SYSTEM SET max_connections = 300;"
psql -U admin -c "SELECT pg_reload_conf();"

# 3. 重启应用释放连接
kubectl rollout restart deployment/backend -n after-sales-prod
```

**根本解决**:
- 优化连接池配置
- 修复连接泄漏
- 实施连接监控

### 场景2: 内存泄漏导致OOM

**症状**: Pod频繁重启，内存使用持续增长

**快速处理**:
```bash
# 1. 增加内存限制（临时）
kubectl set resources deployment/backend --limits=memory=8Gi -n after-sales-prod

# 2. 扩容实例分散负载
kubectl scale deployment/backend --replicas=6 -n after-sales-prod

# 3. 启用内存分析
kubectl set env deployment/backend NODE_OPTIONS="--max-old-space-size=6144 --heap-prof" -n after-sales-prod
```

**根本解决**:
- 分析heap dump
- 修复内存泄漏代码
- 添加内存监控告警

### 场景3: 第三方API故障

**症状**: 调用第三方服务超时或失败

**快速处理**:
```bash
# 1. 启用降级模式
kubectl set env deployment/backend FEATURE_FLAG_THIRD_PARTY=false -n after-sales-prod

# 2. 使用缓存数据
kubectl set env deployment/backend USE_CACHED_DATA=true -n after-sales-prod

# 3. 增加超时时间
kubectl set env deployment/backend THIRD_PARTY_TIMEOUT=30000 -n after-sales-prod
```

**根本解决**:
- 实施熔断机制
- 添加重试逻辑
- 准备降级方案

---

## 事后复盘

### 复盘会议

**时间**: 事件解决后24-48小时内

**参与人员**:
- 事件指挥官
- 技术负责人
- 相关开发人员
- 产品负责人（P0/P1）

### 复盘模板

```markdown
# 事件复盘报告 #[编号]

## 基本信息
- **事件级别**: P[级别]
- **发生时间**: [时间]
- **恢复时间**: [时间]
- **影响时长**: [时长]
- **影响范围**: [范围]

## 事件时间线
- [时间] 事件发生
- [时间] 检测到问题
- [时间] 开始响应
- [时间] 实施缓解措施
- [时间] 问题解决
- [时间] 服务恢复

## 根本原因
[详细描述根本原因]

## 影响分析
- 受影响用户数：[数量]
- 业务损失：[估算]
- 数据影响：[描述]

## 做得好的地方
- [列举]

## 需要改进的地方
- [列举]

## 行动项
| 行动项 | 负责人 | 截止日期 | 优先级 |
|--------|--------|----------|--------|
| [行动项1] | @[姓名] | [日期] | P[级别] |
| [行动项2] | @[姓名] | [日期] | P[级别] |

## 经验教训
[总结经验教训]
```

### 改进措施

1. **技术改进**
   - 修复根本原因
   - 增强监控
   - 改进告警
   - 优化架构

2. **流程改进**
   - 更新运维手册
   - 完善应急预案
   - 优化响应流程
   - 加强培训

3. **文档改进**
   - 更新故障排查指南
   - 补充常见问题
   - 完善操作手册

---

## 附录

### 紧急联系方式

| 角色 | 姓名 | 电话 | 邮箱 |
|------|------|------|------|
| 值班工程师 | 轮值 | +86-xxx-xxxx-xxxx | oncall@company.com |
| 技术负责人 | 张三 | +86-xxx-xxxx-xxxx | tech-lead@company.com |
| 运维负责人 | 李四 | +86-xxx-xxxx-xxxx | ops-lead@company.com |
| CTO | 王五 | +86-xxx-xxxx-xxxx | cto@company.com |

### 相关文档

- [运维手册](./OPERATIONS_RUNBOOK.md)
- [故障排查指南](./TROUBLESHOOTING_GUIDE.md)
- [监控配置](./MONITORING_SETUP.md)
- [部署指南](../deployment/DEPLOYMENT_GUIDE.md)

### 工具和系统

- **监控**: https://grafana.after-sales.com
- **告警**: https://prometheus.after-sales.com
- **日志**: https://kibana.after-sales.com
- **工单**: https://jira.company.com/projects/AFTERSALES
- **Slack**: https://company.slack.com/archives/incidents
