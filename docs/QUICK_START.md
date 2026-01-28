# 🚀 快速开始指南

本指南帮助你在5分钟内启动项目并验证所有功能（本地开发模式）。

---

## 📋 前置条件

确保以下服务已安装并运行：

- ✅ Node.js 18+
- ✅ PostgreSQL 15+
- ✅ Redis 7+
- ✅ npm 或 yarn

---

## ⚡ 5分钟快速启动

### 步骤1：安装依赖（1分钟）

```bash
cd backend
npm install
```

### 步骤2：配置环境（1分钟）

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑.env文件，至少配置以下必需项：
# DATABASE_URL=postgresql://admin:admin123@localhost:5432/aftersales
# REDIS_URL=redis://:redis123@localhost:6379
# JWT_SECRET=your-secret-key-change-in-production
```

### 步骤3：创建数据库（1分钟）

```bash
# 方式1：使用自动化脚本（推荐）
chmod +x backend/scripts/setup-test-db.sh
backend/scripts/setup-test-db.sh

# 方式2：手动创建
createdb aftersales
cd backend
npm run migration:run
```

### 步骤4：启动服务（1分钟）

```bash
# 开发模式
npm run dev

# 或者先构建再启动
npm run build
npm start
```

### 步骤5：验证部署（1分钟）

打开浏览器访问：

1. **健康检查**: http://localhost:8080/health
   - 应该返回: `{"status":"ok"}`

2. **API文档**: http://localhost:8080/docs
   - 应该看到Swagger UI界面

3. **测试API**: 在Swagger UI中测试登录接口
   ```json
   POST /api/v1/api/auth/login
   {
     "username": "admin",
     "password": "admin123"
   }
   ```

---

## 🧪 验证新功能

### 1. 验证WebSocket服务

```javascript
// 在浏览器控制台运行
const ws = new WebSocket('ws://localhost:8080/ws/reviews');

ws.onopen = () => console.log('✅ WebSocket连接成功');
ws.onmessage = (e) => console.log('收到消息:', JSON.parse(e.data));
ws.onerror = (e) => console.error('❌ WebSocket错误:', e);

// 发送ping测试
ws.send(JSON.stringify({ type: 'ping' }));
```

### 2. 验证IM适配器（需要飞书配置）

```bash
# 配置飞书环境变量
export FEISHU_APP_ID=your-app-id
export FEISHU_APP_SECRET=your-app-secret
export FEISHU_ENABLED=true

# 重启服务
npm run dev
```

### 3. 验证任务智能分配

```bash
# 创建任务（不指定assigneeId）
curl -X POST http://localhost:8080/api/v1/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "修复数据库性能问题",
    "type": "数据库优化",
    "priority": "high"
  }'

# 查看日志，应该看到：
# "任务已自动分配给: engineer-xxx"
# "分配原因: 负载适中, 技能匹配, 表现优秀"
```

---

## 📚 下一步

### 集成新功能

按照 `INTEGRATION_GUIDE.md` 将新功能集成到主应用：

1. 在 `backend/src/app.ts` 中注册WebSocket服务
2. 初始化IM服务管理器
3. 配置任务智能分配
4. 注册Swagger文档

### 运行测试

```bash
# Backend 单元测试
cd backend
npm run test:unit

# Backend 集成测试
npm run test:integration

# Backend 覆盖率
npm run test:coverage

# 系统集成测试
cd ..
./tests/system/test-quality-inspection.sh

# 前端 E2E 测试
E2E_BASE_URL=http://localhost:3002 E2E_NO_WEB_SERVER=true npm run test:e2e -- --workers=1
```

### 查看文档

- `docs/deployment/DEPLOYMENT_CHECKLIST.md` - 完整的部署检查清单
- `docs/development/INTEGRATION_GUIDE.md` - 详细的功能集成指南
- `docs/DELIVERY_REPORT.md` - 项目交付报告

---

## 🐛 常见问题

### Q: 数据库连接失败？

```bash
# 检查PostgreSQL是否运行
pg_isready

# 检查数据库是否存在
psql -l | grep aftersales

# 检查连接字符串
echo $DATABASE_URL
```

### Q: Redis连接失败？

```bash
# 检查Redis是否运行
redis-cli ping

# 应该返回: PONG
```

### Q: TypeScript编译错误？

```bash
# 运行类型检查
npm run type-check

# 大部分是非阻塞性警告，可以忽略
# 如果有阻塞性错误，查看错误信息并修复
```

### Q: 测试失败？

```bash
# 确保测试数据库已创建
./scripts/setup-test-db.sh

# 检查测试配置
cat .env.test
```

### Q: Swagger文档不显示？

确保在 `src/app.ts` 中注册了Swagger：

```typescript
import { registerSwagger } from '@config/swagger.config';
await registerSwagger(fastify);
```

---

## 💡 开发技巧

### 1. 使用热重载

```bash
npm run dev
# 代码修改后自动重启
```

### 2. 查看日志

```bash
# 开发环境日志会输出到控制台
# 生产环境日志在 logs/ 目录
tail -f logs/app.log
```

### 3. 调试TypeScript

在 `tsconfig.json` 中已配置 `sourceMap: true`，可以直接调试TypeScript代码。

### 4. 使用Swagger测试API

访问 http://localhost:8080/docs，点击 "Try it out" 按钮测试API。

---

## 📞 获取帮助

- 查看 `DEPLOYMENT_CHECKLIST.md` 了解完整的部署流程
- 查看 `INTEGRATION_GUIDE.md` 了解如何集成新功能
- 查看 `DELIVERY_REPORT.md` 了解项目整体情况
- 查看代码注释了解实现细节

---

## ✅ 检查清单

在投产前，确保完成以下检查：

- [ ] 所有依赖已安装
- [ ] 环境变量已配置
- [ ] 数据库已创建并迁移
- [ ] 服务可以正常启动
- [ ] 健康检查通过
- [ ] API文档可访问
- [ ] 核心测试通过
- [ ] 新功能已集成
- [ ] 日志正常输出

---

**祝你使用愉快！** 🎉

如有问题，请查看相关文档或联系技术支持。
