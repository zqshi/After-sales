# 开发指南

本文档提供智能售后工作台的完整开发指南，包括环境搭建、开发流程、代码规范和最佳实践。

## 目录

- [环境准备](#环境准备)
- [项目启动](#项目启动)
- [开发流程](#开发流程)
- [架构指南](#架构指南)
- [代码规范](#代码规范)
- [测试指南](#测试指南)
- [常见问题](#常见问题)

## 环境准备

### 系统要求

- **操作系统**：macOS, Linux, Windows (WSL2推荐)
- **Node.js**：>= 18.0.0
- **npm**：>= 9.0.0
- **Git**：>= 2.30.0

### 安装Node.js

推荐使用 [nvm](https://github.com/nvm-sh/nvm) 管理Node版本：

```bash
# 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装Node.js 18
nvm install 18
nvm use 18
```

### IDE推荐

推荐使用 **Visual Studio Code** 并安装以下扩展：

- ESLint
- Prettier - Code formatter
- JavaScript (ES6) code snippets
- Path Intellisense
- GitLens

### VSCode配置

创建 `.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 项目启动

### 1. 克隆项目

```bash
git clone <repository-url>
cd After-sales
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境

创建 `config.js`（可选，用于API配置）：

```javascript
window.config = {
  apiBaseUrl: 'http://localhost:8080',
  authToken: '',
  featureFlags: {},
};
```

### 4. 启动开发服务器

```bash
npm run dev
```

浏览器自动打开 http://localhost:3000

### 5. 构建生产版本

```bash
npm run build
```

输出到 `dist/` 目录

## 开发流程

### 分支策略

- `main`：主分支，保护分支，仅接受PR
- `develop`：开发分支
- `feature/*`：功能分支
- `fix/*`：Bug修复分支
- `refactor/*`：重构分支

### 开发步骤

1. **创建分支**

```bash
git checkout -b feature/your-feature-name
```

2. **开发功能**

按照[代码规范](#代码规范)编写代码

3. **运行测试**

```bash
npm run lint
npm run test
```

4. **提交代码**

```bash
git add .
git commit -m "feat: add your feature"
```

5. **推送并创建PR**

```bash
git push origin feature/your-feature-name
```

## 架构指南

### DDD领域驱动设计

项目采用DDD架构，按业务领域划分模块：

```
assets/js/domains/
├── customer/           # 客户画像领域
│   ├── models/         # 领域模型
│   │   └── Profile.js  # 客户画像实体
│   ├── repositories/   # 数据仓储
│   │   └── ProfileRepository.js
│   ├── services/       # 领域服务
│   └── views/          # 展示层
├── conversation/       # 对话领域（规划中）
├── requirement/        # 需求领域（规划中）
└── task/               # 任务领域（规划中）
```

### 分层架构

```
┌─────────────────────────────────┐
│    Presentation Layer (UI)      │  展示层：DOM操作、事件处理
├─────────────────────────────────┤
│    Application Layer             │  应用层：业务流程编排
├─────────────────────────────────┤
│    Domain Layer                  │  领域层：业务逻辑、领域模型
├─────────────────────────────────┤
│    Infrastructure Layer          │  基础设施层：API调用、存储
└─────────────────────────────────┘
```

### 目录职责

| 目录 | 职责 | 示例 |
|------|------|------|
| `core/` | 基础工具库 | DOM操作、通知、存储 |
| `domains/` | 领域模型和业务逻辑 | CustomerProfile实体 |
| `api.js` | API统一调用层 | HTTP请求封装 |
| `*/index.js` | 模块入口和初始化 | 绑定事件、加载数据 |
| `ui/` | UI组件和布局 | Sidebar、Modal |
| `mock-data/` | 测试数据 | Mock数据提供者 |

## 代码规范

### JavaScript规范

#### 1. 命名约定

```javascript
// 变量和函数：camelCase
const userName = 'John';
function getUserProfile() {}

// 类和构造函数：PascalCase
class CustomerProfile {}

// 常量：UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';

// 私有方法：下划线前缀
function _privateMethod() {}
```

#### 2. 模块导入导出

```javascript
// 命名导出（推荐）
export function fetchProfile() {}
export class ProfileRepository {}

// 导入
import { fetchProfile, ProfileRepository } from './module.js';

// 默认导出（谨慎使用）
export default class Profile {}
```

#### 3. 异步处理

```javascript
// 推荐：async/await
async function loadProfile(id) {
  try {
    const profile = await fetchProfile(id);
    return profile;
  } catch (error) {
    console.error('Failed to load profile:', error);
    throw error;
  }
}

// 避免：回调地狱
```

#### 4. 错误处理

```javascript
// 总是捕获异常
try {
  await riskyOperation();
} catch (error) {
  console.error('[ModuleName] Error:', error.message);
  // 用户友好的错误提示
  showNotification('操作失败，请重试', 'error');
}
```

#### 5. 防止XSS

```javascript
// ✅ 推荐：使用textContent
element.textContent = userInput;

// ✅ 推荐：使用转义函数
import { escapeHtml } from './core/sanitize.js';
element.innerHTML = escapeHtml(userInput);

// ❌ 避免：直接插入未转义的内容
element.innerHTML = userInput; // 危险！
```

#### 6. localStorage使用

```javascript
// ✅ 推荐：使用安全封装
import { setItem, getItem } from './core/storage.js';
setItem('key', data);
const data = getItem('key', defaultValue);

// ❌ 避免：直接使用localStorage
localStorage.setItem('key', JSON.stringify(data)); // 可能失败
```

### CSS规范

#### 1. Tailwind优先

```html
<!-- 优先使用Tailwind工具类 -->
<div class="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <span class="text-sm font-medium text-gray-700">内容</span>
</div>
```

#### 2. 自定义样式

仅在必要时添加自定义CSS，放在 `assets/css/main.css`

```css
/* 使用BEM命名 */
.profile-card {}
.profile-card__header {}
.profile-card__header--active {}
```

### Git提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type类型

- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链

#### 示例

```
feat(customer): add profile refresh functionality

Implement automatic profile refresh when data is stale.
Includes cache invalidation and error handling.

Closes #123
```

## 测试指南

### 单元测试

使用Vitest编写单元测试：

```javascript
// customer/models/Profile.test.js
import { describe, it, expect } from 'vitest';
import { CustomerProfile } from './Profile.js';

describe('CustomerProfile', () => {
  it('should create a profile with valid data', () => {
    const data = {
      name: '张三',
      tags: ['VIP'],
    };
    const profile = new CustomerProfile(data);

    expect(profile.name).toBe('张三');
    expect(profile.isVIP()).toBe(true);
  });

  it('should calculate risk level correctly', () => {
    const profile = new CustomerProfile({
      commitments: [{ risk: '预警' }],
    });

    expect(profile.getRiskLevel()).toBe('high');
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm run test

# 监听模式
npm run test -- --watch

# 覆盖率报告
npm run test:coverage

# UI界面
npm run test:ui
```

### 测试覆盖率目标

- **整体覆盖率**：>= 60%
- **核心模块**：>= 80%
- **工具函数**：>= 90%

## 常见问题

### Q1: 如何调试代码？

**A**: 使用浏览器开发者工具：

1. 打开Chrome DevTools (F12)
2. 在Sources面板设置断点
3. 刷新页面触发断点
4. 使用Console执行代码

### Q2: API调用失败怎么办？

**A**: 检查以下几点：

1. 确认 `config.js` 中 `apiBaseUrl` 配置正确
2. 检查网络连接
3. 查看浏览器Console的错误信息
4. 确认后端服务已启动

### Q3: 如何添加新的功能模块？

**A**: 遵循DDD架构：

1. 在 `domains/` 下创建领域目录
2. 定义领域模型 (`models/`)
3. 创建数据仓储 (`repositories/`)
4. 实现展示层 (`views/`)
5. 在 `main.js` 中初始化

### Q4: Mock数据在哪里？

**A**: Mock数据位于：

- `assets/mock-data/` - 测试数据文件
- 开发环境自动加载Mock数据
- 生产环境使用真实API

### Q5: 如何处理跨域问题？

**A**: 开发环境配置Vite代理：

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://backend-server:8080',
        changeOrigin: true,
      },
    },
  },
});
```

### Q6: ESLint报错怎么解决？

**A**:

```bash
# 自动修复大部分问题
npm run lint:fix

# 如果是规则问题，可以在.eslintrc.json中调整
```

### Q7: 如何查看构建产物？

**A**:

```bash
# 构建
npm run build

# 预览构建产物
npm run preview
```

## 最佳实践

### 1. 性能优化

- 避免频繁的DOM操作
- 使用事件委托
- 图片懒加载
- 代码分割（按需加载）

### 2. 安全

- 始终验证和转义用户输入
- 使用HTTPS传输敏感数据
- 实施CSP策略
- 定期更新依赖

### 3. 可维护性

- 编写清晰的注释
- 保持函数简短（< 50行）
- 单一职责原则
- 避免重复代码（DRY）

### 4. 代码审查

每个PR需要至少一人审查，关注：

- 功能完整性
- 代码质量
- 测试覆盖
- 文档更新
- 性能影响
- 安全风险

## 参考资源

- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript Info](https://javascript.info/)
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [Vite文档](https://vitejs.dev/)
- [Vitest文档](https://vitest.dev/)
- [DDD设计](https://domain-driven-design.org/)

---

如有问题，请查看[项目文档](./README.md)或提交Issue。
