# 生产就绪检测与补全记录

更新时间: 2025-02-14

## 已发现的关键缺口

- 账号体系仅有前端演示校验，后端无认证接口与用户表
- Docker Compose 里引用了不存在的 `login.html`
- 数据库初始化脚本缺少 `pgcrypto` 扩展，UUID默认生成可能失败
- 本地 `migration:run` 与 SQL 初始化脚本脱节，生产迁移策略需统一

## 已完成补全

- 后端新增账号体系（用户表、密码哈希、登录/注册/查询当前用户）
- JWT 登录验证，业务路由统一鉴权（支持登录白名单）
- 登录页接入真实认证 API，登录后写入本地 token
- 工作台启动时校验登录态并同步用户信息
- Docker Compose 增加认证环境变量，修正前端挂载文件
- 数据库初始化补充 `pgcrypto` 扩展与用户表迁移
- 演示账号种子：`backend/scripts/seed-demo-user.sql`（demo@aftersales.io / Demo@1234）
- 前端 API 路径与后端路由对齐（/api/requirements、/api/tasks、/api/knowledge 等）
- 需求状态约束与域模型对齐（`004-update-requirement-status.sql`）
- 补齐缺失接口：需求统计/忽略、任务动作
- 补齐缺失接口：会话角色与审计事件（/session/roles, /audit/events）
- RBAC 权限控制：基于 JWT 角色校验 API 权限
- 审计报表：/audit/reports/summary
- 监控告警：/monitoring/alerts（创建/查询/解决）
- 权限面板对接后端：/session/permissions
- 监控与审计前端联调：服务状态监控/生成报告可直连 API
- 审计日志自动记录写操作（POST/PATCH/DELETE）用于报表汇总
- 测试用例沉淀：`tests/WEB_APP_TEST_CASES.md`

## 仍需推进的生产化事项

- 统一 TypeORM 迁移与 SQL 初始化策略（避免环境偏差）
- 完整的权限体系（角色/权限/资源级别控制）
- 基础测试覆盖率与核心场景 E2E 自动化
- 监控告警、审计日志与安全加固策略
