# 前端功能不可用问题分析与解决方案

**问题现状**: 前端页面多数功能不可点击，疑似使用Mock数据  
**实际情况**: 前端既不依赖本地Mock，也不运行演示服务器，而是调用真实后端接口  
**问题根因**: 后端数据库连接失败 → API不可用 → 前端功能无响应

---

## ⚙️ 接口与数据策略

1. **真实接口走向生产**：前端/后端的所有交互都基于 `http://localhost:8080` 等真实服务地址，不加载开发用的 `mockdata` 文件或工具包，接口路径、认证、超时策略必须与生产保持一致。
2. **缺数据时提供真实接口的补充源**：当后端服务启动但缺少初始数据（例如知识库条目、AI分析结果、任务模板等），可以通过现有的 `POST/PUT` 创建接口或一个简易的“样例数据加载”脚本将样例记录写入数据库，仍然走真实API路径；这比前端 mock 更接近投产场景，且不会触发 “演示模式”。
3. **数据准备思路**：推荐维护一套可重用的 `curl`/`npm script` 调用链，串联下列接口生成数据（可根据后端现有表结构扩展）：
   - `POST /knowledge` 创建知识卡片，模拟搜索命中
   - `POST /requirements` 生成需求条目
   - `POST /tasks` 创建任务 + `POST /tasks/{id}/actions` 模拟工作流
   - `POST /im/conversations`、`POST /im/conversations/{id}/messages` 填充对话历史
   - `POST /profiles/{customerId}/refresh` 触发画像数据刷新
   这些调用使用真实API与授权机制（如Bearer Token），可以做为后台人手动执行的“预热”任务。

如果需要更自动化，可以在后端添加一个临时的 `scripts/seed-sample-data.ts`（或等价的 Fastify route）封装上述调用，但该脚本本质仍是调用真实服务，创建的数据写入真实数据库而非静态JSON。只要避免在前端添加 `demo` 组件或 `mock` 拦截，就能保证投入生产的真实感。

## 🔍 问题分析

### 一、前端架构分析

**前端实现情况**（经过代码审查）：

✅ **前端使用真实API调用，而非Mock数据**

证据：
1. **API客户端完整实现** (`assets/js/api.js`)
   - 支持HTTP请求（GET/POST/PATCH/DELETE）
   - 支持超时控制（30秒）
   - 支持自动重试（最多3次，指数退避）
   - 支持JWT认证（Bearer Token）
   - 完整的错误处理和日志记录

2. **DDD架构完整** (`assets/js/application/container/bootstrap.js`)
   - 依赖注入容器（DIContainer）
   - 5个应用服务（对话、客户、需求、任务、知识）
   - 5个仓储实现（基于真实API）
   - 事件总线（EventBus）

3. **19个真实API端点调用**：
   ```javascript
   // 对话相关
   /im/conversations                         - 获取对话列表
   /im/conversations/{id}/messages           - 获取/发送消息
   /im/conversations/{id}/status             - 更新对话状态

   // 客户画像
   /profiles/{customerId}                    - 获取客户画像
   /profiles/{customerId}/interactions       - 获取交互记录
   /profiles/{customerId}/refresh            - 刷新画像

   // 需求管理
   /requirements                             - 获取/创建需求
   /requirements/{id}/ignore                 - 忽略需求
   /requirements/statistics                  - 需求统计

   // 任务管理
   /tasks                                    - 获取/创建任务
   /tasks/{id}/actions                       - 任务操作

   // 质检
   /quality/{conversationId}                 - 质量评估

   // AI服务
   /ai/analyze                               - AI分析
   /ai/solutions                             - AI方案

   // 知识库
   /knowledge                                - 知识查询
   /knowledge/{id}/preview                   - 知识预览
   /knowledge/{id}/full                      - 完整知识

   // 其他
   /session/roles                            - 角色权限
   /audit/events                             - 审计事件
   ```

### 二、问题根因

**前端功能不可用的真实原因**：

❌ **后端服务未启动** → API调用全部失败 → 前端功能无响应

```
用户操作 → 前端事件 → API调用 → ❌ 网络错误 → 功能失效
```

**后端无法启动的原因**：

```bash
❌ PostgreSQL数据库未运行（端口5432连接被拒绝）
   ↓
❌ 后端启动失败
   ↓
❌ API端点不可用
   ↓
❌ 前端功能无法使用
```

### 三、当前系统状态

| 组件 | 状态 | 端口 | 说明 |
|------|------|------|------|
| 前端服务 | ✅ 运行中 | 3000 | Vite开发服务器正常 |
| 后端服务 | ❌ 启动失败 | 8080 | 数据库连接失败 |
| PostgreSQL | ❌ 未运行 | 5432 | 需要启动 |
| Redis | ❌ 未运行 | 6379 | 需要启动（可选） |

---

## 🔧 解决方案

### 【方案一】快速启动 - 使用Docker（推荐）⏰ 5分钟

**优势**：一键启动所有服务，无需手动配置

#### 步骤1：启动数据库和Redis

```bash
cd /Users/zqs/Downloads/project/After-sales

# 启动PostgreSQL和Redis
docker-compose up -d postgres redis

# 等待服务就绪（约10秒）
sleep 10

# 验证服务状态
docker-compose ps
```

#### 步骤2：配置环境变量

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 环境变量已配置好默认值，无需修改
# DATABASE_URL=postgresql://admin:admin123@localhost:5432/aftersales
# REDIS_URL=redis://localhost:6379
```

#### 步骤3：初始化数据库

```bash
cd backend

# 运行数据库迁移（创建表结构）
npm run migration:run

# 如果迁移失败，可能需要先生成迁移文件
npm run migration:generate
```

#### 步骤4：重启后端服务

```bash
# 停止之前失败的后端进程
pkill -f "tsx watch"

# 启动后端（在backend目录）
npm run dev
```

#### 步骤5：验证系统

```bash
# 验证后端健康检查
curl http://localhost:8080/health

# 预期输出：
# {"status":"ok","timestamp":"2025-12-16T..."}

# 访问前端
open http://localhost:3000
```

**完成后**：所有功能应该正常工作 ✅

---

### 【方案二】完整Docker部署 - 一键启动所有服务 ⏰ 2分钟

**优势**：包含前端、后端、数据库、监控的完整环境

```bash
cd /Users/zqs/Downloads/project/After-sales

# 一键启动所有服务（前端+后端+数据库+监控）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问服务
# 前端: http://localhost:3000
# 后端: http://localhost:8080
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
```

---

### 【方案三】本地开发环境 - 不使用Docker ⏰ 10分钟

**适用场景**：需要调试代码，不想用Docker

#### 前置条件

1. **安装PostgreSQL 15**
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15

   # 创建数据库和用户
   psql postgres
   CREATE DATABASE aftersales;
   CREATE USER admin WITH PASSWORD 'admin123';
   GRANT ALL PRIVILEGES ON DATABASE aftersales TO admin;
   \q
   ```

2. **安装Redis（可选）**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   ```

#### 启动步骤

```bash
# 1. 配置环境变量
cd backend
cp .env.example .env
# 无需修改，默认配置已正确

# 2. 运行数据库迁移
npm run migration:run

# 3. 启动后端
npm run dev

# 4. 启动前端（新终端）
cd ..
npm run dev

# 5. 访问
open http://localhost:3000
```

---

## 🎯 问题定位流程

### 如何判断问题是前端还是后端？

运行以下诊断命令：

```bash
# 1. 检查前端是否运行
curl -s http://localhost:3000 > /dev/null && echo "✅ 前端正常" || echo "❌ 前端异常"

# 2. 检查后端是否运行
curl -s http://localhost:8080/health > /dev/null && echo "✅ 后端正常" || echo "❌ 后端异常"

# 3. 检查数据库是否运行
pg_isready -h localhost -p 5432 && echo "✅ 数据库正常" || echo "❌ 数据库异常"

# 4. 检查Redis是否运行（可选）
redis-cli ping > /dev/null 2>&1 && echo "✅ Redis正常" || echo "❌ Redis异常"
```

### 浏览器控制台错误诊断

打开浏览器开发者工具（F12），查看Console和Network标签：

**错误类型1：网络错误**
```
Network Error: Failed to fetch
ERR_CONNECTION_REFUSED
```
**原因**：后端服务未启动
**解决**：启动后端服务（见方案一）

**错误类型2：404 Not Found**
```
GET http://localhost:8080/api/conversations 404 (Not Found)
```
**原因**：API端点路径不匹配
**解决**：检查前端API路径与后端路由是否一致

**错误类型3：500 Internal Server Error**
```
POST http://localhost:8080/api/conversations 500 (Internal Server Error)
```
**原因**：后端业务逻辑错误或数据库连接失败
**解决**：查看后端日志 `docker-compose logs backend`

---

## 📋 前端功能清单

### 已实现的前端功能（需要后端支持）

| 功能模块 | 前端状态 | 后端状态 | 依赖服务 |
|---------|---------|---------|---------|
| 对话列表 | ✅ 已实现 | ✅ API完成 | 数据库 |
| 发送消息 | ✅ 已实现 | ✅ API完成 | 数据库 |
| 客服分配 | ✅ 已实现 | ✅ API完成 | 数据库 |
| 客户画像 | ✅ 已实现 | ✅ API完成 | 数据库 |
| 需求管理 | ✅ 已实现 | ✅ API完成 | 数据库 |
| 任务管理 | ✅ 已实现 | ✅ API完成 | 数据库 |
| 知识库搜索 | ✅ 已实现 | ⚠️ 需配置 | TaxKB API |
| AI分析 | ✅ 已实现 | ⚠️ 需配置 | AI服务 |
| 质检评分 | ✅ 已实现 | ✅ API完成 | 数据库 |
| 历史记录 | ✅ 已实现 | ✅ API完成 | 数据库 |

### 部分功能的UI交互待完善

以下功能前端有框架，但交互逻辑可能不完整：

- ⚠️ 报表统计图表（Chart.js需要真实数据）
- ⚠️ 实时消息推送（需要WebSocket）
- ⚠️ 文件上传（需要后端multipart支持）
- ⚠️ 批量操作（前端UI待完善）

---

## 🚦 启动后的功能验证

### 核心功能测试清单

启动系统后，按照以下步骤验证功能：

#### 1. 对话管理（5分钟）

- [ ] 打开前端页面 http://localhost:3000
- [ ] 左侧显示对话列表（如果无数据，会显示空状态）
- [ ] 点击一个对话项，右侧显示对话详情
- [ ] 输入消息并发送（测试消息发送功能）
- [ ] 点击"分配客服"按钮（测试客服分配）

#### 2. 客户画像（3分钟）

- [ ] 点击右上角"打开分析面板"
- [ ] 切换到"客户信息"标签页
- [ ] 查看客户基本信息、合同金额、满意度等
- [ ] 点击"刷新画像"按钮（测试API调用）

#### 3. 需求管理（3分钟）

- [ ] 切换到"需求统计"标签页
- [ ] 点击"重新扫描对话需求"
- [ ] 查看需求列表和统计数据
- [ ] 创建新需求（测试表单提交）

#### 4. 任务管理（3分钟）

- [ ] 点击左侧"任务"标签
- [ ] 查看任务列表
- [ ] 创建新任务
- [ ] 点击"查看"、"编辑"、"删除"按钮

#### 5. 知识库（2分钟）

- [ ] 切换到"知识库"标签页
- [ ] 输入搜索关键词
- [ ] 查看知识卡片列表
- [ ] 点击"查看详情"展开知识预览

---

## 🔄 如果仍然有问题

### 场景1：后端启动但API仍然失败

**可能原因**：
- 前后端API路径不匹配
- CORS配置问题
- 端口冲突

**解决步骤**：

```bash
# 1. 检查后端路由
cd backend
grep -r "app.register" src/presentation/http/routes/

# 2. 检查CORS配置
# 编辑 backend/src/app.ts
# 确保 CORS_ORIGIN 包含 http://localhost:3000

# 3. 检查端口占用
lsof -i :8080
lsof -i :3000
```

### 场景2：数据库连接超时

**可能原因**：
- PostgreSQL服务未完全启动
- 防火墙阻止连接
- 数据库密码错误

**解决步骤**：

```bash
# 1. 验证数据库连接
psql -h localhost -p 5432 -U admin -d aftersales
# 输入密码：admin123

# 2. 检查Docker容器状态
docker-compose ps postgres
docker-compose logs postgres

# 3. 重启数据库
docker-compose restart postgres
```

### 场景3：前端显示但按钮无响应

**可能原因**：
- JavaScript错误
- API调用失败但未显示错误
- 事件监听器未绑定

**解决步骤**：

```bash
# 1. 打开浏览器开发者工具（F12）
# 2. 查看Console标签的错误信息
# 3. 查看Network标签，确认API请求状态

# 4. 如果有JavaScript错误，尝试清理缓存
# Chrome: Cmd+Shift+R（macOS）或 Ctrl+Shift+R（Windows）
```

---

## 📊 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户浏览器                            │
│                    http://localhost:3000                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP/AJAX
                           │ (真实API调用，非Mock)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      后端API服务                              │
│                  http://localhost:8080                       │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 对话管理API  │  │  客户画像API  │  │  需求管理API  │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │ 任务管理API  │  │  知识库API    │                          │
│  └─────────────┘  └──────────────┘                          │
└──────────────┬────────────────────┬─────────────────────────┘
               │                    │
               │                    │
               ↓                    ↓
    ┌──────────────────┐   ┌──────────────────┐
    │   PostgreSQL     │   │      Redis       │
    │   localhost:5432 │   │  localhost:6379  │
    │   (必需)          │   │   (可选)          │
    └──────────────────┘   └──────────────────┘
```

---

## 🎓 技术说明

### 前端为什么不用Mock数据？

**设计理念**：
1. **真实环境测试**：确保前后端集成始终正确
2. **DDD架构实践**：仓储层直接对接真实API
3. **快速反馈**：发现API问题更早

**与Mock数据对比**：

| 方案 | 优势 | 劣势 |
|------|------|------|
| Mock数据 | 前端独立开发 | 集成时发现大量问题 |
| 真实API | 持续集成，早期发现问题 | 依赖后端服务 |

**本项目选择**：真实API调用，配合完整的错误处理和重试机制

### API客户端特性

```javascript
// assets/js/api.js 的关键特性

✅ 超时控制: 30秒
✅ 自动重试: 最多3次，指数退避
✅ JWT认证: Bearer Token
✅ 错误处理: 统一错误格式
✅ 日志记录: 详细的请求日志
✅ 可配置: window.config.apiBaseUrl
```

---

## 📞 获取帮助

### 日志位置

```bash
# 后端日志
cd backend
npm run dev
# 日志输出到控制台

# Docker日志
docker-compose logs -f backend
docker-compose logs -f postgres

# 前端日志
# 浏览器开发者工具 -> Console
```

### 常见错误代码

| 错误代码 | 含义 | 解决方案 |
|---------|------|---------|
| ERR_CONNECTION_REFUSED | 服务未启动 | 启动后端服务 |
| 404 Not Found | API路径错误 | 检查路由配置 |
| 500 Internal Server Error | 后端业务错误 | 查看后端日志 |
| 401 Unauthorized | 认证失败 | 检查JWT配置 |
| 503 Service Unavailable | 数据库连接失败 | 检查数据库状态 |

---

## ✅ 总结

### 问题根因

❌ **不是前端使用Mock数据**
✅ **是后端服务未启动，导致API调用失败**

### 解决步骤

1. **启动数据库**: `docker-compose up -d postgres redis`
2. **初始化数据库**: `npm run migration:run`
3. **启动后端**: `npm run dev`
4. **验证功能**: 打开浏览器测试各项功能

### 预期结果

- ✅ 后端健康检查通过
- ✅ 前端API调用成功
- ✅ 对话、客户、需求、任务功能正常
- ⚠️ 知识库和AI功能需要配置外部服务

---

**最后更新**: 2025-12-16
**文档版本**: v1.0
