# 生产差距清单与修复优先级矩阵

本文档可在没有其他上线文的情况下直接执行，用于评估当前差距与指导第 1 阶段（替换所有 mock 为真实 API）的落地步骤。

---

## A. 差距清单（按模块）

### 1) 消息与对话
- 状态：已完成（API/DB 已替换 mock）
- 修复：IM 路由落库 + 前端移除 mock 降级：`backend/src/presentation/http/controllers/ImController.ts`, `assets/js/chat/index.js`
- 目标：所有对话/消息/模式切换均走真实数据库与 API

### 2) 客户画像
- 状态：已完成（API-only + 空态处理）
- 修复：移除 mock 兜底与本地数据：`assets/js/customer/index.js`, `assets/js/infrastructure/repositories/CustomerProfileRepository.js`
- 目标：客户信息、互动记录、服务记录全部来自 `/api/customers/*`

### 3) 需求管理
- 状态：已完成（API-only）
- 修复：移除本地 mock 与 localStorage 兜底：`assets/js/requirements/index.js`
- 目标：需求列表/统计/忽略/创建仅走 `/api/requirements*`

### 4) 任务与工单
- 状态：已完成（API-only）
- 修复：任务控制台与质检面板改为真实接口：`assets/js/tasks/index.js`, `assets/js/chat/index.js`
- 目标：任务列表/分配/状态/完成全部走 `/api/tasks*`

### 5) 知识管理 / 知识应用
- 状态：已完成（API-only）
- 修复：知识分类/文档/FAQ/搜索全部接入真实 API，并落库：`assets/js/knowledge/index.js`, `assets/js/knowledge/application.js`
- 目标：分类/文档/FAQ/搜索/语义检索全部接入真实 API

### 6) AI 辅助
- 状态：已完成（API-only）
- 修复：移除降级 mock，统一走 `/im/*` + `/ai/*`：`assets/js/presentation/chat/UnifiedChatController.js`, `assets/js/chat/index.js`, `backend/src/presentation/http/controllers/ImController.ts`
- 目标：AI 分析、情绪、建议全部走 `/ai/*` 与 `/im/*`

### 7) 工具箱 / 报表 / 监控 / 审计
- 状态：已完成（API-only）
- 修复：告警与审计实时拉取：`assets/js/chat/index.js`
- 目标：告警/审计报表真实可用，并形成闭环

### 8) 权限与安全
- 状态：已完成
- 修复：权限来源于后端 RBAC，前端仅展示

### 9) 测试覆盖
- 状态：已完成（见 `tests/WEB_APP_TEST_CASES.md`）
- 目标：至少覆盖登录、对话、客户、需求、任务、知识与监控 7 条核心流程

---

## B. 修复优先级矩阵

| 优先级 | 描述 | 影响 | 示例 |
|---|---|---|---|
| P0 | 阻塞投产 | 生产不可用 | mock 数据、关键 API 未落库 |
| P1 | 高风险 | 生产风险 | 权限不一致、审计不完整 |
| P2 | 中风险 | 体验/性能问题 | 降级逻辑混乱、缺少空态 |
| P3 | 低风险 | 可后置 | 文案、次级交互优化 |

**P0 列表**  
- IM/对话 mock → 真实 DB  
- 客户画像 mock → 真实 API  
- 需求/任务 mock → 真实 API  
- 知识管理/应用 mock → 真实 API  
- AI 分析/情绪 mock → 真实 API  

**P1 列表**  
- RBAC 前端与后端一致  
- 审计自动记录写操作可报表  
- 监控告警闭环处理  

---

## C. 第 1 阶段执行计划（替换所有 mock 为真实 API）

### C1. 环境准备（一次性）
1. 复制环境变量并配置数据库
```bash
cp backend/.env.example backend/.env
```

2. 启动数据库与缓存（Docker）
```bash
docker-compose up -d postgres redis
```

3. 初始化数据库结构
```bash
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/001-init-database.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/002-add-conversation-mode.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/003-create-users.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/004-update-requirement-status.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/005-create-audit-events.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/006-add-user-phone.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/007-align-users-schema.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/008-add-customer-profile-columns.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/009-add-requirement-customer-id.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/010-seed-customer-profiles.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/011-create-monitoring-alerts.sql
psql -U admin -d aftersales -f backend/src/infrastructure/database/migrations/012-create-knowledge-items.sql
```

4. 写入演示账号
```bash
psql -U admin -d aftersales -f backend/scripts/seed-demo-user.sql
```

5. 启动后端与前端
```bash
docker-compose up -d backend frontend
```

### C2. Mock 替换顺序（按依赖链）
1. IM 对话与消息（后端去 mock，前端移除 mock 降级）✅ 已完成
2. 客户画像（前端不再使用本地 mock）✅ 已完成
3. 需求管理（移除 `ensureMockData` 兜底）✅ 已完成
4. 任务管理（移除 mock 列表与本地数据）✅ 已完成
5. 知识管理/应用（对接真实搜索、分类与文档）✅ 已完成
6. AI 分析（统一走真实 AI/情绪接口）✅ 已完成

### C3. 验证清单
- 登录后 `/api/v1/session/permissions` 返回角色权限
- 对话列表 / 消息 / 模式切换均返回 200 且数据入库
- 客户画像 `/api/customers/:id` 返回真实数据
- 需求列表 / 统计可用
- 任务列表 / 状态更新可用
- 知识搜索 / 详情可用
- AI 分析 / 情绪可用
- 审计汇总 `/audit/reports/summary` 有写入量
- 监控告警可创建/解决

---

## D. 回滚策略

1. 功能回滚  
   - 切回 mock 分支或临时开关降级逻辑  
2. 数据回滚  
   - 按表清理：`TRUNCATE conversations, messages, requirements, tasks, knowledge_items;`
3. 服务回滚  
   - 使用上一个稳定镜像标签或 Git Tag

---

## E. 交付标准（最小上线）

- 所有 P0 功能已替换为真实 API
- 所有 P1 权限/审计/告警可用
- `tests/WEB_APP_TEST_CASES.md` 的关键路径全部通过
