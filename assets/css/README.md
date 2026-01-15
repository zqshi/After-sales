# CSS架构文档

## 概述

本项目采用模块化CSS架构，统一管理前端样式，提供清晰的组织结构和可维护性。

## 架构设计

### 目录结构

```
assets/css/
├── app.css              # 主入口文件（在HTML中引用）
├── variables.css        # CSS变量定义（设计令牌）
├── base.css            # 基础样式（布局、重置、滚动条、动画）
├── components/         # 通用组件
│   ├── buttons.css    # 按钮样式
│   ├── cards.css      # 卡片和面板
│   ├── forms.css      # 表单元素
│   └── badges.css     # 徽章和标签
├── modules/           # 功能模块
│   ├── navigation.css # 导航和侧边栏
│   ├── chat.css       # 聊天系统
│   ├── knowledge.css  # 知识库
│   ├── quality.css    # 质检系统
│   └── analysis.css   # 分析和AI辅助
└── _legacy/           # 旧版CSS文件备份
```

## 设计原则

### 1. 单一职责
每个CSS文件专注于一个特定功能或组件，便于维护和更新。

### 2. CSS变量统一管理
所有颜色、间距、圆角、阴影等设计令牌统一定义在 `variables.css` 中：

```css
:root {
  --primary-color: #1E40AF;
  --radius-md: 12px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  /* ... 更多变量 */
}
```

### 3. 模块化加载
通过 `app.css` 作为入口文件，使用 `@import` 导入所有模块，确保加载顺序正确。

### 4. 响应式设计
所有模块都内置响应式断点，确保在不同设备上的良好体验。

### 5. BEM命名规范
遵循BEM（Block-Element-Modifier）命名规范，提高可读性：
- `.block-name` - 块
- `.block-name__element` - 元素
- `.block-name--modifier` - 修饰符

## 核心模块说明

### variables.css
定义了整个系统的设计令牌：
- **颜色系统**：主色、辅助色、状态色
- **间距系统**：统一的内外边距
- **圆角**：小、中、大、圆形
- **阴影**：不同层级的阴影效果
- **布局**：抽屉宽度、侧边栏宽度等
- **动画**：统一的过渡时长和缓动函数

### base.css
提供基础功能：
- 全局重置和布局
- 滚动条样式
- 工具类（hidden、glass-effect等）
- 动画关键帧（fadeIn、slideInUp、pulse）
- 拖拽调整区域样式
- 响应式断点

### components/
通用UI组件库：

#### buttons.css
- 基础按钮（.btn、.btn-primary、.btn-secondary）
- Dock按钮（.dock-btn）
- 标签页按钮（.tab-btn、.sidebar-tab）
- 特殊功能按钮（.knowledge-shortcut-btn）

#### cards.css
- 基础卡片（.card、.panel-card）
- 知识卡片（.knowledge-card）
- 统计卡片（.stat-tile）
- 质量评分卡片（.quality-score-card）
- 时间线卡片（.timeline-card）

#### forms.css
- 输入框（input、textarea）
- 聚焦状态
- 表单布局

#### badges.css
- 状态徽章（.status-badge、.status-pill）
- 情绪标签（.emotion-*、.urgency-*）
- 分析芯片（.analysis-chip、.chip-*）
- 知识标签（.knowledge-tag）

### modules/
功能模块样式：

#### navigation.css
- Dock导航栏（.dock-nav、.dock-submenu）
- 消息子tab（.message-subtabs）
- 右侧抽屉（.analysis-drawer）
- 客户行（.customer-row）

#### chat.css
- 对话列表（.conversation-list、.conversation-item）
- 聊天头部（.chat-header）
- 消息气泡（.message-bubble）
- 消息布局（.message-row）
- 聊天模式控制（.chat-mode-pill）
- Agent状态（.agent-status-pill）

#### knowledge.css
- 知识库表格（.knowledge-table、.knowledge-row）
- 知识应用（.knowledge-application）
- FAQ面板（#knowledge-faq-panel）
- 响应式布局

#### quality.css
- 质检面板（.qc-panel、.qc-lean-body）
- 质检头部和布局（.qc-header-grid、.qc-lean-grid）
- 质检芯片和卡片（.qc-chip、.qc-dim-card）
- 质检操作栏（.qc-action-bar）

#### analysis.css
- AI辅助面板（.ai-assistant-panel）
- AI面板组件（.ai-panel-card、.ai-panel-header）
- 工单项（.ticket-item）
- 历史记录（.history-timeline、.timeline-row）
- 任务工作区（.task-workspace）

## 使用指南

### 1. 引入样式

在HTML中只需引入一个文件：

```html
<link rel="stylesheet" href="assets/css/app.css">
```

或使用preload优化加载：

```html
<link rel="preload" href="assets/css/app.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

### 2. 使用CSS变量

在任何地方都可以使用定义的变量：

```css
.my-component {
  color: var(--primary-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
```

### 3. 新增组件

如需添加新组件：
1. 在 `components/` 或 `modules/` 中创建新文件
2. 在 `app.css` 中添加 `@import` 语句
3. 使用已定义的CSS变量保持风格一致

### 4. 修改设计令牌

所有设计令牌统一在 `variables.css` 中修改：
1. 修改变量值
2. 保存后自动应用到整个项目
3. 无需修改其他CSS文件

## 迁移说明

旧的4个CSS文件已迁移并整合：
- `main.css` → 拆分到多个模块
- `modern-ui.css` → 整合到 components 和 modules
- `unified-chat.css` → 整合到 modules/chat.css 和 modules/analysis.css
- `im-enhancements.css` → 整合到 components/badges.css 和 modules/chat.css

旧文件已备份到 `_legacy/` 目录，仅供参考，不再使用。

## 性能优化

1. **单一入口**：只需加载一个CSS文件，减少HTTP请求
2. **按需加载**：使用preload提升首屏性能
3. **模块化**：便于浏览器缓存和CDN分发
4. **变量优化**：使用CSS变量减少重复代码

## 维护建议

1. **保持一致性**：新增样式时优先使用CSS变量
2. **避免重复**：检查是否已有类似样式再新增
3. **模块职责**：样式放在正确的模块文件中
4. **注释清晰**：为复杂样式添加注释说明
5. **响应式优先**：考虑移动端体验

## 版本历史

### v2.0.0 (2026-01)
- 重构为模块化架构
- 统一CSS变量管理
- 优化性能和可维护性
- 消除样式冲突和重复

### v1.x (Legacy)
- 旧版多文件架构
- 已迁移到 _legacy/ 目录

## 相关文档

- [产品需求文档](../../docs/prd/)
- [UI设计规范](../../docs/prd/2-baseline/2-features/2.8-UI-Layout-PRD.md)
- [前端开发指南](../../docs/development/)

---

**维护者**: 售后工作台团队
**最后更新**: 2026-01-14
