# 智能售后工作台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> 企业级智能售后管理平台 - 多渠道客户对话管理、AI辅助决策、质量检查和需求采集的一站式工作台

## 📑 目录

- [项目简介](#项目简介)
- [服务与端口](#服务与端口)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [配置说明](#配置说明)
- [部署上线](#部署上线)
- [文档](#文档)

## 🎯 项目简介

智能售后工作台面向企业售后团队，提供多渠道对话管理、客户画像、AI辅助质检与需求采集等能力。当前仓库包含前端工作台、后端服务、AgentScope 服务与监控组件。

### 项目状态

- **当前版本**：v0.1.0（开发阶段）
- **交付形态**：前端 + 后端 + AgentScope（Python）多服务协作

## 🧭 服务与端口

- **前端工作台**：http://localhost:5173（本地开发）
- **后端 API**：http://localhost:8080（Fastify）
- **AgentScope 服务**：http://localhost:5000（FastAPI）
- **Prometheus**：http://localhost:9090（可选）
- **Grafana**：http://localhost:3001（可选）

Docker Compose 模式下前端默认映射到 http://localhost:3000。

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- Python >= 3.10
- PostgreSQL 15.x
- Redis 7.x

### 方式一：一键启动（本地）

```bash
./start-all.sh
```

脚本会安装依赖、启动后端、AgentScope 与前端，并进行基础健康检查。

### 方式二：手动启动（本地）

1. 安装依赖

```bash
npm install
cd backend && npm install
cd ../agentscope-service && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

2. 启动后端

```bash
cd backend
npm run dev
```

3. 启动 AgentScope

```bash
cd agentscope-service
source venv/bin/activate
uvicorn src.api.main:app --reload --port 5000
```

4. 启动前端

```bash
npm run dev
```

### 方式三：Docker Compose

```bash
docker-compose up --build
```

如只需数据库与缓存，可使用：

```bash
docker-compose up -d postgres redis
```

## 📁 项目结构

```
After-sales/
├── index.html                     # 登录入口
├── app.html                       # 工作台主界面
├── assets/                        # 前端资源
│   ├── js/                        # 业务逻辑与DDD层
│   ├── css/                       # 模块化样式
│   └── mock-data/                 # Mock数据
├── public/                        # 运行时配置与静态资源
├── backend/                       # 后端服务（Fastify + TypeORM）
├── agentscope-service/            # AgentScope 服务（FastAPI）
├── monitoring/                    # Prometheus/Grafana配置
├── docs/                          # 需求、架构与交付文档
├── workflows/                     # 业务流程编排示例
├── docker-compose.yml
└── README.md
```

## ✨ 核心功能

### 1. 多渠道对话管理
- 统一接入飞书、企业QQ、微信等IM平台
- 实时消息推送（WebSocket）
- 对话历史记录与搜索
- 客户等级状态监控和告警

### 2. 智能客户画像
- 聚合CRM、合同、服务记录
- 客户健康度分析与风险预警
- 互动历史追踪
- 承诺达成度监控

### 3. 需求采集与管理
- 自动识别对话中的需求
- 需求卡片创建和流转
- 需求统计与优先级管理
- 数据可视化

### 4. 质检与任务
- 多维度质量评分
- AI驱动的建议生成
- 任务自动派发与追踪

### 5. 知识库与AI辅助
- 知识卡片检索与推荐
- 会话情感分析
- 解决方案与自动化建议

## 🏗️ 技术架构

### 前端

- **核心**：Vanilla JavaScript (ES Modules)
- **样式**：模块化 CSS
- **图表**：Chart.js
- **构建工具**：Vite
- **测试**：Vitest

### 后端

- **框架**：Fastify 4.x
- **语言**：TypeScript 5.x
- **ORM**：TypeORM 0.3.x
- **数据库**：PostgreSQL 15.x
- **缓存/消息**：Redis 7.x

### AgentScope 服务

- **框架**：FastAPI
- **语言**：Python 3.10+
- **职责**：Agent 协作与工具调用编排

### 监控与运维

- **监控**：Prometheus + Grafana
- **反向代理**：Nginx（生产配置）

### 架构模式

- **DDD（领域驱动设计）**：多上下文领域模型
- **事件驱动**：EventBus + Outbox
- **Repository 模式**：数据访问抽象

## ⚙️ 配置说明

### 前端运行时配置

编辑 `public/runtime-config.js` 以覆盖默认 API 地址：

```javascript
window.RUNTIME_CONFIG = {
  apiBaseUrl: "http://localhost:8080/api/v1",
  agentScopeUrl: "http://localhost:5000",
  agentScopeWebSocketUrl: "ws://localhost:5000"
};
```

### API 代理

Vite 开发环境会将 `/api/v1` 代理到 `http://localhost:8080`，可通过 `VITE_API_PROXY_TARGET` 覆盖。

## 🚢 部署上线

### 开发环境

1. 运行 `docker-compose up -d postgres redis`
2. 启动后端与 AgentScope
3. 启动前端：`npm run dev`

### 生产环境

1. 构建前端：`npm run build`
2. 构建后端：`cd backend && npm run build`
3. 使用 `docker-compose` 或自定义部署方式上线
4. 可选启用 `nginx` profile 提供统一入口

## 📖 文档

- [文档中心](./docs/README.md) - 文档导航入口
- [快速开始](./docs/guides/QUICK_START.md) - 5分钟启动指南
- [启动指南](./docs/guides/STARTUP_GUIDE.md) - 完整启动说明
- [架构设计](./docs/architecture/AGENT_ARCHITECTURE_DESIGN.md)
- [API 参考](./docs/api/API_REFERENCE.md)
- [变更日志](./CHANGELOG.md)

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交变更：`git commit -m 'feat: add some feature'`
4. 推送到分支：`git push origin feature/your-feature`
5. 提交Pull Request

## 📝 许可证

本项目采用 [MIT](./LICENSE) 许可证

## 📞 联系我们

- Issue：[GitHub Issues](https://github.com/your-org/after-sales/issues)
- 文档：查看 `docs/` 目录
- 邮件：labixiaoxin-why@outlook.com

---

**注意**：本项目处于开发阶段，配置与接口仍在迭代中，实际部署前请阅读相关文档与环境说明。
