# 智能售后工作台 - 投产就绪计划

**版本**: v1.0
**日期**: 2025-12-16
**项目评分**: 73/100（可生产，需补充集成和测试）

---

## 📊 项目完成度总览

| 模块 | 完成度 | 状态 | 说明 |
|------|--------|------|------|
| **后端核心** | ✅ 95% | 生产就绪 | 5大核心上下文100%完成，31个API端点 |
| **前端架构** | ⚠️ 65% | 部分完成 | DDD架构完整，部分UI交互待完善 |
| **测试覆盖** | ❌ 40% | 不足 | 需提升至80%+ |
| **外部集成** | ⚠️ 30% | 待配置 | TaxKB、IM、AI服务需集成 |
| **基础设施** | ✅ 85% | 生产就绪 | Docker完整，监控待完善 |

**综合评分**: 73/100

---

## 🎯 三阶段投产计划

### 【阶段一】立即行动（1-2周）- MVP上线准备

#### 目标：最小可用版本（MVP）投产

**必须完成的工作**：

1. **环境配置完成** ⏰ 1天
   - [ ] 复制 `.env.example` 为 `.env` 并配置生产参数
   - [ ] 配置PostgreSQL数据库连接
   - [ ] 配置Redis缓存
   - [ ] 生成JWT密钥（强密码）

2. **数据库初始化** ⏰ 1天
   - [ ] 运行数据库迁移脚本
   - [ ] 验证7张核心表创建成功
   - [ ] 导入初始数据（系统配置、角色权限等）

3. **API端点验证** ⏰ 2天
   - [ ] 测试所有31个API端点
   - [ ] 验证前后端接口匹配
   - [ ] 修复对接问题

4. **TaxKB知识库集成** ⏰ 3天
   - [ ] 获取TaxKB API密钥（需用户提供）
   - [ ] 配置 `TAXKB_BASE_URL` 和 `TAXKB_API_KEY`
   - [ ] 测试知识库搜索和上传功能
   - [ ] 验证数据映射正确性

5. **核心流程E2E测试** ⏰ 3天
   - [ ] 对话创建→消息发送→客服分配→对话关闭
   - [ ] 客户画像查询→健康度评分
   - [ ] 需求检测→需求分配→需求完成
   - [ ] 任务创建→任务分配→任务完成
   - [ ] 知识库搜索→知识推荐

6. **生产部署验证** ⏰ 1天
   - [ ] 使用Docker Compose一键启动全部服务
   - [ ] 验证Nginx反向代理配置
   - [ ] 验证Prometheus和Grafana监控
   - [ ] 压力测试（并发100用户）

**阶段一交付物**：
- ✅ 可独立运行的MVP系统
- ✅ 核心功能（对话、客户、需求、任务）可用
- ✅ TaxKB知识库集成完成
- ✅ 基础监控就绪

---

### 【阶段二】功能完善（2-4周）- 企业级增强

#### 目标：补全企业级功能，提升稳定性

**必须完成的工作**：

7. **测试覆盖提升** ⏰ 5天
   - [ ] 补充单元测试至80%覆盖率
   - [ ] 补充集成测试（10个Use Cases）
   - [ ] 补充E2E测试（完整业务流程）
   - [ ] 添加错误场景测试

8. **飞书IM集成** ⏰ 5天
   - [ ] 获取飞书开放平台应用ID和密钥（需用户提供）
   - [ ] 实现飞书机器人WebSocket连接
   - [ ] 实现消息接收和发送
   - [ ] 实现消息同步到系统对话
   - [ ] 测试双向消息流转

9. **AI服务集成** ⏰ 4天
   - [ ] 确定AI服务提供商（OpenAI/Azure/自建）
   - [ ] 配置 `AI_SERVICE_URL` 和 `AI_SERVICE_API_KEY`
   - [ ] 实现对话分析接口
   - [ ] 实现AI解决方案推荐
   - [ ] 实现情绪识别和紧急度评估

10. **权限管理系统** ⏰ 4天
    - [ ] 实现RBAC（基于角色的访问控制）
    - [ ] 定义角色：超级管理员、客服主管、普通客服、质检员
    - [ ] 实现API端点权限拦截
    - [ ] 实现前端路由权限控制

11. **实时通信层** ⏰ 5天
    - [ ] 实现WebSocket服务器
    - [ ] 实现实时消息推送
    - [ ] 实现在线状态同步
    - [ ] 实现未读消息提醒
    - [ ] 前端WebSocket客户端集成

12. **监控和告警** ⏰ 3天
    - [ ] 配置Prometheus指标采集
    - [ ] 配置Grafana仪表板
    - [ ] 配置告警规则（CPU、内存、响应时间、错误率）
    - [ ] 集成Sentry错误追踪

**阶段二交付物**：
- ✅ 测试覆盖率80%+
- ✅ 飞书IM双向集成
- ✅ AI辅助决策功能
- ✅ RBAC权限管理
- ✅ 实时消息推送
- ✅ 完整监控告警

---

### 【阶段三】优化增强（1-2个月）- 企业级生产

#### 目标：性能优化、高级功能、运维自动化

13. **性能优化** ⏰ 1周
    - [ ] 数据库查询优化（索引、分页）
    - [ ] Redis缓存策略细化
    - [ ] API响应时间优化（目标<500ms）
    - [ ] 前端资源懒加载
    - [ ] CDN集成

14. **高级报表** ⏰ 1周
    - [ ] 客户健康度趋势分析
    - [ ] 客服工作量统计
    - [ ] SLA达成率报表
    - [ ] 需求漏斗分析
    - [ ] 自定义报表生成器

15. **批量操作** ⏰ 3天
    - [ ] 批量导入客户
    - [ ] 批量导入知识库
    - [ ] 批量任务分配
    - [ ] Excel导入导出

16. **运维自动化** ⏰ 1周
    - [ ] CI/CD流水线（GitHub Actions / Jenkins）
    - [ ] 自动化测试
    - [ ] 自动化部署
    - [ ] 数据库备份自动化
    - [ ] 日志收集和分析（ELK）

17. **文档完善** ⏰ 3天
    - [ ] OpenAPI/Swagger API文档
    - [ ] 运维手册
    - [ ] 用户使用手册
    - [ ] 故障排查手册

**阶段三交付物**：
- ✅ 高性能生产系统
- ✅ 完整的BI分析
- ✅ 自动化运维
- ✅ 完整文档

---

## 🔑 需要您提供的配置和密钥清单

### 1. TaxKB 知识库系统

**必需配置**：
```bash
TAXKB_ENABLED=true
TAXKB_BASE_URL=<您的TaxKB服务地址>
TAXKB_API_KEY=<您的API密钥>
```

**需要您提供的信息**：
- [ ] TaxKB服务器地址（例如：`http://taxkb.example.com/api/v3`）
- [ ] API密钥（在TaxKB管理后台生成）
- [ ] 超时配置（默认30秒，可调整）
- [ ] 是否启用缓存（建议启用，默认5分钟TTL）

**参考文档**：
- 项目内文档：`/docs/TAXKB_INTEGRATION_SOLUTION.md`
- TaxKB API文档：`/docs/TaxKB-API-v3.1-使用说明.md`

---

### 2. 飞书开放平台

**必需配置**：
```bash
FEISHU_APP_ID=<您的飞书应用ID>
FEISHU_APP_SECRET=<您的飞书应用密钥>
FEISHU_WEBHOOK_URL=<可选：机器人Webhook地址>
```

**需要您提供的信息**：
- [ ] 飞书企业自建应用的App ID
- [ ] 飞书应用密钥（App Secret）
- [ ] （可选）机器人Webhook URL（用于快速通知）

**飞书开放平台申请步骤**：
1. 访问：https://open.feishu.cn/
2. 创建企业自建应用
3. 配置权限范围（im:message, im:message:send_as_bot）
4. 获取App ID和App Secret
5. 配置事件回调URL（您的后端地址 + `/api/feishu/webhook`）

**需要配置的权限**：
- `im:message` - 接收消息
- `im:message:send_as_bot` - 发送消息
- `im:chat` - 获取群聊信息

---

### 3. AI 服务提供商

**选项一：OpenAI API**
```bash
AI_SERVICE_PROVIDER=openai
AI_SERVICE_URL=https://api.openai.com/v1
AI_SERVICE_API_KEY=<您的OpenAI API密钥>
AI_MODEL=gpt-4  # 或 gpt-3.5-turbo
```

**选项二：Azure OpenAI**
```bash
AI_SERVICE_PROVIDER=azure
AI_SERVICE_URL=https://<your-resource-name>.openai.azure.com
AI_SERVICE_API_KEY=<您的Azure API密钥>
AI_DEPLOYMENT_NAME=<您的部署名称>
```

**选项三：自建AI服务**
```bash
AI_SERVICE_PROVIDER=custom
AI_SERVICE_URL=<您的自建服务地址>
AI_SERVICE_API_KEY=<您的API密钥>
```

**需要您提供的信息**：
- [ ] 选择AI服务提供商
- [ ] API密钥
- [ ] 服务地址（Azure需要）
- [ ] 模型名称/部署名称

---

### 4. 数据库配置（生产环境）

**PostgreSQL**：
```bash
DATABASE_HOST=<生产数据库地址>
DATABASE_PORT=5432
DATABASE_NAME=aftersales_prod
DATABASE_USER=<数据库用户名>
DATABASE_PASSWORD=<强密码>
DATABASE_SSL=true  # 生产环境建议启用
```

**Redis**：
```bash
REDIS_HOST=<生产Redis地址>
REDIS_PORT=6379
REDIS_PASSWORD=<Redis密码>
REDIS_TLS=true  # 生产环境建议启用
```

**需要您提供的信息**：
- [ ] PostgreSQL服务器地址（可使用云服务，如AWS RDS、阿里云RDS）
- [ ] 数据库用户名和密码（建议使用强密码）
- [ ] Redis服务器地址（可使用云服务，如AWS ElastiCache、阿里云Redis）
- [ ] Redis密码

---

### 5. 安全配置

**JWT密钥**：
```bash
JWT_SECRET=<生成强随机密钥，建议64位以上>
JWT_EXPIRES_IN=7d  # 令牌有效期
```

**生成强密钥示例**（在命令行执行）：
```bash
# 生成64位随机字符串
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 6. 监控和日志（可选，建议配置）

**Sentry 错误追踪**：
```bash
SENTRY_DSN=<您的Sentry项目DSN>
SENTRY_ENVIRONMENT=production
```

获取方式：
1. 访问 https://sentry.io/
2. 创建项目
3. 复制DSN

**日志级别**：
```bash
LOG_LEVEL=info  # 生产环境建议使用 info 或 warn
```

---

### 7. 其他可选集成

**企业微信**（如需集成）：
```bash
WECHAT_CORP_ID=<企业ID>
WECHAT_APP_SECRET=<应用密钥>
WECHAT_AGENT_ID=<应用AgentId>
```

**钉钉**（如需集成）：
```bash
DINGTALK_APP_KEY=<应用AppKey>
DINGTALK_APP_SECRET=<应用AppSecret>
```

**客户画像平台**（如需对接）：
```bash
PORTRAIT_PLATFORM_URL=<画像平台地址>
PORTRAIT_PLATFORM_API_KEY=<API密钥>
```

---

## 📋 完整环境变量配置模板

```bash
# ===== 应用配置 =====
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# ===== 数据库配置（必需） =====
DATABASE_HOST=<请提供>
DATABASE_PORT=5432
DATABASE_NAME=aftersales_prod
DATABASE_USER=<请提供>
DATABASE_PASSWORD=<请提供>
DATABASE_SSL=true
DATABASE_URL=postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?sslmode=require

# ===== Redis配置（必需） =====
REDIS_HOST=<请提供>
REDIS_PORT=6379
REDIS_PASSWORD=<请提供>
REDIS_TLS=true
REDIS_URL=rediss://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}

# ===== JWT安全（必需） =====
JWT_SECRET=<请生成强随机密钥>
JWT_EXPIRES_IN=7d

# ===== TaxKB知识库（必需） =====
TAXKB_ENABLED=true
TAXKB_BASE_URL=<请提供>
TAXKB_API_KEY=<请提供>
TAXKB_TIMEOUT=30000
TAXKB_CACHE_ENABLED=true
TAXKB_CACHE_TTL=300
TAXKB_RETRY_MAX_ATTEMPTS=3

# ===== 飞书IM（必需） =====
FEISHU_APP_ID=<请提供>
FEISHU_APP_SECRET=<请提供>
FEISHU_WEBHOOK_URL=<可选>

# ===== AI服务（必需） =====
AI_SERVICE_PROVIDER=openai  # 或 azure / custom
AI_SERVICE_URL=<请提供>
AI_SERVICE_API_KEY=<请提供>
AI_MODEL=gpt-4  # 或 gpt-3.5-turbo

# ===== 监控（推荐） =====
SENTRY_DSN=<可选>
SENTRY_ENVIRONMENT=production
PROMETHEUS_ENABLED=true

# ===== CORS配置 =====
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true

# ===== 文件上传 =====
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=/app/uploads
```

---

## 🚀 快速启动指令

### 方式一：Docker一键启动（推荐）

```bash
# 1. 克隆代码（如果尚未克隆）
git clone <repository-url>
cd After-sales

# 2. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入上述配置

# 3. 启动所有服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f

# 5. 验证服务
curl http://localhost:8080/health
curl http://localhost:3000

# 6. 访问监控
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
```

### 方式二：本地开发

```bash
# 1. 安装依赖
npm install
cd backend && npm install

# 2. 启动数据库和Redis
docker-compose up -d postgres redis

# 3. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env

# 4. 运行数据库迁移
cd backend
npm run migration:run

# 5. 启动后端（终端1）
npm run dev

# 6. 启动前端（终端2）
cd ..
npm run dev

# 7. 访问
# 前端: http://localhost:3000
# 后端: http://localhost:8080
```

---

## ✅ 验证清单

### 系统启动验证
- [ ] Docker容器全部Running
- [ ] PostgreSQL连接成功
- [ ] Redis连接成功
- [ ] 后端健康检查通过：`curl http://localhost:8080/health`
- [ ] 前端页面正常加载：访问 `http://localhost:3000`

### 核心功能验证
- [ ] 用户可以查看对话列表
- [ ] 用户可以创建新对话
- [ ] 用户可以发送消息
- [ ] 客户画像正常显示
- [ ] 知识库搜索返回结果（需TaxKB配置）
- [ ] 任务可以创建和分配
- [ ] 需求可以检测和管理

### API验证
- [ ] 所有31个API端点响应正常
- [ ] 错误处理返回友好提示
- [ ] JWT认证正常工作
- [ ] CORS配置正确

### 外部集成验证
- [ ] TaxKB知识库搜索成功
- [ ] 飞书消息接收和发送成功
- [ ] AI分析返回正确结果
- [ ] 监控指标正常采集

---

## 🐛 已知问题和解决方案

### 问题1：数据库连接失败
**症状**：`ECONNREFUSED ::1:5432`

**解决方案**：
```bash
# 检查PostgreSQL是否启动
docker-compose ps postgres

# 重启PostgreSQL
docker-compose restart postgres

# 查看日志
docker-compose logs postgres
```

### 问题2：前端API调用失败
**症状**：前端显示网络错误

**解决方案**：
1. 检查后端是否启动：`curl http://localhost:8080/health`
2. 检查CORS配置：确认 `backend/.env` 中 `CORS_ORIGIN` 包含前端地址
3. 检查浏览器控制台错误信息

### 问题3：TaxKB集成失败
**症状**：知识库搜索无结果

**解决方案**：
1. 验证TaxKB配置：
```bash
curl -H "Authorization: Bearer $TAXKB_API_KEY" $TAXKB_BASE_URL/health
```
2. 检查API密钥是否正确
3. 检查网络连通性（防火墙、VPN）

---

## 📞 支持和联系

**技术支持**：
- 文档位置：`/docs/`
- 问题反馈：GitHub Issues
- API文档：启动后访问 `http://localhost:8080/documentation`（需实现Swagger）

**紧急问题排查**：
1. 查看应用日志：`docker-compose logs -f backend`
2. 查看数据库日志：`docker-compose logs -f postgres`
3. 查看监控仪表板：`http://localhost:3001`

---

## 📊 项目指标和目标

### 当前指标
- 代码行数：~15,000行（TypeScript + JavaScript）
- API端点：31个
- 测试用例：30个
- 测试覆盖率：40%

### 目标指标（阶段二完成后）
- 测试覆盖率：80%+
- API响应时间：<500ms (P95)
- 系统可用性：99.9%
- 并发支持：500+用户

---

**最后更新**: 2025-12-16
**版本**: v1.0
