# 技术方案设计文档

## 1. 概述

本文档详细描述售后服务管理系统的技术实现方案,包括前端工程化、构建部署、测试策略、性能优化、安全防护等核心技术决策。

### 1.1 技术栈总览

```
前端框架: Vanilla JavaScript (ES2021+)
构建工具: Vite 5.x
样式方案: Tailwind CSS 3.x
图表库: Chart.js 4.x
测试框架: Vitest (单元测试) + Playwright (E2E测试)
代码质量: ESLint + Prettier
版本控制: Git + GitHub/GitLab
CI/CD: GitHub Actions / GitLab CI
部署方案: 静态托管 (Vercel/Netlify/CDN)
```

## 2. 前端工程化

### 2.1 构建系统 - Vite

#### 2.1.1 选型理由

- **极速冷启动**: 基于ES Modules的开发服务器
- **HMR热更新**: 毫秒级热模块替换
- **优化构建**: 基于Rollup的生产构建
- **开箱即用**: 无需复杂配置
- **生态丰富**: 插件生态完善

#### 2.1.2 配置方案

`vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // 开发服务器
  server: {
    port: 3000,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除console
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        customer: resolve(__dirname, 'customer/index.html'),
        requirement: resolve(__dirname, 'requirement/index.html'),
        task: resolve(__dirname, 'task/index.html'),
        knowledge: resolve(__dirname, 'knowledge/index.html'),
        governance: resolve(__dirname, 'governance/index.html'),
      },
      output: {
        manualChunks: {
          // 代码分割策略
          vendor: ['chart.js'],
          domain: [
            'assets/js/domains/conversation/models/Conversation.js',
            'assets/js/domains/customer/models/Profile.js',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // chunk大小警告阈值(KB)
  },

  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'assets/js'),
      '@domains': resolve(__dirname, 'assets/js/domains'),
      '@core': resolve(__dirname, 'assets/js/core'),
      '@infrastructure': resolve(__dirname, 'assets/js/infrastructure'),
    },
  },

  // 环境变量
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __VERSION__: JSON.stringify(process.env.npm_package_version),
  },

  // 测试配置
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.js',
        '**/mockData.js',
      ],
    },
  },

  // 优化配置
  optimizeDeps: {
    include: ['chart.js'],
    exclude: [],
  },
});
```

#### 2.1.3 环境变量管理

`.env.development`:
```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_ENABLE_MOCK=true
VITE_LOG_LEVEL=debug
```

`.env.production`:
```bash
VITE_API_BASE_URL=https://api.example.com/v1
VITE_ENABLE_MOCK=false
VITE_LOG_LEVEL=warn
```

`.env.staging`:
```bash
VITE_API_BASE_URL=https://staging-api.example.com/v1
VITE_ENABLE_MOCK=false
VITE_LOG_LEVEL=info
```

使用方式:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IS_DEV = import.meta.env.DEV;
const IS_PROD = import.meta.env.PROD;
```

### 2.2 代码质量工具

#### 2.2.1 ESLint配置

`.eslintrc.json`:
```json
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],
    "brace-style": ["error", "1tbs"],
    "quotes": ["error", "single", { "avoidEscape": true }],
    "semi": ["error", "always"],
    "indent": ["error", 2],
    "max-len": ["warn", { "code": 120 }],
    "no-trailing-spaces": "error",
    "comma-dangle": ["error", "always-multiline"],
    "arrow-parens": ["error", "always"],
    "object-curly-spacing": ["error", "always"],
    "array-bracket-spacing": ["error", "never"]
  }
}
```

#### 2.2.2 Prettier配置

`.prettierrc.json`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

`.prettierignore`:
```
node_modules
dist
coverage
.vscode
*.min.js
```

#### 2.2.3 Git Hooks - Husky

`package.json`:
```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

`.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
npm run test:changed
```

`.husky/commit-msg`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx commitlint --edit $1
```

#### 2.2.4 Commit规范 - Commitlint

`commitlint.config.js`:
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复bug
        'docs',     // 文档
        'style',    // 格式(不影响代码运行的变动)
        'refactor', // 重构
        'perf',     // 性能优化
        'test',     // 测试
        'chore',    // 构建过程或辅助工具的变动
        'revert',   // 回退
        'build',    // 构建系统
        'ci',       // CI配置
      ],
    ],
    'subject-case': [0],
    'subject-max-length': [2, 'always', 100],
  },
};
```

提交消息格式:
```
<type>(<scope>): <subject>

<body>

<footer>
```

示例:
```
feat(conversation): 添加消息发送重试机制

- 实现指数退避重试策略
- 添加最大重试次数限制
- 优化错误提示信息

Closes #123
```

### 2.3 模块化设计

#### 2.3.1 ES Modules

采用ES Modules规范:

```javascript
// 导出
export class CustomerProfile {...}
export function createProfile(data) {...}
export const DEFAULT_CONFIG = {...};

// 导入
import { CustomerProfile, createProfile } from './models/Profile.js';
import * as ProfileModels from './models/Profile.js';

// 动态导入
const module = await import('./heavy-module.js');
```

#### 2.3.2 代码分割策略

```javascript
// 路由级别代码分割
const routes = [
  {
    path: '/customer',
    component: () => import('./views/CustomerView.js'),
  },
  {
    path: '/requirement',
    component: () => import('./views/RequirementView.js'),
  },
];

// 按需加载大型库
async function loadChartJs() {
  if (!window.Chart) {
    await import('chart.js');
  }
  return window.Chart;
}
```

## 3. 测试策略

### 3.1 测试金字塔

```
        /\
       /  \     E2E Tests (10%)
      /----\
     /      \   Integration Tests (20%)
    /--------\
   /          \ Unit Tests (70%)
  /____________\
```

### 3.2 单元测试 - Vitest

#### 3.2.1 测试配置

`tests/setup.js`:
```javascript
import { vi } from 'vitest';

// 全局测试配置
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// 测试辅助函数
global.createMockProfile = (overrides = {}) => {
  return {
    customerId: 'test-customer',
    name: 'Test User',
    ...overrides,
  };
};
```

#### 3.2.2 测试示例

`tests/domains/customer/Profile.spec.js`:
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { CustomerProfile } from '@domains/customer/models/Profile';

describe('CustomerProfile', () => {
  let profile;

  beforeEach(() => {
    profile = new CustomerProfile({
      conversationId: 'conv-1',
      name: '张三',
      tags: ['金牌客户', '重点客户'],
    });
  });

  describe('isVIP', () => {
    it('should return true for VIP customer', () => {
      expect(profile.isVIP()).toBe(true);
    });

    it('should return false for non-VIP customer', () => {
      profile.tags = ['普通客户'];
      expect(profile.isVIP()).toBe(false);
    });
  });

  describe('getRiskLevel', () => {
    it('should return high risk when has both risk and urgent', () => {
      profile.commitments = [{ risk: true }];
      profile.insights = [{ title: '风险预警' }];
      expect(profile.getRiskLevel()).toBe('high');
    });

    it('should return medium risk when has only one indicator', () => {
      profile.commitments = [{ risk: true }];
      profile.insights = [];
      expect(profile.getRiskLevel()).toBe('medium');
    });

    it('should return low risk when no indicators', () => {
      profile.commitments = [];
      profile.insights = [];
      expect(profile.getRiskLevel()).toBe('low');
    });
  });
});
```

`tests/core/sanitize.spec.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { escapeHtml, safe } from '@core/sanitize';

describe('sanitize', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      );
    });

    it('should handle multiple special characters', () => {
      expect(escapeHtml('A & B < C > D "E" \'F\'')).toBe(
        'A &amp; B &lt; C &gt; D &quot;E&quot; &#x27;F&#x27;'
      );
    });

    it('should return original value for non-string', () => {
      expect(escapeHtml(123)).toBe(123);
      expect(escapeHtml(null)).toBe(null);
    });
  });

  describe('safe template literal', () => {
    it('should escape interpolated values', () => {
      const userInput = '<script>alert(1)</script>';
      const html = safe`<div>${userInput}</div>`;
      expect(html).toBe('<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>');
    });
  });
});
```

#### 3.2.3 覆盖率目标

```json
{
  "coverage": {
    "branches": 80,
    "functions": 80,
    "lines": 80,
    "statements": 80
  }
}
```

运行测试:
```bash
npm run test              # 运行所有测试
npm run test:watch        # 监听模式
npm run test:coverage     # 生成覆盖率报告
npm run test:ui           # 可视化测试UI
```

### 3.3 集成测试

`tests/integration/conversation-flow.spec.js`:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationService } from '@/application/services/ConversationService';
import { eventBus } from '@/infrastructure/EventBus';

describe('Conversation Flow Integration', () => {
  let service;
  let eventSpy;

  beforeEach(() => {
    service = new ConversationService();
    eventSpy = vi.fn();
    eventBus.subscribe('MessageSent', eventSpy);
  });

  it('should complete full conversation lifecycle', async () => {
    // 1. 开始对话
    const conversation = await service.startConversation({
      customerId: 'cust-1',
      channel: 'chat',
    });
    expect(conversation.status).toBe('open');

    // 2. 发送消息
    await service.sendMessage(conversation.id, {
      content: 'Hello',
      senderId: 'agent-1',
    });
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MessageSent' })
    );

    // 3. 关闭对话
    await service.closeConversation(conversation.id, {
      resolution: 'resolved',
    });
    expect(conversation.status).toBe('closed');
  });
});
```

### 3.4 E2E测试 - Playwright

#### 3.4.1 配置

`playwright.config.js`:
```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 3.4.2 E2E测试示例

`tests/e2e/conversation.spec.js`:
```javascript
import { test, expect } from '@playwright/test';

test.describe('Conversation Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 登录
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-btn"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display conversation list', async ({ page }) => {
    await page.goto('/');

    // 检查对话列表存在
    const conversationList = page.locator('[data-testid="conversation-list"]');
    await expect(conversationList).toBeVisible();

    // 检查至少有一个对话
    const conversations = page.locator('.conversation-item');
    await expect(conversations).toHaveCount(await conversations.count());
  });

  test('should send message in conversation', async ({ page }) => {
    // 打开第一个对话
    await page.click('.conversation-item:first-child');

    // 等待消息列表加载
    await expect(page.locator('[data-testid="message-list"]')).toBeVisible();

    // 发送消息
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('This is a test message');
    await page.click('[data-testid="send-btn"]');

    // 验证消息已发送
    await expect(page.locator('.message:last-child')).toContainText(
      'This is a test message'
    );
  });

  test('should close conversation', async ({ page }) => {
    await page.click('.conversation-item:first-child');

    // 点击关闭按钮
    await page.click('[data-testid="close-conversation-btn"]');

    // 填写关闭表单
    await page.selectOption('[data-testid="resolution-select"]', 'resolved');
    await page.fill('[data-testid="notes-textarea"]', 'Issue resolved');
    await page.click('[data-testid="confirm-close-btn"]');

    // 验证对话状态
    await expect(page.locator('.conversation-status')).toContainText('已关闭');
  });
});
```

运行E2E测试:
```bash
npx playwright test                    # 运行所有测试
npx playwright test --headed           # 显示浏览器
npx playwright test --debug            # 调试模式
npx playwright test --ui               # UI模式
npx playwright show-report             # 查看报告
```

### 3.5 测试最佳实践

#### 3.5.1 测试原则

- **AAA模式**: Arrange(准备), Act(执行), Assert(断言)
- **单一职责**: 每个测试只验证一个行为
- **独立性**: 测试之间互不依赖
- **可重复**: 测试结果稳定可重复
- **快速执行**: 单元测试应该毫秒级完成

#### 3.5.2 Mock策略

```javascript
// Mock API请求
vi.mock('@/api.js', () => ({
  fetchProfile: vi.fn().mockResolvedValue({
    code: 200,
    data: { customerId: 'cust-1', name: 'Test' },
  }),
}));

// Mock时间
vi.useFakeTimers();
vi.setSystemTime(new Date('2024-01-15'));

// Mock DOM
const mockElement = {
  textContent: '',
  innerHTML: '',
  addEventListener: vi.fn(),
};
```

## 4. 性能优化

### 4.1 资源加载优化

#### 4.1.1 代码分割

```javascript
// 路由级别分割
const routes = {
  '/customer': () => import('./views/CustomerView.js'),
  '/requirement': () => import('./views/RequirementView.js'),
};

// 组件级别分割
async function loadChart() {
  const { Chart } = await import('chart.js');
  return new Chart(...);
}
```

#### 4.1.2 资源预加载

```html
<!-- 预连接 -->
<link rel="preconnect" href="https://api.example.com">
<link rel="dns-prefetch" href="https://cdn.example.com">

<!-- 预加载关键资源 -->
<link rel="preload" href="/assets/js/app.js" as="script">
<link rel="preload" href="/assets/css/main.css" as="style">

<!-- 预获取可能需要的资源 -->
<link rel="prefetch" href="/assets/js/customer-view.js">
```

#### 4.1.3 图片优化

```javascript
// 懒加载图片
class LazyImage {
  constructor(img) {
    this.img = img;
    this.src = img.dataset.src;
    this.observe();
  }

  observe() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.load();
          observer.unobserve(this.img);
        }
      });
    });
    observer.observe(this.img);
  }

  load() {
    this.img.src = this.src;
    this.img.classList.add('loaded');
  }
}

// 响应式图片
<img
  srcset="
    image-320w.jpg 320w,
    image-640w.jpg 640w,
    image-1280w.jpg 1280w"
  sizes="
    (max-width: 320px) 280px,
    (max-width: 640px) 600px,
    1200px"
  src="image-640w.jpg"
  alt="描述"
>
```

### 4.2 渲染性能优化

#### 4.2.1 虚拟滚动

```javascript
class VirtualList {
  constructor(container, items, itemHeight) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.visibleCount = Math.ceil(container.clientHeight / itemHeight);
    this.startIndex = 0;
    this.render();
    this.bindScroll();
  }

  render() {
    const endIndex = Math.min(
      this.startIndex + this.visibleCount + 5, // buffer
      this.items.length
    );

    const visibleItems = this.items.slice(this.startIndex, endIndex);
    const offsetY = this.startIndex * this.itemHeight;

    this.container.innerHTML = `
      <div style="height: ${this.items.length * this.itemHeight}px; position: relative;">
        <div style="transform: translateY(${offsetY}px);">
          ${visibleItems.map((item) => this.renderItem(item)).join('')}
        </div>
      </div>
    `;
  }

  bindScroll() {
    this.container.addEventListener('scroll', () => {
      const scrollTop = this.container.scrollTop;
      const newStartIndex = Math.floor(scrollTop / this.itemHeight);
      if (newStartIndex !== this.startIndex) {
        this.startIndex = newStartIndex;
        this.render();
      }
    });
  }
}
```

#### 4.2.2 防抖节流

```javascript
// 防抖 - 延迟执行
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 节流 - 限制频率
function throttle(fn, delay) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// 使用示例
const searchInput = document.getElementById('search');
searchInput.addEventListener('input', debounce((e) => {
  performSearch(e.target.value);
}, 300));

window.addEventListener('scroll', throttle(() => {
  checkScrollPosition();
}, 100));
```

#### 4.2.3 RequestAnimationFrame

```javascript
// 批量DOM更新
class DOMBatcher {
  constructor() {
    this.tasks = [];
    this.scheduled = false;
  }

  add(task) {
    this.tasks.push(task);
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  flush() {
    this.tasks.forEach((task) => task());
    this.tasks = [];
    this.scheduled = false;
  }
}

const batcher = new DOMBatcher();
batcher.add(() => { element.textContent = 'Updated'; });
batcher.add(() => { anotherElement.classList.add('active'); });
```

### 4.3 缓存策略

#### 4.3.1 HTTP缓存

```javascript
// Service Worker缓存策略
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      return fetch(event.request).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone response
        const responseToCache = response.clone();

        caches.open('v1').then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
```

#### 4.3.2 内存缓存

```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

// 使用示例
const profileCache = new LRUCache(100);
async function getProfile(id) {
  const cached = profileCache.get(id);
  if (cached) {
    return cached;
  }
  const profile = await fetchProfile(id);
  profileCache.set(id, profile);
  return profile;
}
```

### 4.4 性能监控

```javascript
// Performance API
function measurePageLoad() {
  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  const connectTime = perfData.responseEnd - perfData.requestStart;
  const renderTime = perfData.domComplete - perfData.domLoading;

  console.log('Page Load Time:', pageLoadTime);
  console.log('Connect Time:', connectTime);
  console.log('Render Time:', renderTime);
}

// PerformanceObserver
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
  }
});
observer.observe({ entryTypes: ['measure', 'navigation'] });

// 自定义性能标记
performance.mark('start-fetch');
await fetchData();
performance.mark('end-fetch');
performance.measure('fetch-duration', 'start-fetch', 'end-fetch');
```

## 5. 安全防护

### 5.1 XSS防护

已实现: `assets/js/core/sanitize.js`

```javascript
// HTML转义
function escapeHtml(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return String(str).replace(/[&<>"'/]/g, (char) => map[char]);
}

// 安全的DOM操作
function setText(element, text) {
  element.textContent = text; // 使用textContent而非innerHTML
}

// Content Security Policy
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
">
```

### 5.2 CSRF防护

```javascript
// CSRF Token
function getCSRFToken() {
  return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}

// 请求头添加Token
async function secureRequest(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': getCSRFToken(),
    },
    credentials: 'same-origin',
  });
}
```

### 5.3 敏感数据保护

```javascript
// 加密敏感数据
async function encryptData(data, key) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const keyBuffer = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyBuffer,
    dataBuffer
  );
  return { encrypted: encryptedBuffer, iv };
}

// 防止敏感信息泄漏
function sanitizeError(error) {
  if (import.meta.env.PROD) {
    return {
      message: 'An error occurred',
      code: error.code,
    };
  }
  return error;
}
```

## 6. 部署方案

### 6.1 构建流程

```bash
# 安装依赖
npm ci

# 运行代码检查
npm run lint

# 运行测试
npm run test:coverage

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 6.2 静态托管部署

#### 6.2.1 Vercel部署

`vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### 6.2.2 Netlify部署

`netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 6.3 CDN配置

```javascript
// 环境配置
const CDN_URL = import.meta.env.VITE_CDN_URL || '';

function getAssetUrl(path) {
  if (CDN_URL) {
    return `${CDN_URL}${path}`;
  }
  return path;
}

// 使用CDN
<img src="${getAssetUrl('/assets/images/logo.png')}" alt="Logo">
```

### 6.4 环境分离

```
development → 开发环境 (localhost)
↓
staging → 预发布环境 (staging.example.com)
↓
production → 生产环境 (example.com)
```

## 7. CI/CD流程

### 7.1 GitHub Actions

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build:
    needs: test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### 7.2 质量门禁

```yaml
# 测试覆盖率要求
coverage:
  status:
    project:
      default:
        target: 80%
    patch:
      default:
        target: 80%

# Code Review要求
protectedBranches:
  main:
    requiredReviews: 2
    requiredChecks:
      - lint
      - test
      - build
```

## 8. 监控与告警

### 8.1 错误监控 - Sentry

```javascript
import * as Sentry from '@sentry/browser';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN',
    environment: import.meta.env.MODE,
    release: `aftersales@${import.meta.env.VITE_APP_VERSION}`,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // 过滤敏感信息
      if (event.request) {
        delete event.request.cookies;
      }
      return event;
    },
  });
}

// 捕获错误
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error);
}
```

### 8.2 性能监控

```javascript
// 自定义性能指标
function reportMetrics() {
  const metrics = {
    FCP: 0, // First Contentful Paint
    LCP: 0, // Largest Contentful Paint
    FID: 0, // First Input Delay
    CLS: 0, // Cumulative Layout Shift
    TTFB: 0, // Time to First Byte
  };

  // 收集指标
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        metrics.FCP = entry.startTime;
      }
    }
    sendMetrics(metrics);
  }).observe({ entryTypes: ['paint'] });
}
```

### 8.3 业务监控

```javascript
// 用户行为追踪
class Analytics {
  track(event, properties = {}) {
    const data = {
      event,
      properties,
      timestamp: new Date().toISOString(),
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
    };

    // 发送到分析平台
    navigator.sendBeacon('/api/analytics', JSON.stringify(data));
  }

  // 页面浏览
  pageView(path) {
    this.track('page_view', { path });
  }

  // 功能使用
  featureUsed(feature) {
    this.track('feature_used', { feature });
  }

  // 错误
  error(error) {
    this.track('error', {
      message: error.message,
      stack: error.stack,
    });
  }
}
```

---

**文档版本**: 1.0
**最后更新**: 2024年
**维护者**: 前端团队
