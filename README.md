# 智能售后工作台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> 企业级智能售后管理平台 - 多渠道客户对话管理、AI辅助决策、质量检查和需求采集的一站式工作台

## 📑 目录

- [项目简介](#项目简介)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [开发指南](#开发指南)
- [部署上线](#部署上线)
- [文档](#文档)

## 🎯 项目简介

智能售后工作台是一个面向企业售后团队的综合管理平台，提供：

- **多渠道对话管理**：统一接入飞书、企业QQ、微信等IM渠道
- **智能客户画像**：实时聚合CRM、合同、SLA数据，提供360度客户视图
- **AI辅助方案**：基于LLM的会话分析和解决方案推荐
- **需求采集与任务管理**：自动识别需求，质检评分，任务流转
- **治理与审计**：完整的权限控制、操作审计和监控告警

### 项目状态

- **当前版本**：v0.1.0（开发阶段）
- **代码质量**：⭐⭐⭐☆☆ (3.3/5.0)
- **距离生产就绪**：预计20周（详见[项目质量评估](./docs/PROJECT_QUALITY_ASSESSMENT.md)）

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用

### 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```
After-sales/
├── index.html                    # 登录页面（默认页）
├── login.html                    # 登录入口（兼容跳转）
├── app.html                      # 工作台主界面
├── assets/
│   ├── js/
│   │   ├── api.js                # 统一API层
│   │   ├── main.js               # 应用入口
│   │   ├── core/                 # 核心工具库
│   │   │   ├── dom.js            # DOM操作工具
│   │   │   ├── notifications.js  # 通知组件
│   │   │   ├── sanitize.js       # XSS防护
│   │   │   └── storage.js        # 安全存储
│   │   ├── domains/              # DDD领域模型（新）
│   │   │   └── customer/         # 客户画像领域
│   │   ├── chat/                 # 对话管理模块
│   │   ├── customer/             # 客户画像模块
│   │   ├── requirements/         # 需求采集模块
│   │   ├── tasks/                # 任务管理模块
│   │   ├── knowledge/            # 知识库模块
│   │   ├── ai/                   # AI分析模块
│   │   ├── roles.js              # 权限管理
│   │   └── ui/                   # UI组件
│   ├── css/
│   │   └── main.css              # 全局样式
│   └── mock-data/                # Mock测试数据
├── docs/                         # 项目文档
│   ├── API_CONTRACT_GUIDE.md     # API契约指南
│   ├── API_GATEWAY_SPEC.md       # 网关规范
│   ├── BACKEND_ARCHITECTURE.md   # 后端架构
│   ├── FRONTEND_ARCHITECTURE.md  # 前端架构
│   ├── TECHNICAL_DESIGN.md       # 技术设计
│   ├── GOVERNANCE_*.md           # 治理文档
│   └── PROJECT_QUALITY_ASSESSMENT.md  # 质量评估报告
├── package.json
├── vite.config.js
└── README.md
```

## ✨ 核心功能

### 1. 多渠道对话管理
- 统一接入飞书、企业QQ、微信等IM平台
- 实时消息推送（WebSocket）
- 对话历史记录和搜索
- SLA状态监控和告警

### 2. 智能客户画像
- 实时聚合CRM、合同、服务记录
- 客户健康度分析
- 互动历史追踪
- 承诺达成度监控

### 3. 需求采集与管理
- 自动识别对话中的需求
- 需求卡片创建和流转
- 需求统计和优先级管理
- 数据可视化

### 4. 质检与任务
- 多维度质量评分
- AI驱动的建议生成
- 任务自动派发
- 进度追踪

### 5. 知识库集成
- 智能知识推荐
- 全文搜索
- 知识卡片预览

### 6. AI辅助
- 会话情感分析
- 解决方案推荐
- 自动化任务建议

## 🏗️ 技术架构

### 前端技术栈

- **核心**：Vanilla JavaScript (ES Modules)
- **样式**：Tailwind CSS v3
- **图表**：Chart.js v4.4
- **构建工具**：Vite
- **代码质量**：ESLint + Prettier
- **测试**：Vitest

### 架构模式

- **DDD（领域驱动设计）**：按业务领域划分模块
- **Repository模式**：数据访问抽象
- **MVP/MVC**：视图与逻辑分离
- **API统一封装**：集中式错误处理

### 后端架构（规划中）

- **API网关**：Node.js + Express
- **数据存储**：PostgreSQL + Redis
- **消息队列**：Kafka
- **监控**：Prometheus + Grafana
- **日志**：ELK Stack

## 📚 开发指南

### 代码规范

```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 代码格式化
npm run format
```

### 测试

```bash
# 运行测试
npm run test

# 测试覆盖率
npm run test:coverage

# 测试UI
npm run test:ui
```

### Git提交规范

```
feat: 新功能
fix: Bug修复
docs: 文档更新
refactor: 代码重构
test: 测试相关
chore: 构建/工具链
```

### 环境配置

创建 `config.js` 配置文件：

```javascript
window.config = {
  apiBaseUrl: 'http://localhost:8080',  // API网关地址
  authToken: 'your-token',              // 认证令牌（可选）
  featureFlags: {
    'chat.channel.feishu': true,
    'ai.solutions': false,
  },
};
```

## 🚢 部署上线

### 开发环境

1. 配置Mock网关或真实API
2. 启动开发服务器：`npm run dev`
3. 访问 http://localhost:3000

### 生产环境

1. 构建生产包：`npm run build`
2. 将 `dist/` 目录部署到Web服务器
3. 配置Nginx反向代理（可选）
4. 确保API网关可访问

### 部署检查

部署前请完成以下检查：

- ✅ API契约验证
- ✅ 安全测试（XSS、CSRF）
- ✅ 性能测试（加载时间、响应时间）
- ✅ 监控和告警配置
- ✅ Feature Flag就绪
- ✅ 灰度发布计划

## 📖 文档

### 📘 核心文档

- [架构总览](./docs/ARCHITECTURE_SUMMARY.md) - 所有架构文档的导航中心
- [项目质量评估](./docs/PROJECT_QUALITY_ASSESSMENT.md) - 质量现状与改进计划
- [变更日志](./CHANGELOG.md) - 版本变更记录

### 🏗️ 架构设计

- [DDD战略设计](./docs/architecture/DDD_STRATEGIC_DESIGN.md) - 限界上下文、聚合设计、领域模型
- [分层架构设计](./docs/architecture/LAYERED_ARCHITECTURE.md) - 四层架构详解、依赖倒置
- [领域事件设计](./docs/architecture/DOMAIN_EVENTS.md) - 事件驱动架构、EventBus实现
- [目录结构设计](./docs/architecture/DIRECTORY_STRUCTURE.md) - DDD代码组织规范

### 🔌 API与技术方案

- [API设计规范](./docs/API_DESIGN.md) - RESTful API完整设计、认证授权
- [技术方案设计](./docs/TECHNICAL_SOLUTIONS.md) - 工程化、测试策略、CI/CD、部署方案

### 💻 开发文档

- [开发指南](./docs/development/DEVELOPMENT.md) - 开发环境、Git规范、代码标准

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交变更：`git commit -m 'feat: add some feature'`
4. 推送到分支：`git push origin feature/your-feature`
5. 提交Pull Request

## 📝 许可证

本项目采用 [MIT](./LICENSE) 许可证

## 👥 团队

- **治理委员会**：负责架构决策、发布审批
- **开发团队**：功能开发、代码审查
- **运维团队**：监控、告警、性能优化

## 📞 联系我们

- Issue：[GitHub Issues](https://github.com/your-org/after-sales/issues)
- 文档：查看 `docs/` 目录
- 邮件：support@yourcompany.com

---

**注意**：本项目当前处于开发阶段，不建议直接用于生产环境。请参考[质量评估报告](./PROJECT_QUALITY_ASSESSMENT.md)了解改进计划。
