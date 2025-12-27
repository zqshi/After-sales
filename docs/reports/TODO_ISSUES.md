# After-Sales 项目 TODO Issues 清单

**生成日期**: 2025-12-27
**总数**: 18个TODO
**分类**: 紧急(4个已修复)、Phase 2功能(10个)、长期优化(4个)

---

## ✅ 已修复的紧急TODO（4个）

| 序号 | 位置 | 说明 | 状态 |
|------|------|------|------|
| 1 | `ConversationTaskCoordinator.ts:467` | baseUrl硬编码问题 | ✅ 已修复 |
| 2 | `ConversationTaskCoordinator.ts:135` | 添加新消息到现有对话 | ✅ 已修复 |
| 3 | `ConversationTaskCoordinator.ts:323` | 更新Requirement的conversationId | ✅ 已修复 |
| 4 | `ConversationClosedEventHandler.js:44` | 质检任务模块 | ✅ 已修复 |

---

## 🔴 Phase 2功能（10个，中期1-2周完成）

### Issue 1: IM集成 - 对话关闭通知客户
- **位置**: `backend/src/application/event-handlers/ConversationReadyToCloseEventHandler.ts:74`
- **需求**: 对话准备关闭时，通过IM（飞书/企微/钉钉）通知客户
- **实现**:
  1. 设计IM集成接口（支持多平台适配）
  2. 实现飞书/企业微信/钉钉适配器
  3. 在对话关闭前推送通知
- **优先级**: MEDIUM
- **标签**: `Phase-2`, `IM-Integration`, `enhancement`

---

### Issue 2: 知识库沉淀 - 对话关闭后自动归档
- **位置**: `backend/src/application/event-handlers/ConversationReadyToCloseEventHandler.ts:77`
- **需求**: 对话关闭后，将有价值的对话内容沉淀到知识库
- **实现**:
  1. 分析对话质量（是否解决问题、是否包含通用知识）
  2. 调用LLM生成知识库条目（标题、内容、标签）
  3. 自动创建知识库记录
- **优先级**: MEDIUM
- **标签**: `Phase-2`, `knowledge-base`, `enhancement`

---

### Issue 3: 满意度调查 - 对话结束后发送
- **位置**: `backend/src/application/event-handlers/ConversationReadyToCloseEventHandler.ts:80`
- **需求**: 对话关闭后，向客户发送满意度调查问卷
- **实现**:
  1. 设计满意度调查模板（星级评分、文字反馈）
  2. 通过IM或邮件发送调查链接
  3. 收集并存储反馈数据
- **优先级**: MEDIUM
- **标签**: `Phase-2`, `feedback`, `enhancement`

---

### Issue 4: IM集成 - 创建对话（需求需要客户沟通时）
- **位置**: `backend/src/application/event-handlers/RequirementCreatedEventHandler.ts:60`
- **需求**: 当内部需求需要与客户沟通时，自动创建Conversation并通知客户
- **实现**:
  1. 判断需求是否需要客户参与
  2. 通过IM创建对话会话
  3. 将Requirement关联到Conversation
- **优先级**: MEDIUM
- **标签**: `Phase-2`, `IM-Integration`, `enhancement`

---

### Issue 5: LLM智能总结 - AI生成对话摘要
- **位置**: `backend/src/application/services/AiService.ts:173`
- **需求**: 调用LLM对对话进行智能总结（问题、解决方案、关键点）
- **实现**:
  1. 设计总结Prompt模板
  2. 调用DeepSeek/GPT-4生成总结
  3. 缓存总结结果，供知识库和报告使用
- **优先级**: MEDIUM
- **标签**: `Phase-2`, `AI`, `enhancement`

---

### Issue 6: LLM智能需求提取
- **位置**: `backend/src/application/services/ConversationTaskCoordinator.ts:367`
- **需求**: 使用LLM从客户消息中智能提取需求（替代当前的规则引擎）
- **实现**:
  1. 设计需求提取Prompt（Few-Shot示例）
  2. 返回结构化需求数据（title, category, priority, confidence）
  3. 置信度低于阈值时人工审核
- **优先级**: MEDIUM
- **标签**: `Phase-2`, `AI`, `requirement`, `enhancement`

---

### Issue 7: WebSocket推送 - 前端审核面板实时通知
- **位置**: `backend/src/application/services/ConversationTaskCoordinator.ts:564`
- **需求**: 通过WebSocket将Agent生成的回复推送到前端审核面板
- **实现**:
  1. 建立WebSocket连接管理器
  2. 定义审核事件协议
  3. 前端实现审核面板UI
- **优先级**: MEDIUM
- **标签**: `Phase-2`, `WebSocket`, `realtime`, `enhancement`

---

### Issue 8: EventBus事件发布 - 审核请求
- **位置**: `backend/src/application/services/ConversationTaskCoordinator.ts:567`
- **需求**: 或通过EventBus发布审核请求事件（作为WebSocket的备选方案）
- **实现**:
  1. 定义 `ReviewRequestedEvent`
  2. EventHandler订阅并处理审核请求
  3. 支持邮件/IM通知审核人员
- **优先级**: MEDIUM
- **标签**: `Phase-2`, `event-driven`, `enhancement`

---

### Issue 9: 告警通知 - SLA违规/高风险对话
- **位置**: `backend/src/application/services/ConversationTaskCoordinator.ts:625`
- **需求**: 当检测到SLA违规或高风险对话时，发送告警通知管理员
- **实现**:
  1. 定义告警规则（SLA超时、情绪负面、客户VIP）
  2. 集成飞书/邮件/短信通知
  3. 告警记录存储到日志
- **优先级**: MEDIUM
- **标签**: `Phase-2`, `monitoring`, `alert`, `enhancement`

---

### Issue 10: 日志服务 - SLA违规日志记录
- **位置**: `assets/js/application/eventHandlers/conversation/SLAViolatedEventHandler.js:32`
- **需求**: 实现结构化日志服务，记录SLA违规事件
- **实现**:
  1. 前端集成日志库（winston/pino）
  2. 定义日志级别和格式
  3. 支持远程日志上报（Sentry/LogStash）
- **优先级**: MEDIUM
- **标签**: `Phase-2`, `logging`, `enhancement`

---

## 🟢 长期优化（4个，持续改进）

### Issue 11: 服务支持 - 风险级别变化后的操作
- **位置**: `assets/js/application/eventHandlers/customer/RiskLevelChangedEventHandler.js:97`
- **需求**: 客户风险级别变化后，触发相应的业务操作
- **实现**:
  1. 定义风险级别对应的操作策略
  2. 高风险客户自动通知客服主管
  3. 中风险客户加入重点关注列表
- **优先级**: LOW
- **标签**: `long-term`, `risk-management`, `enhancement`

---

### Issue 12: Console.log替换为结构化日志
- **位置**: 后端54处 `console.log`
- **需求**: 将所有 `console.log` 替换为结构化日志 `logger.debug()`
- **实现**:
  1. 使用pino或winston建立日志系统
  2. 批量替换console.log
  3. 配置日志级别和输出格式
- **优先级**: LOW
- **标签**: `long-term`, `logging`, `refactor`

---

### Issue 13: 测试覆盖率提升
- **位置**: 项目整体
- **需求**: 配置vitest coverage UI，提升测试覆盖率到80%
- **实现**:
  1. 配置vitest coverage reporter
  2. 为关键模块补充单元测试
  3. 前端建立单元测试框架
- **优先级**: MEDIUM
- **标签**: `long-term`, `testing`, `quality`

---

### Issue 14: 前端API层统一（迁移到ApiClient）
- **位置**: `assets/js/api.js` vs `assets/js/infrastructure/api/ApiClient.js`
- **需求**: 统一前端API调用，迁移所有api.js引用到ApiClient
- **实现**: 见独立的迁移计划文档
- **优先级**: MEDIUM
- **标签**: `long-term`, `refactor`, `api`

---

## 📊 优先级统计

| 优先级 | 数量 | 百分比 |
|--------|------|--------|
| ✅ 已完成 | 4个 | 22% |
| MEDIUM（Phase 2） | 10个 | 56% |
| LOW（长期） | 4个 | 22% |

---

## 🎯 实施建议

### 第1周
- [ ] Issue 6: LLM智能需求提取（最有价值的AI功能）
- [ ] Issue 5: LLM智能总结
- [ ] Issue 7: WebSocket推送前端审核面板

### 第2周
- [ ] Issue 1: IM集成 - 通知客户
- [ ] Issue 4: IM集成 - 创建对话
- [ ] Issue 9: 告警通知管理员

### 第3周
- [ ] Issue 2: 知识库沉淀
- [ ] Issue 3: 满意度调查
- [ ] Issue 10: 日志服务

### 第4周
- [ ] Issue 13: 测试覆盖率提升
- [ ] Issue 14: 前端API迁移（见独立计划）

---

## 📝 如何批量创建Issues

### 方法1：GitHub Web UI
手动复制每个Issue的内容，在GitHub仓库创建

### 方法2：GitHub CLI（推荐）
```bash
# 安装gh命令
brew install gh  # macOS
# 或 sudo apt install gh  # Linux

# 认证
gh auth login

# 批量创建（使用脚本）
bash docs/reports/create-issues.sh
```

### 方法3：GitHub API
使用curl或脚本调用GitHub REST API批量创建

---

**生成工具**: Claude Code
**最后更新**: 2025-12-27
